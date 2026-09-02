# Clinical Lab Results Analyzer

An AI-powered clinical lab results analyzer that uses **LangGraph**, **Gemini LLM**, and **MCP** to classify, route, and explain laboratory test results with intelligent explainability.

## Architecture

```
React (TypeScript + Vite) → FastAPI → LangGraph Agent → Gemini LLM + MCP Server
```

### Data Flow

1. **Frontend** (React + TypeScript + Vite): User enters lab results via form or CSV upload
2. **FastAPI** (`/analyze_labs` endpoint): Validates input and forwards to LangGraph agent
3. **LangGraph Pipeline** (`backend/app/workflows/lab_pipeline.py`):
   - **Classify Node**: Looks up reference ranges (CSV-backed common tests + MCP fallback)
   - **Route Node**: Groups results by severity (Critical → Warning → Normal → Unknown)
   - **Explain Node**: Generates clinical explanations using Gemini LLM in parallel
4. **Results**: Returned as grouped findings with explanations, reference ranges, and next steps

## AI Approach

- **LLM Provider**: Google Gemini (`gemini-3.5-flash`) via Google AI Studio
- **Reference Data**:
  - CSV-backed common labs (Hemoglobin, Glucose, WBC, Platelets, etc.)
  - Unknown tests use MCP reference lookup tool
  - Data-driven approach with fallback pattern
- **Explanations**: Gemini generates for every result (including Normal for reassurance)
- **Explainability**: Each result displays:
  - Test name + value + unit
  - Reference range used
  - Status badge (color-coded severity: 🔴 Critical, ⚠️ Warning, ✓ Normal, ❔ Unknown)
  - LLM-generated clinical explanation
  - Recommended next steps

## Features

✅ **Severity-Based Routing** — Critical results flagged first
✅ **Reference Range Comparison** — Automatic range lookup with thresholds
✅ **Clinical Explanations** — Gemini generates why each result matters
✅ **Edge Case Handling** — Missing/invalid values marked Unknown, no crashes
✅ **MCP Fallback** — Unknown lab tests resolved via Model Context Protocol

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Add your Gemini API key to `.env`:

```
GOOGLE_API_KEY=your_key_here
```

Then start the server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open: `http://localhost:5173`

## Testing

### 1. Backend Agent (Direct)

```bash
cd backend
python tests/test_agent.py
# Expected output: "agent_ok"
```

### 2. Backend Tests (Pytest)

```bash
cd backend
python -m pytest tests/ -v
# Or from repo root:
python -m pytest backend/tests/ -v
```

### 3. API Endpoint

```bash
curl -X POST http://localhost:8000/analyze_labs \
  -H "Content-Type: application/json" \
  -d '{
    "raw_results": [
      {"test_name": "Hemoglobin", "value": 8.2, "unit": "g/dL"},
      {"test_name": "Glucose", "value": 105, "unit": "mg/dL"}
    ]
  }'
```

### 4. Frontend (Manual)

1. Start backend: `cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173`
4. Enter lab results in the form and click **Analyze Form**
5. See results grouped by severity with explanations

### 5. Test Data

Use the CSV files in `test_data/` folder for testing:

- `test_data/normal_results.csv` — All normal lab values
- `test_data/critical_results.csv` — Critical/abnormal values
- `test_data/mixed_results.csv` — Mix of normal, warning, and critical

## Example Payloads

### All Normal Results

```json
{
  "raw_results": [
    {"test_name": "Hemoglobin", "value": 14.5, "unit": "g/dL"},
    {"test_name": "Glucose", "value": 85, "unit": "mg/dL"}
  ]
}
```

**Expected**: Both in "Normal" group with green badges ✓

### Critical Results

```json
{
  "raw_results": [
    {"test_name": "Hemoglobin", "value": 7.0, "unit": "g/dL"},
    {"test_name": "Glucose", "value": 400, "unit": "mg/dL"}
  ]
}
```

**Expected**: Both in "Critical" group with red badges 🔴, urgent explanations

### Unknown Test (MCP Fallback)

```json
{
  "raw_results": [
    {"test_name": "RareLabTestXYZ", "value": 50, "unit": "mg/dL"}
  ]
}
```

**Expected**: "Unknown" group with ❔ badge, "Reference range unavailable" message

### Edge Cases

```json
{
  "raw_results": [
    {"test_name": "Hemoglobin", "value": -5.0, "unit": "g/dL"},
    {"test_name": "", "value": 100, "unit": "mg/dL"},
    {"test_name": "Glucose", "value": null, "unit": "mg/dL"}
  ]
}
```

**Expected**: All marked "Unknown" with explanatory error messages, no crashes

## Project Structure

