from app.services.vector_store import FAISSVectorStore


def main() -> None:
    vector_store = FAISSVectorStore()
    stats = vector_store.ingest_program_files()
    print(
        "Ingestion complete: "
        f"{stats.documents_processed} text documents processed, "
        f"{stats.chunks_created} vector chunks created, "
        f"FAISS index saved to {stats.index_path}."
    )


if __name__ == "__main__":
    main()
