from datetime import date, datetime
from enum import StrEnum
from typing import Any, Literal, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class UserProfileInput(BaseModel):
    natural_language_query: str
    country: Literal["india", "usa"]
    session_id: Optional[str] = None


class EstimateRequest(BaseModel):
    country: str
    profile_description: str


class EstimateResponse(BaseModel):
    estimated_start_date: date
    confidence: str
    reasoning: str


class StreamEventType(StrEnum):
    THINKING = "thinking"
    CITATION = "citation"
    RESULT = "result"
    CLOCK = "clock"
    DONE = "done"


class StreamEvent(BaseModel):
    event_type: StreamEventType
    data: dict
    sequence: int
    timestamp: datetime


class ProgramEligibility(BaseModel):
    program_id: str
    program_name: str
    eligible: bool
    confidence_score: float
    reasoning_summary: str
    citation_ids: list[str]
    monthly_value_usd: Optional[float] = None


class AuditCitation(BaseModel):
    citation_id: str
    session_id: str
    program_id: str
    chunk_text: str
    source_document: str
    retrieval_score: float


class UnclaimedProgramBreakdown(BaseModel):
    program_id: str
    monthly_value_usd: float
    months_unclaimed: int
    total_unclaimed_usd: float
    non_monetary: bool = False


class UnclaimedCalculation(BaseModel):
    profile_id: str
    eligibility_start_date: date
    months_unclaimed: int
    total_unclaimed_usd: float
    per_second_loss: float
    breakdown: list[UnclaimedProgramBreakdown]


class CitizenProfile(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=120)
    date_of_birth: date | None = None
    zip_code: str = Field(..., min_length=5, max_length=10)
    state: str | None = Field(default=None, min_length=2, max_length=40)
    household_income: float | None = Field(default=None, ge=0)
    household_size: int | None = Field(default=None, ge=1, le=30)
    employment_status: str | None = None
    disability_status: bool | None = None
    veteran_status: bool | None = None
    student_status: bool | None = None
    immigration_status: str | None = None
    needs: list[str] = Field(default_factory=list)
    notes: str | None = Field(default=None, max_length=2000)


class IntakeRequest(BaseModel):
    request_id: UUID = Field(default_factory=uuid4)
    profile: CitizenProfile
    consent_to_store: bool = False


class ServiceDocument(BaseModel):
    service_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    jurisdiction: str | None = None
    description: str = Field(..., min_length=1)
    eligibility_rules: list[str] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    application_url: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ServiceMatch(BaseModel):
    service_id: str
    title: str
    jurisdiction: str | None = None
    score: float | None = None
    reason: str
    required_documents: list[str] = Field(default_factory=list)
    application_url: str | None = None


class IntakeResponse(BaseModel):
    request_id: UUID
    summary: str
    matches: list[ServiceMatch]
    next_steps: list[str]


class ServiceSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    limit: int = Field(default=5, ge=1, le=20)
    country: Literal["india", "usa"] | None = None


class ServiceSearchResponse(BaseModel):
    query: str
    matches: list[ServiceMatch]


class IngestResponse(BaseModel):
    indexed_count: int
    index_path: str


class HealthResponse(BaseModel):
    status: str
    app: str
    environment: str
