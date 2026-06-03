from fastapi import APIRouter

from app.core.config import get_settings
from app.models.schemas import (
    IngestResponse,
    ServiceDocument,
    ServiceSearchRequest,
    ServiceSearchResponse,
)
from app.services.vector_store import service_vector_store

router = APIRouter(prefix="/services", tags=["services"])


@router.post("/ingest", response_model=IngestResponse)
async def ingest_services(services: list[ServiceDocument]) -> IngestResponse:
    indexed_count = await service_vector_store.add_services(services)
    return IngestResponse(
        indexed_count=indexed_count,
        index_path=str(get_settings().faiss_index_path),
    )


@router.post("/search", response_model=ServiceSearchResponse)
async def search_services(
    request: ServiceSearchRequest,
) -> ServiceSearchResponse:
    matches = await service_vector_store.search(
        request.query,
        request.limit,
        request.country,
    )
    return ServiceSearchResponse(query=request.query, matches=matches)
