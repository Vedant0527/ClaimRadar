from typing import Any

from starlette.concurrency import run_in_threadpool
from supabase import Client, create_client

from app.core.config import Settings, get_settings
from app.core.errors import missing_configuration_error
from app.models.schemas import AuditCitation, ProgramEligibility


class SupabaseRepository:
    """Async facade for the synchronous Supabase Python client."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client: Client | None = None

    @property
    def client(self) -> Client:
        if not self.settings.supabase_url:
            raise missing_configuration_error("SUPABASE_URL")
        if not self.settings.supabase_anon_key:
            raise missing_configuration_error("SUPABASE_ANON_KEY")

        if self._client is None:
            self._client = create_client(
                self.settings.supabase_url,
                self.settings.supabase_anon_key,
            )
        return self._client

    async def insert_intake(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.settings.supabase_url or not self.settings.supabase_anon_key:
            print("Supabase credentials missing. Skipping insert_intake.")
            return {"data": []}

        def execute() -> dict[str, Any]:
            response = (
                self.client.table("intake_requests")
                .insert(payload)
                .execute()
            )
            return {"data": response.data}

        return await run_in_threadpool(execute)

    async def save_session_audit(
        self,
        session_id: str,
        citations: list[AuditCitation],
        results: list[ProgramEligibility],
        country: str | None = None,
        total_unclaimed_usd: float | None = None,
    ) -> None:
        if not self.settings.supabase_url or not self.settings.supabase_anon_key:
            print("Supabase credentials missing. Skipping save_session_audit.")
            return

        payload = {
            "session_id": session_id,
            "country": country or self._infer_country(citations),
            "programs_analyzed": len(results),
            "programs_eligible": sum(1 for result in results if result.eligible),
            "citations": [
                citation.model_dump(mode="json") for citation in citations
            ],
            "results": [result.model_dump(mode="json") for result in results],
            "total_unclaimed_usd": (
                total_unclaimed_usd
                if total_unclaimed_usd is not None
                else self._estimate_total_unclaimed(results)
            ),
        }

        def execute() -> None:
            self.client.table("audit_sessions").insert(payload).execute()

        await run_in_threadpool(execute)

    def _infer_country(self, citations: list[AuditCitation]) -> str:
        for citation in citations:
            source = citation.source_document.lower()
            if "/india/" in source or source.startswith("india/"):
                return "india"
            if "/usa/" in source or source.startswith("usa/"):
                return "usa"
        return "unknown"

    def _estimate_total_unclaimed(
        self,
        results: list[ProgramEligibility],
    ) -> float:
        return sum(
            result.monthly_value_usd or 0.0
            for result in results
            if result.eligible
        )


supabase_repository = SupabaseRepository()
