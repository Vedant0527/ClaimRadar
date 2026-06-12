from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Literal

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from starlette.concurrency import run_in_threadpool

from app.core.config import Settings, get_settings
from app.models.schemas import ServiceDocument, ServiceMatch
from app.services.ai import embedding_service

Country = Literal["india", "usa"]


@dataclass(frozen=True)
class IngestionStats:
    documents_processed: int
    chunks_created: int
    index_path: str


class FAISSVectorStore:
    """Local FAISS-backed RAG manager for public-benefit program files."""

    def __init__(
        self,
        settings: Settings | None = None,
        programs_root: Path | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.programs_root = programs_root or Path("data/programs")
        self._index: FAISS | None = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=600,
            chunk_overlap=80,
        )

    @property
    def index_path(self) -> Path:
        return self.settings.faiss_index_path

    @property
    def embeddings(self):
        return embedding_service.embeddings

    def ingest_program_files(self) -> IngestionStats:
        source_documents = self._load_program_documents()
        chunks = self.text_splitter.split_documents(source_documents)

        if chunks:
            index = FAISS.from_documents(chunks, self.embeddings)
            self.index_path.mkdir(parents=True, exist_ok=True)
            index.save_local(str(self.index_path))
            self._index = index

        return IngestionStats(
            documents_processed=len(source_documents),
            chunks_created=len(chunks),
            index_path=str(self.index_path),
        )

    async def ingest_program_files_async(self) -> IngestionStats:
        return await run_in_threadpool(self.ingest_program_files)

    async def add_services(self, services: Iterable[ServiceDocument]) -> int:
        documents = [self._service_to_document(service) for service in services]
        if not documents:
            return 0

        chunks = self.text_splitter.split_documents(documents)
        if not chunks:
            return 0

        def add_and_save() -> int:
            index = self._load_index()
            if index is None:
                index = FAISS.from_documents(chunks, self.embeddings)
            else:
                index.add_documents(chunks)

            self.index_path.mkdir(parents=True, exist_ok=True)
            index.save_local(str(self.index_path))
            self._index = index
            return len(chunks)

        return await run_in_threadpool(add_and_save)

    async def search(
        self,
        query: str,
        limit: int = 5,
        country: Country | None = None,
    ) -> list[ServiceMatch]:
        return await run_in_threadpool(self.search_sync, query, limit, country)

    def search_sync(
        self,
        query: str,
        limit: int = 5,
        country: Country | None = None,
    ) -> list[ServiceMatch]:
        index = self._load_index()
        if index is None:
            return []

        if country is None:
            documents = index.max_marginal_relevance_search(
                query,
                k=limit,
                fetch_k=max(limit * 4, 20),
            )
            return [
                self._document_to_match(document, score=None)
                for document in documents
            ]

        # High-top-k search lets us filter by country metadata without relying
        # on version-specific FAISS metadata filter behavior.
        results = index.similarity_search_with_score(
            query,
            k=max(limit * 8, 40),
        )
        filtered = [
            (document, float(score))
            for document, score in results
            if document.metadata.get("country") == country
        ]
        return [
            self._document_to_match(document, score=score)
            for document, score in filtered[:limit]
        ]

    def _load_index(self) -> FAISS | None:
        if self._index is not None:
            return self._index

        if not self.index_path.exists():
            return None

        self._index = FAISS.load_local(
            str(self.index_path),
            self.embeddings,
            allow_dangerous_deserialization=True,
        )
        return self._index

    def _load_program_documents(self) -> list[Document]:
        documents: list[Document] = []
        for file_path in sorted(self.programs_root.glob("*/*.txt")):
            country = file_path.parent.name
            program_id = file_path.stem
            text = file_path.read_text(encoding="utf-8").strip()
            if not text:
                continue

            metadata = {
                "country": country,
                "program_id": program_id,
                "title": self._extract_program_name(text, program_id),
                "source_document": str(file_path),
            }
            documents.append(Document(page_content=text, metadata=metadata))
        return documents

    def _service_to_document(self, service: ServiceDocument) -> Document:
        body = "\n".join(
            [
                service.title,
                service.description,
                "Eligibility: " + "; ".join(service.eligibility_rules),
                "Required documents: " + "; ".join(service.required_documents),
            ]
        )
        metadata = {
            "program_id": service.service_id,
            "service_id": service.service_id,
            "title": service.title,
            "country": service.metadata.get("country"),
            "jurisdiction": service.jurisdiction,
            "required_documents": service.required_documents,
            "application_url": service.application_url,
            "source_document": service.metadata.get("source_document", "api"),
            **service.metadata,
        }
        return Document(page_content=body, metadata=metadata)

    def _document_to_match(
        self,
        document: Document,
        score: float | None,
    ) -> ServiceMatch:
        metadata = document.metadata
        program_id = str(
            metadata.get("program_id")
            or metadata.get("service_id")
            or ""
        )
        return ServiceMatch(
            service_id=program_id,
            title=str(metadata.get("title", "Public service program")),
            jurisdiction=metadata.get("country") or metadata.get("jurisdiction"),
            score=score,
            reason=document.page_content,
            required_documents=list(metadata.get("required_documents") or []),
            application_url=metadata.get("application_url"),
        )

    def _extract_program_name(self, text: str, fallback: str) -> str:
        for line in text.splitlines():
            stripped = line.strip()
            if stripped.lower().startswith("program name:"):
                return stripped.split(":", 1)[1].strip()
        return fallback.replace("_", " ").title()


service_vector_store = FAISSVectorStore()

# Backwards-compatible alias for earlier API code and imports.
ServiceVectorStore = FAISSVectorStore
