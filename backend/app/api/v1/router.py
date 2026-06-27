from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.intake import router as intake_router
from app.api.v1.eligibility import router as eligibility_router
from app.api.v1.services import router as services_router
from app.api.v1.sources import router as sources_router
from app.api.v1.unclaimed import router as unclaimed_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(health_router)
api_router.include_router(intake_router)
api_router.include_router(services_router)
api_router.include_router(eligibility_router)
api_router.include_router(sources_router)
api_router.include_router(unclaimed_router)
