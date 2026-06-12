from fastapi import APIRouter, HTTPException, Response, status

from app.models.schemas import AuditCitation
from engine.audit_ledger import audit_ledger

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("/{citation_id}", response_model=AuditCitation)
async def get_source(citation_id: str, response: Response) -> AuditCitation:
    citation = await audit_ledger.get_citation(citation_id)
    if citation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Citation not found.",
        )

    age_seconds = await audit_ledger.get_citation_age_seconds(citation_id)
    response.headers["X-Citation-Age"] = str(age_seconds)
    return citation


@router.get("/session/{session_id}", response_model=list[AuditCitation])
async def get_session_sources(session_id: str) -> list[AuditCitation]:
    return await audit_ledger.get_session_citations(session_id)
