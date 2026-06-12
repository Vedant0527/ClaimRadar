# FormZero.ai Backend

FastAPI backend for an autonomous citizen-to-system pipeline that helps residents discover unclaimed public services.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## API

- `GET /api/v1/health`
- `POST /api/v1/services/ingest`
- `POST /api/v1/services/search`
- `POST /api/v1/intake/analyze`
- `POST /api/v1/eligibility`
- `GET /api/v1/eligibility/stream`
- `GET /api/v1/unclaimed/{profile_id}`

`/services/ingest` stores service documents in a local FAISS index. `/intake/analyze` searches that index, asks Gemini for a concise action summary, and can store the result in Supabase when `consent_to_store` is true.

## Validation

```bash
# 1. Health check
curl http://localhost:8000/api/v1/health

# 2. Test SSE stream
curl -N "http://localhost:8000/api/v1/eligibility/stream?query=I+am+a+farmer+in+Punjab+with+2+acres+of+land+and+annual+income+of+80000+rupees&country=india&session_id=test-123"

# 3. Test unclaimed clock
curl "http://localhost:8000/api/v1/unclaimed/test-123?programs=pm_kisan,ujjwala&start_date=2022-01-01"
```
