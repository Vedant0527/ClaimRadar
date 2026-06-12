from pathlib import Path
from typing import List, Tuple
from uuid import uuid4

from langchain_core.documents import Document

from app.core.config import get_settings
from app.models.schemas import AuditCitation
from rag.vector_store import FAISSVectorStore

_vector_store: FAISSVectorStore | None = None


def retrieve_for_eligibility(
    query: str,
    country: str,
    top_k: int = 8,
) -> Tuple[List[Document], List[AuditCitation]]:
    global _vector_store

    settings = get_settings()
    if _vector_store is None:
        _vector_store = FAISSVectorStore()
        _vector_store.load(str(Path(settings.faiss_index_path)))

    results = _vector_store.similarity_search_with_score(
        query,
        k=top_k,
        filter_country=country,
    )

    session_id = str(uuid4())
    documents: list[Document] = []
    citations: list[AuditCitation] = []
    for document, score in results:
        documents.append(document)
        citations.append(
            AuditCitation(
                citation_id=str(uuid4()),
                session_id=session_id,
                program_id=str(document.metadata.get("program_id", "")),
                chunk_text=document.page_content,
                source_document=str(document.metadata.get("source_file", "")),
                retrieval_score=score,
            )
        )

    return documents, citations
