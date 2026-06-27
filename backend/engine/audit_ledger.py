from datetime import datetime, timezone
from typing import List, Optional

from starlette.concurrency import run_in_threadpool

from app.core.config import Settings, get_settings
from app.db.supabase import supabase_repository
from app.models.schemas import AuditCitation, ProgramEligibility


class AuditLedger:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def save_session(
        self,
        session_id: str,
        citations: List[AuditCitation],
        results: List[ProgramEligibility],
    ) -> None:
        await supabase_repository.save_session_audit(
            session_id=session_id,
            citations=citations,
            results=results,
        )

    async def get_citation(self, citation_id: str) -> Optional[AuditCitation]:
        if not self.settings.supabase_url or not self.settings.supabase_anon_key:
            return None

        def execute() -> Optional[AuditCitation]:
            response = (
                supabase_repository.client.table("audit_sessions")
                .select("citations")
                .limit(1000)
                .execute()
            )
            for row in response.data or []:
                for citation in row.get("citations") or []:
                    if citation.get("citation_id") == citation_id:
                        return AuditCitation.model_validate(citation)
            return None

        return await run_in_threadpool(execute)

    async def get_citation_age_seconds(self, citation_id: str) -> int:
        if not self.settings.supabase_url or not self.settings.supabase_anon_key:
            return 0

        def execute() -> int:
            response = (
                supabase_repository.client.table("audit_sessions")
                .select("citations, created_at")
                .limit(1000)
                .execute()
            )
            for row in response.data or []:
                for citation in row.get("citations") or []:
                    if citation.get("citation_id") == citation_id:
                        created_at = self._parse_created_at(row.get("created_at"))
                        if created_at is None:
                            return 0
                        return max(
                            0,
                            int(
                                (
                                    datetime.now(timezone.utc) - created_at
                                ).total_seconds()
                            ),
                        )
            return 0

        return await run_in_threadpool(execute)

    async def get_session_citations(
        self,
        session_id: str,
    ) -> List[AuditCitation]:
        if not self.settings.supabase_url or not self.settings.supabase_anon_key:
            return []

        def execute() -> List[AuditCitation]:
            response = (
                supabase_repository.client.table("audit_sessions")
                .select("citations")
                .eq("session_id", session_id)
                .execute()
            )
            citations: list[AuditCitation] = []
            for row in response.data or []:
                citations.extend(
                    AuditCitation.model_validate(citation)
                    for citation in row.get("citations") or []
                )
            return sorted(
                citations,
                key=lambda citation: citation.retrieval_score,
                reverse=True,
            )

        return await run_in_threadpool(execute)

    def _parse_created_at(self, value: str | None) -> datetime | None:
        if not value:
            return None

        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)


audit_ledger = AuditLedger()
