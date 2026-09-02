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
   ├── 1. Classify Node (Hardcoded Ranges & Kaggle Dataset Lookup via MCP Server)
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
   - Loads and queries reference intervals directly from the Kaggle dataset (`backend/data/lab_test_results_public.csv`).
   - Connected over standard MCP stdio protocol via `mcp_client.py`.

4. **GenAI Integration**:
   - Provider: **Google Gemini** (`gemini-3.6-flash`).
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

## Synthetic Benchmark Datasets

Three synthetic test datasets are provided in `backend/test_data/`:
1. `normal_results.csv`: All tests fall strictly within normal physiological reference ranges.
2. `mixed_results.csv`: Realistic panel with a blend of normal values and moderate elevations (e.g. elevated Glucose and liver enzymes).
3. `critical_results.csv`: High-acuity abnormal results requiring immediate triage (e.g., severe hyperkalemia, profound anemia, severe hyperglycemia).

> **Tip**: In the frontend UI, you can use the **1-Click Test Scenarios** buttons or drag and drop any of these CSV files directly to evaluate findings.

---

## Running Tests

To run the automated backend test suite:

```powershell
cd backend
..\.venv\Scripts\pytest -v tests/test_agent.py
```

### Verified Test Cases:
- `test_determine_status`: Validates deviation thresholds for Normal, Warning, Critical, and edge cases.
- `test_classify_and_route_nodes`: Validates LangGraph state transitions and severity priority sorting.
- `test_llm_cache_storage`: Validates zero-latency in-memory LLM response caching.

---

## Explainable AI & Clinical Safety

- **No Black Boxes**: Every abnormal result displays the reference boundaries against which it was evaluated, accompanied by a visual range gauge.
- **Actionable Guidance**: Abnormalities provide clinical context and structured recommendations (e.g., repeating the test, scheduling specialist consults, or urgent physician review).
- **Graceful Error Handling**: Missing values, non-numeric inputs, or negative values are routed to the `Unknown` category with clear guidance to avoid diagnostic errors.
