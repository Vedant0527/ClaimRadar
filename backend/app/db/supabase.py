from typing import Any

from starlette.concurrency import run_in_threadpool
from supabase import Client, create_client

from app.core.config import Settings, get_settings
from app.core.errors import missing_configuration_error


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
        def execute() -> dict[str, Any]:
            response = (
                self.client.table("intake_requests")
                .insert(payload)
                .execute()
            )
            return {"data": response.data}

        return await run_in_threadpool(execute)


supabase_repository = SupabaseRepository()
