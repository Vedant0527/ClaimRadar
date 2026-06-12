import json
import re
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, Response, status
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import get_settings
from app.core.errors import missing_configuration_error
from app.models.schemas import (
    EstimateRequest,
    EstimateResponse,
    UnclaimedCalculation,
)
from engine.unclaimed_clock import UnclaimedClock

router = APIRouter(prefix="/unclaimed", tags=["unclaimed"])


@router.get("/{profile_id}", response_model=UnclaimedCalculation)
async def get_unclaimed_value(
    profile_id: str,
    response: Response,
    programs: str = Query(..., min_length=1),
    start_date: date = Query(...),
) -> UnclaimedCalculation:
    ten_years_ago = _years_ago(date.today(), 10)
    if start_date < ten_years_ago:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date cannot be more than 10 years in the past.",
        )

    program_ids = [
        program.strip() for program in programs.split(",") if program.strip()
    ]
    response.headers["X-Calculation-Timestamp"] = datetime.now(
        timezone.utc
    ).isoformat()
    return UnclaimedClock().calculate(profile_id, program_ids, start_date)


@router.post("/estimate", response_model=EstimateResponse)
async def estimate_start_date(request: EstimateRequest) -> EstimateResponse:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise missing_configuration_error("GEMINI_API_KEY")

    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-pro",
        google_api_key=settings.gemini_api_key,
        temperature=0.1,
    )
    prompt = (
        "Estimate when this user likely became eligible for public benefits. "
        "Return only JSON with keys estimated_start_date, confidence, reasoning. "
        "confidence must be high, medium, or low. Use ISO date YYYY-MM-DD. "
        "If uncertain, choose low confidence and today's date.\n\n"
        f"Country: {request.country}\n"
        f"Profile: {request.profile_description}"
    )
    message = await model.ainvoke([HumanMessage(content=prompt)])
    return _parse_estimate_response(str(message.content))


def _parse_estimate_response(content: str) -> EstimateResponse:
    raw_json = _extract_json(content)
    if raw_json is None:
        return EstimateResponse(
            estimated_start_date=date.today(),
            confidence="low",
            reasoning="Model did not return parseable JSON.",
        )

    try:
        parsed = json.loads(raw_json)
        confidence = str(parsed.get("confidence", "low")).lower()
        if confidence not in {"high", "medium", "low"}:
            confidence = "low"
        return EstimateResponse(
            estimated_start_date=date.fromisoformat(
                str(parsed["estimated_start_date"])
            ),
            confidence=confidence,
            reasoning=str(parsed.get("reasoning", "")),
        )
    except Exception:
        return EstimateResponse(
            estimated_start_date=date.today(),
            confidence="low",
            reasoning="Model estimate could not be parsed safely.",
        )


def _extract_json(content: str) -> str | None:
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
    if fenced is not None:
        return fenced.group(1)

    plain = re.search(r"\{.*\}", content, re.DOTALL)
    if plain is not None:
        return plain.group(0)
    return None


def _years_ago(value: date, years: int) -> date:
    try:
        return value.replace(year=value.year - years)
    except ValueError:
        return value.replace(month=2, day=28, year=value.year - years)
