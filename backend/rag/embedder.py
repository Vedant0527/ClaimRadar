import time
from typing import List

from langchain_core.embeddings import Embeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import get_settings


class GoogleEmbedder(Embeddings):
    """Google embedding wrapper with small sync retry policy."""

    def __init__(self, max_retries: int = 3, base_delay_seconds: int = 2) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is required for embeddings.")

        self.max_retries = max_retries
        self.base_delay_seconds = base_delay_seconds
        self.client = GoogleGenerativeAIEmbeddings(
            model="gemini-embedding-001",  # <-- The current, stable model identifier
            google_api_key=settings.gemini_api_key,
        )

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._with_retry(lambda: self.client.embed_documents(texts))

    def embed_query(self, text: str) -> List[float]:
        return self._with_retry(lambda: self.client.embed_query(text))

    def _with_retry(self, fn):
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                return fn()
            except Exception as exc:
                last_error = exc
                if attempt == self.max_retries:
                    break
                time.sleep(self.base_delay_seconds * (2**attempt))

        raise last_error