import json
import re
from datetime import date, datetime, timezone
from typing import AsyncGenerator, List

from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import Settings, get_settings
from app.core.errors import missing_configuration_error
from app.models.schemas import (
    AuditCitation,
    ProgramEligibility,
    StreamEvent,
    StreamEventType,
    UserProfileInput,
)
from engine.unclaimed_clock import unclaimed_clock


SYSTEM_PROMPT = """You are FormZero's eligibility analyst. You help citizens discover 
government benefits they may be entitled to but haven't claimed.

RULES:
- Only make claims that are directly supported by the provided context documents.
- For every eligibility determination, cite the specific chunk_id(s) that support it.
- If context is insufficient to determine eligibility, say "INSUFFICIENT_DATA" 
   and explain what information is missing.
- Never fabricate benefit amounts, income thresholds, or eligibility rules.
- Format final results as JSON inside <RESULTS></RESULTS> tags.
- Think step by step before concluding.

OUTPUT FORMAT for <RESULTS> block:
{
  "programs": [
    {
      "program_id": "string",
      "program_name": "string", 
      "eligible": true/false,
      "confidence_score": 0.0-1.0,
      "reasoning_summary": "2-3 sentences",
      "citation_ids": ["uuid1", "uuid2"],
      "monthly_value_usd": number_or_null
    }
  ]
}"""


class EligibilityEngine:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._model: ChatGoogleGenerativeAI | None = None

    @property
    def model(self) -> ChatGoogleGenerativeAI:
        if not self.settings.gemini_api_key:
            raise missing_configuration_error("GEMINI_API_KEY")

        if self._model is None:
            self._model = ChatGoogleGenerativeAI(
                model="gemini-2.5-pro",
                google_api_key=self.settings.gemini_api_key,
                streaming=True,
                temperature=0.1,
            )
        return self._model

    async def stream_analysis(
        self,
        profile: UserProfileInput,
        session_id: str,
        citations: List[AuditCitation],
        context_chunks: List[Document],
    ) -> AsyncGenerator[StreamEvent, None]:
        sequence = 0
        full_response = ""
        citation_by_id = {citation.citation_id: citation for citation in citations}

        prompt = self._build_user_prompt(profile, citations, context_chunks)
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ]

        async for chunk in self.model.astream(messages):
            token = self._chunk_to_text(chunk)
            if not token:
                continue

            full_response += token
            yield self._event(
                event_type=StreamEventType.THINKING,
                data={"token": token},
                sequence=sequence,
            )
            sequence += 1

        for citation in citations:
            yield self._event(
                event_type=StreamEventType.CITATION,
                data={
                    "citation_id": citation.citation_id,
                    "program_id": citation.program_id,
                    "chunk_preview": citation.chunk_text[:150],
                    "source_document": citation.source_document,
                    "retrieval_score": citation.retrieval_score,
                },
                sequence=sequence,
            )
            sequence += 1

        results, parse_error = self._parse_results(full_response, citation_by_id)
        for result in results:
            yield self._event(
                event_type=StreamEventType.RESULT,
                data=result.model_dump(mode="json"),
                sequence=sequence,
            )
            sequence += 1

        eligible_program_ids = [
            result.program_id for result in results if result.eligible
        ]
        clock = unclaimed_clock.calculate(
            profile_id=session_id,
            eligible_program_ids=eligible_program_ids,
            eligibility_start_date=date(2023, 1, 1),
        )
        clock_data = clock.model_dump(mode="json")
        if parse_error is not None:
            clock_data["results_parse_error"] = parse_error

        yield self._event(
            event_type=StreamEventType.CLOCK,
            data=clock_data,
            sequence=sequence,
        )
        sequence += 1

        yield self._event(
            event_type=StreamEventType.DONE,
            data={
                "session_id": session_id,
                "results_count": len(results),
                "citation_count": len(citations),
                "parse_error": parse_error,
            },
            sequence=sequence,
        )

    def _build_user_prompt(
        self,
        profile: UserProfileInput,
        citations: List[AuditCitation],
        context_chunks: List[Document],
    ) -> str:
        context = self._format_context(citations, context_chunks)
        return (
            "USER CONTEXT (retrieved documents):\n"
            f"{context}\n\n"
            "USER PROFILE:\n"
            f"{profile.natural_language_query}\n\n"
            "Analyze eligibility for ALL programs whose context appears above.\n"
            "Stream your thinking first, then provide the structured "
            "<RESULTS> block."
        )

    def _format_context(
        self,
        citations: List[AuditCitation],
        context_chunks: List[Document],
    ) -> str:
        lines: list[str] = []
        for index, citation in enumerate(citations):
            document = context_chunks[index] if index < len(context_chunks) else None
            chunk_text = (
                document.page_content
                if document is not None
                else citation.chunk_text
            )
            lines.append(
                "\n".join(
                    [
                        f"chunk_id: {citation.citation_id}",
                        f"program_id: {citation.program_id}",
                        f"source_document: {citation.source_document}",
                        f"retrieval_score: {citation.retrieval_score}",
                        f"chunk_text: {chunk_text}",
                    ]
                )
            )
        return "\n\n---\n\n".join(lines)

    def _parse_results(
        self,
        full_response: str,
        citation_by_id: dict[str, AuditCitation],
    ) -> tuple[list[ProgramEligibility], str | None]:
        match = re.search(
            r"<RESULTS>\s*(\{.*?\})\s*</RESULTS>",
            full_response,
            flags=re.DOTALL,
        )
        if match is None:
            return [], "Missing <RESULTS> block."

        raw_json = match.group(1)
        try:
            parsed = json.loads(raw_json)
        except json.JSONDecodeError as exc:
            repaired = self._repair_json(raw_json)
            try:
                parsed = json.loads(repaired)
            except json.JSONDecodeError:
                return [], f"Invalid RESULTS JSON: {exc.msg}"

        programs = parsed.get("programs")
        if not isinstance(programs, list):
            return [], "RESULTS JSON missing programs list."

        results: list[ProgramEligibility] = []
        for item in programs:
            if not isinstance(item, dict):
                continue

            known_citations = [
                citation_id
                for citation_id in item.get("citation_ids", [])
                if citation_id in citation_by_id
            ]
            item["citation_ids"] = known_citations
            try:
                results.append(ProgramEligibility.model_validate(item))
            except Exception:
                continue

        return results, None

    def _repair_json(self, raw_json: str) -> str:
        without_trailing_commas = re.sub(r",\s*([}\]])", r"\1", raw_json)
        return without_trailing_commas.strip()

    def _chunk_to_text(self, chunk) -> str:
        content = getattr(chunk, "content", "")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return "".join(
                part.get("text", "") if isinstance(part, dict) else str(part)
                for part in content
            )
        return str(content)

    def _event(
        self,
        event_type: StreamEventType,
        data: dict,
        sequence: int,
    ) -> StreamEvent:
        return StreamEvent(
            event_type=event_type,
            data=data,
            sequence=sequence,
            timestamp=datetime.now(timezone.utc),
        )


eligibility_engine = EligibilityEngine()
