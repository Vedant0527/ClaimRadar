from fastapi import APIRouter, BackgroundTasks

from app.db.supabase import supabase_repository
from app.models.schemas import IntakeRequest, IntakeResponse
from app.services.ai import gemini_service
from app.services.vector_store import service_vector_store

router = APIRouter(prefix="/intake", tags=["intake"])


@router.post("/analyze", response_model=IntakeResponse)
async def analyze_intake(
    request: IntakeRequest,
    background_tasks: BackgroundTasks,
) -> IntakeResponse:
    query = _profile_to_query(request)
    matches = await service_vector_store.search(query, limit=5)
    summary = await gemini_service.summarize_intake(request.profile, matches)

    response = IntakeResponse(
        request_id=request.request_id,
        summary=summary,
        matches=matches,
        next_steps=[
            "Review the matched services and required documents.",
            "Confirm eligibility with the official agency before applying.",
            "Submit applications through the listed public-service portals.",
        ],
    )

    if request.consent_to_store:
        background_tasks.add_task(
            supabase_repository.insert_intake,
            {
                "request_id": str(request.request_id),
                "profile": request.profile.model_dump(mode="json"),
                "response": response.model_dump(mode="json"),
            },
        )

    return response


def _profile_to_query(request: IntakeRequest) -> str:
    profile = request.profile
    parts = [
        f"ZIP {profile.zip_code}",
        profile.state or "",
        profile.employment_status or "",
        "disabled" if profile.disability_status else "",
        "veteran" if profile.veteran_status else "",
        "student" if profile.student_status else "",
        profile.immigration_status or "",
        " ".join(profile.needs),
        profile.notes or "",
    ]
    return " ".join(part for part in parts if part).strip()
