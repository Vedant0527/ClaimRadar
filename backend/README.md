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

`/services/ingest` stores service documents in a local FAISS index. `/intake/analyze` searches that index, asks Gemini for a concise action summary, and can store the result in Supabase when `consent_to_store` is true.
