# Clinical Lab Results Analyzer

An AI-powered full-stack clinical decision support web application built with **FastAPI**, **Model Context Protocol (MCP)**, **LangGraph**, **Google Gemini**, and **React**.

The application classifies patient lab tests into clinical triage tiers (**Critical**, **Warning**, **Normal**, **Unknown**), calculates reference interval deviations, and generates Explainable AI clinical significance assessments with recommended next steps.

---

## Architecture

```
[ React + TypeScript Frontend ] 
         │
         ▼  (POST /analyze_labs)
[ FastAPI Backend ]
         │
         ▼
[ LangGraph Agent Pipeline ]
   ├── 1. Classify Node (Hardcoded Ranges & Local CSV Dataset Lookup)
   ├── 2. Route Node (Priority Sorting: Critical ➔ Warning ➔ Normal ➔ Unknown)
   └── 3. Explain Node (Gemini GenAI with in-memory LLM Caching & Fallbacks)
```

### Core Architecture Components

1. **Frontend (React + Vite + TypeScript)**:
   - **Preset 1-Click Scenarios**: Instant loading of synthetic test panels (`Normal`, `Mixed`, `Critical`).
   - **Direct CSV File Upload**: Drag-and-drop or file browser for `.csv` test files.
   - **Interactive Tabular Form**: Dynamic row additions, removals, and validation.
   - **Visual Reference Range Meter**: Visual gauge showing patient value relative to the normal interval.
   - **Severity Badges**: Standard color-coded status badges (`🔴 Critical`, `⚠️ Warning`, `✓ Normal`).

2. **Backend (Python FastAPI)**:
   - Endpoint: `POST /analyze_labs` (Accepts `{"raw_results": [...]}`, `{"labs": [...]}`, or direct lists `[...]`).
   - Health Check: `GET /health`.
   - **In-Memory Caching**: Avoids duplicate Gemini API calls and protects against rate limits (HTTP 429).
   - **Resilient Fallbacks**: If external API quotas are exhausted, deterministic clinical fallback explanations ensure the service never fails.

3. **Model Context Protocol (MCP Server)**:
   - `backend/mcp_server.py` runs an MCP server exposing `reference_range_lookup(test_name)`.
   - The API reads reference intervals directly from `backend/data/lab_test_results_public.csv` so it does not need a persistent local MCP subprocess.
   - The MCP server remains available as a standalone tool for MCP clients.

4. **GenAI Integration**:
   - Provider: **Google Gemini** (`gemini-2.5-flash`).
   - Generates structured clinical explanations focusing on *why* a result is flagged and actionable next steps.

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikeys)

---

### 1. Backend Setup

From the repository root:

```powershell
# Navigate to backend
cd backend

# Create virtual environment (if not already created)
python -m venv .venv

# Activate virtual environment
# On Windows (PowerShell):
..\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source ../.venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the root directory:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
```

**Start the FastAPI backend:**
```powershell
# From the backend directory:
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or directly using the virtual environment:
..\.venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Backend will be live at: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`).
The Vite development server proxies `/api` requests to this backend.


---

### 2. Frontend Setup

In a new terminal, from the repository root:

```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Frontend will be live at: `http://localhost:5173`.

---

## Deploying Frontend and Backend Separately

Deploy the frontend as a Vercel project and the FastAPI backend as a Render web service:

1. **Render backend**: create a Render Blueprint from this repository. The included [`render.yaml`](./render.yaml) sets the service root to `backend` and defines its install/start commands and required environment variables.
2. Set `GOOGLE_API_KEY` to your Gemini API key and `FRONTEND_ORIGINS` to the exact Vercel production URL (for example, `https://your-app.vercel.app`). For Vercel preview deployments, add their origins too, comma-separated.
3. **Vercel frontend**: import the repository and set the Root Directory to `frontend`. Set `VITE_API_BASE_URL` to the Render service's origin (for example, `https://your-api.onrender.com`, without a trailing slash), then deploy.
4. Verify the Render `/health` endpoint and submit a sample lab panel from the Vercel site.

The frontend defaults to `/api` for local development, which Vite proxies to `http://localhost:8000`. In production, `VITE_API_BASE_URL` directs browser requests to Render. Keep `GOOGLE_API_KEY` only in Render's environment settings; never expose it as a `VITE_` variable.

The Render Blueprint selects the Free web service plan. Free services can spin down after inactivity and may take about a minute to respond to the first request after sleeping; they also have monthly usage limits.

---

## Synthetic Benchmark Datasets

Three synthetic test datasets are provided in `backend/test_data/`:
1. `normal_results.csv`: All tests fall strictly within normal physiological reference ranges.
2. `mixed_results.csv`: Realistic panel with a blend of normal values and moderate elevations (e.g. elevated Glucose and liver enzymes).
3. `critical_results.csv`: High-acuity abnormal results requiring immediate triage (e.g., severe hyperkalemia, profound anemia, severe hyperglycemia).

> **Tip**: In the frontend UI, you can use the **1-Click Test Scenarios** buttons or drag and drop any of these CSV files directly to evaluate findings.

---

## Running Tests

The backend has a pytest suite. API tests stub Gemini responses and use the checked-in reference-range data, so they do not make live Gemini requests. The application still requires `GOOGLE_API_KEY` to initialize the Gemini client.

To run the full test suite:

```powershell
cd backend
pytest tests/ -v
```

### Test Files

| File | What it covers |
|---|---|
| `test_api.py` | FastAPI endpoints (`/health`, `/analyze_labs`) via `TestClient` |
| `test_agent.py` | LangGraph agent nodes and state transitions |
| `test_pipeline.py` | End-to-end pipeline classification and routing |
| `test_llm.py` | LLM integration and fallback logic |
| `test_llm_client.py` | LLM client wrapper and in-memory caching |
| `test_mcp_client.py` | MCP client connection and tool calls |
| `test_reference_ranges.py` | Reference range deviation thresholds |

> **Note**: `pytest`, `pytest-asyncio`, and `httpx` are included in `requirements.txt` and will be installed with `pip install -r requirements.txt`.

---

## Explainable AI & Clinical Safety

- **No Black Boxes**: Every abnormal result displays the reference boundaries against which it was evaluated, accompanied by a visual range gauge.
- **Actionable Guidance**: Abnormalities provide clinical context and structured recommendations (e.g., repeating the test, scheduling specialist consults, or urgent physician review).
- **Graceful Error Handling**: Missing values, non-numeric inputs, or negative values are routed to the `Unknown` category with clear guidance to avoid diagnostic errors.
