from uuid import uuid4

from fastapi import APIRouter, Query, Request
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool
from starlette.responses import StreamingResponse

from app.core.security import limiter, scrub_pii
from app.models.schemas import (
    ProgramEligibility,
    StreamEventType,
    UserProfileInput,
)
from engine.audit_ledger import audit_ledger
from engine.eligibility_engine import eligibility_engine
from rag.retriever import retrieve_for_eligibility

router = APIRouter(prefix="/eligibility", tags=["eligibility"])


@router.post("")
@limiter.limit("20/minute")
async def analyze_eligibility(
    request: Request,
    profile: UserProfileInput,
) -> StreamingResponse:
    return await _stream_response(profile)


@router.get("/stream")
@limiter.limit("20/minute")
async def stream_eligibility(
    request: Request,
    query: str = Query(..., min_length=1),
    country: str = Query(..., pattern="^(india|usa)$"),
    session_id: str = Query(..., min_length=1),
) -> StreamingResponse:
    profile = UserProfileInput(
        natural_language_query=query,
        country=country,
        session_id=session_id,
    )
    return await _stream_response(profile)


async def _stream_response(profile: UserProfileInput) -> StreamingResponse:
    session_id = profile.session_id or str(uuid4())
    clean_query = scrub_pii(profile.natural_language_query)
    clean_profile = profile.model_copy(
        update={
            "natural_language_query": clean_query,
            "session_id": session_id,
        }
    )

    context_chunks, citations = await run_in_threadpool(
        retrieve_for_eligibility,
        clean_query,
        clean_profile.country,
    )
    for citation in citations:
        citation.session_id = session_id

    results: list[ProgramEligibility] = []

    async def event_generator():
        async for event in eligibility_engine.stream_analysis(
            profile=clean_profile,
            session_id=session_id,
            citations=citations,
            context_chunks=context_chunks,
        ):
            if event.event_type == StreamEventType.RESULT:
                results.append(ProgramEligibility.model_validate(event.data))
            yield f"data: {event.model_dump_json()}\n\n"

    async def save_audit_session() -> None:
        await audit_ledger.save_session(session_id, citations, results)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        background=BackgroundTask(save_audit_session),
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
