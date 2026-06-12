import argparse
from pathlib import Path
from typing import List

from langchain_core.documents import Document

from app.core.config import get_settings
from rag.vector_store import FAISSVectorStore


def load_program_documents(programs_root: Path) -> List[Document]:
    documents: list[Document] = []
    for file_path in sorted(programs_root.glob("*/*.txt")):
        text = file_path.read_text(encoding="utf-8").strip()
        if not text:
            continue

        documents.append(
            Document(
                page_content=text,
                metadata={
                    "program_id": file_path.stem,
                    "country": file_path.parent.name,
                    "source_file": str(file_path),
                },
            )
        )
    return documents


def index_exists(path: Path) -> bool:
    return (path / "index.faiss").exists() and (path / "index.pkl").exists()


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local FAISS RAG index.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Rebuild index even when saved FAISS files already exist.",
    )
    args = parser.parse_args()

    settings = get_settings()
    backend_root = Path(__file__).resolve().parents[1]
    programs_root = backend_root / "data" / "programs"
    index_path = Path(settings.faiss_index_path)

    if index_exists(index_path) and not args.force:
        print(
            "Ingestion skipped: existing index found at "
            f"{index_path}. Pass --force to rebuild."
        )
        return

    documents = load_program_documents(programs_root)
    vector_store = FAISSVectorStore()
    vector_store.build_from_documents(documents)
    vector_store.save(str(index_path))

    print(
        "Ingestion complete: "
        f"files processed={len(documents)}, "
        f"chunks created={vector_store.chunks_created}, "
        f"index size={vector_store.index_size()}, "
        f"saved to={index_path}."
    )


if __name__ == "__main__":
    main()
