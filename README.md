# Transit Maintenance Dashboard

Monorepo with a Python FastAPI backend and a TypeScript/React frontend.

- Backend: `backend/` (requirements in `backend/requirements.txt`)
- Frontend: `frontend/` (npm project)

## Quick start (dev)

1. Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Example run (adjust as needed):
# uvicorn main:app --reload
```

2. Frontend:

```bash
cd frontend
npm install
npm run dev
```