```
.
├── backend/
│   ├── main.py                      # FastAPI app entry point
│   ├── mcp_server.py                # MCP tool server (reference_range_lookup)
│   ├── requirements.txt              # Python dependencies
│   ├── app/
│   │   ├── __init__.py
│   │   ├── api.py                   # FastAPI routes (/health, /analyze_labs)
│   │   ├── config.py                # Configuration
│   │   ├── logging_config.py        # Logging setup
│   │   ├── workflows/
│   │   │   └── lab_pipeline.py      # LangGraph agent (classify → route → explain)
│   │   └── services/
│   │       ├── llm_client.py        # Gemini LLM async calls
│   │       ├── mcp_client.py        # MCP client singleton
│   │       └── reference_ranges.py  # Lab reference data + CSV loader
│   ├── tests/
│   │   ├── test_agent.py            # End-to-end agent test
│   │   ├── test_mcp_client.py       # MCP client connectivity test
│   │   └── conftest.py              # Pytest configuration
│   └── data/
│       └── lab_reference_ranges.csv # Lab reference ranges dataset
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Main React component
│   │   ├── main.tsx                 # Vite entry point
│   │   ├── index.css                # Global styles
│   │   └── components/
│   │       ├── LabInput.jsx         # Form input (add/remove rows)
│   │       ├── ResultsDisplay.jsx   # Results grouped by severity
│   │       ├── SeverityBadge.jsx    # Severity badge component
│   │       └── types.d.ts           # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── test_data/
│   ├── normal_results.csv           # All normal lab values
│   ├── critical_results.csv         # Critical/abnormal values
│   └── mixed_results.csv            # Mix of normal, warning, critical
│
├── .env                             # Your API keys (not in repo)
├── .env.example                     # Template
└── README.md
```

## Key Implementation Details

### Backend Architecture

**Modular Package Structure** (`backend/app/`)

- `app/api.py` — FastAPI routes with Pydantic validation
- `app/workflows/lab_pipeline.py` — LangGraph state graph (classify → route → explain)
- `app/services/llm_client.py` — Async Gemini calls with timeout protection
- `app/services/mcp_client.py` — Singleton MCP client (connection reuse)
- `app/services/reference_ranges.py` — CSV-backed lab reference data + normalization
- `app/logging_config.py` — Structured logging for all operations

**LangGraph Nodes**

- `classify_node`: Normalize test names, lookup reference ranges (CSV → MCP fallback)
- `route_node`: Determine severity, group by Critical/Warning/Normal/Unknown
- `explain_node`: Call Gemini in parallel for each result with timeout
- `determine_status()`: Maps numeric value to severity based on reference range

**FastAPI Integration**

- Pydantic models for input validation (`LabResultInput`, `LabBatchInput`)
- CORS configured for Vite dev server (`localhost:5173`)
- Structured error handling and logging
- JSON response grouped by severity

### Frontend Architecture

**React Components** (Modular)

- `App.tsx` — Health check, form submission, results display
- `LabInput.jsx` — Form-based input with add/remove row functionality
- `ResultsDisplay.jsx` — Results grouped by severity with badge/explanation
- `SeverityBadge.jsx` — Color-coded status chips (🔴 Critical, ⚠️ Warning, ✓ Normal, ❔ Unknown)

**Features**

- Form-based input (user-friendly, no JSON paste)
- Real-time form validation (test name required, numeric values)
- Loading state while Gemini processes
- Error handling and display
- Reference ranges shown inline with results

## Environment Variables

**`.env` (required)**

```
GOOGLE_API_KEY=your_google_ai_studio_key
```

**`.env.example`** (template for users)

```
GOOGLE_API_KEY=your_key_here
```

## Explainability & Trustworthiness

- **Every result is explained** — not just flagged, but clinically justified
- **Reference ranges are visible** — users see the thresholds being applied
- **No black-box decisions** — Gemini explains why (e.g., "Hemoglobin is critically low because it's 38% below the minimum")
- **Next steps are actionable** — not just status, but "Recommend iron supplementation" or "Follow up with endocrinologist"
- **Edge cases are handled gracefully** — missing data doesn't crash, it's reported clearly

## Technologies

- **Backend**: Python, FastAPI, LangGraph, Google Generative AI
- **Frontend**: React, TypeScript, Vite
- **Integration**: Model Context Protocol (MCP) for tool-based lookups
- **LLM**: Gemini (via Google AI Studio free tier)

## Deliverables Checklist

- ✅ **GitHub Repository** — Public repo with git history
- ✅ **Backend Implementation** — Modular FastAPI + LangGraph pipeline
- ✅ **Frontend Implementation** — React form-based UI with component structure
- ✅ **LLM Integration** — Gemini for clinical explanations
- ✅ **MCP Tool Server** — Reference range lookup with fallback
- ✅ **Input Validation** — Pydantic models for backend validation
- ✅ **Test Suite** — End-to-end agent test + MCP client test
- ✅ **Test Data** — 3 CSV files (normal, critical, mixed results)
- ✅ **Logging** — Structured logging for all operations
- ✅ **Environment Setup** — .env and .env.example with clear templates
- ✅ **Documentation** — README with setup, architecture, testing, examples
- ✅ **Clean Git History** — Meaningful commits showing iteration

## License

MIT
