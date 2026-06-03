from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.intake import router as intake_router
from app.api.v1.services import router as services_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(intake_router)
api_router.include_router(services_router)
