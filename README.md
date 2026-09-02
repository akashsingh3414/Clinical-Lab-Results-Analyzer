# Clinical Lab Results Analyzer

This project is being built in stages.

## Architecture

React (TS) -> FastAPI -> LangGraph Agent -> MCP Server (tools)

## Current status

The initial skeleton includes:
- a FastAPI backend with a `/health` endpoint
- a simple React + TypeScript frontend
- CORS configured for the Vite dev server
- a stub `/analyze_labs` endpoint that returns a structured response

## Run locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173.
