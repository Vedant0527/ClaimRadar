from fastapi import APIRouter, Depends, Request

from app.core.config import Settings, get_settings
from app.models.schemas import HealthResponse

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthResponse)
async def health(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> HealthResponse:
    return HealthResponse(
        status="ok",
        index_loaded=bool(getattr(request.app.state, "faiss_index_loaded", False)),
        index_size=int(getattr(request.app.state, "faiss_index_size", 0)),
        environment=settings.environment,
    )
