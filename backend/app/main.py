from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.middleware import SecurityLoggingMiddleware
from app.core.security import limiter
from rag.retriever import set_vector_store
from rag.vector_store import FAISSVectorStore

load_dotenv()
logger = logging.getLogger("formzero.startup")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    app.state.faiss_index_loaded = False
    app.state.faiss_index_size = 0
    app.state.faiss_vector_store = None

    try:
        vector_store = FAISSVectorStore()
        vector_store.load(str(settings.faiss_index_path))
        set_vector_store(vector_store)
        app.state.faiss_vector_store = vector_store
        app.state.faiss_index_loaded = vector_store.is_loaded()
        app.state.faiss_index_size = vector_store.index_size()
        logger.info(
            "FormZero API ready. Index loaded: %s vectors.",
            app.state.faiss_index_size,
        )
    except Exception as exc:
        logger.warning("FAISS index not loaded during startup: %s", exc)

    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "https://*.vercel.app"],
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SecurityLoggingMiddleware)

    app.state.limiter = limiter
    app.add_exception_handler(
        RateLimitExceeded,
        _rate_limit_exceeded_handler,
    )

    app.include_router(api_router, prefix=settings.api_prefix)

    @app.get("/")
    def read_root():
        return {
            "status": "healthy",
            "service": settings.app_name,
            "message": "FormZero API is running successfully."
        }

    return app


app = create_app()