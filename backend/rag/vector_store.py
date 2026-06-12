from pathlib import Path
from typing import List, Optional, Tuple

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from rag.embedder import GoogleEmbedder


class FAISSVectorStore:
    def __init__(self, embedder: GoogleEmbedder | None = None) -> None:
        self.embedder = embedder or GoogleEmbedder()
        self.index: FAISS | None = None
        self.chunks_created = 0
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=600,
            chunk_overlap=80,
        )

    def build_from_documents(self, documents: List[Document]) -> None:
        chunks: list[Document] = []
        for document in documents:
            split_docs = self.text_splitter.split_documents([document])
            for chunk_index, chunk in enumerate(split_docs):
                chunk.metadata = {
                    **chunk.metadata,
                    "program_id": chunk.metadata.get("program_id"),
                    "source_file": chunk.metadata.get("source_file"),
                    "country": chunk.metadata.get("country"),
                    "chunk_index": chunk_index,
                }
                chunks.append(chunk)

        self.chunks_created = len(chunks)
        if not chunks:
            raise ValueError("No chunks created from documents.")

        self.index = FAISS.from_documents(chunks, self.embedder)

    def save(self, path: str) -> None:
        if self.index is None:
            raise RuntimeError("Cannot save FAISS index before build/load.")

        Path(path).mkdir(parents=True, exist_ok=True)
        self.index.save_local(path)

    def load(self, path: str) -> None:
        self.index = FAISS.load_local(
            path,
            self.embedder,
            allow_dangerous_deserialization=True,
        )

    def similarity_search_with_score(
        self,
        query: str,
        k: int = 5,
        filter_country: Optional[str] = None,
    ) -> List[Tuple[Document, float]]:
        if self.index is None:
            raise RuntimeError("FAISS index is not loaded.")

        fetch_k = max(k * 8, 40)
        candidates = self.index.similarity_search_with_score(query, k=fetch_k)
        filtered_candidates = [
            (document, self._normalize_score(score))
            for document, score in candidates
            if filter_country is None
            or document.metadata.get("country") == filter_country
        ]

        mmr_docs = self.index.max_marginal_relevance_search(
            query,
            k=fetch_k,
            fetch_k=fetch_k,
        )
        score_by_key = {
            self._doc_key(document): score
            for document, score in filtered_candidates
        }

        selected: list[tuple[Document, float]] = []
        seen: set[tuple[str, int]] = set()
        for document in mmr_docs:
            if (
                filter_country is not None
                and document.metadata.get("country") != filter_country
            ):
                continue
            key = self._doc_key(document)
            if key in seen:
                continue
            seen.add(key)
            selected.append((document, score_by_key.get(key, 0.0)))
            if len(selected) == k:
                break

        if len(selected) < k:
            for document, score in filtered_candidates:
                key = self._doc_key(document)
                if key in seen:
                    continue
                seen.add(key)
                selected.append((document, score))
                if len(selected) == k:
                    break

        return sorted(selected, key=lambda item: item[1], reverse=True)

    def is_loaded(self) -> bool:
        return self.index is not None

    def index_size(self) -> int:
        if self.index is None:
            return 0
        return int(self.index.index.ntotal)

    def _normalize_score(self, score: float) -> float:
        return 1.0 / (1.0 + float(score))

    def _doc_key(self, document: Document) -> tuple[str, int]:
        return (
            str(document.metadata.get("source_file", "")),
            int(document.metadata.get("chunk_index", -1)),
        )
