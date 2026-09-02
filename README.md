# Clinical Lab Results Analyzer

An AI-powered clinical lab results analyzer that uses **LangGraph**, **Gemini LLM**, and **MCP** to classify, route, and explain laboratory test results with intelligent explainability.

## Architecture

```
React (TypeScript) → FastAPI → LangGraph Agent → Gemini LLM + MCP Server
```

### Data Flow

1. **Frontend** (React + Vite): User submits lab results as JSON
2. **FastAPI** (`/analyze_labs` endpoint): Validates and forwards to LangGraph agent
3. **LangGraph Pipeline**:
   - **Classify Node**: Looks up reference ranges (hardcoded common tests + MCP fallback)
   - **Route Node**: Groups results by severity (Critical → Warning → Normal → Unknown)
   - **Explain Node**: Generates clinical explanations using Gemini LLM
4. **Results**: Returned as grouped findings with explanations and next steps

## AI Approach

- **LLM Provider**: Google Gemini (`gemini-3.6-flash`) via Google AI Studio
- **Reference Data**: 
  - Common labs hardcoded (Hemoglobin, Glucose, WBC, etc.)
  - Unknown tests use MCP reference lookup tool
  - No hand-typed catalog — data-driven + fallback pattern
- **Explanations**: Gemini generates for every result (including Normal, for reassurance)
- **Explainability**: Each result shows:
  - Test name + value + unit
  - Reference range used
  - Status badge (color-coded severity)
  - LLM-generated explanation
  - Recommended next step

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
python test_agent.py
# Expected output: "agent_ok"
```

### 2. API Endpoint

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

### 3. Frontend (Manual)

1. Go to `http://localhost:5173`
2. Paste JSON in the textarea (pre-filled with test data)
3. Click **"Analyze labs"**
4. See results grouped by severity with explanations

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
│   ├── main.py               # FastAPI app + /analyze_labs endpoint
│   ├── agent.py              # LangGraph pipeline (classify → route → explain)
│   ├── mcp_server.py         # MCP tool server (reference_range_lookup)
│   ├── test_agent.py         # End-to-end agent test
│   ├── requirements.txt       # Python dependencies
│   ├── data/                 # Kaggle lab dataset (reference)
│   └── .env                  # API keys (GOOGLE_API_KEY)
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main React component (polished UI)
│   │   └── main.tsx         # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── README.md
```

## Key Implementation Details

### Phase 3: LangGraph Agent
- `classify_node`: Reference range lookup (hardcoded → MCP fallback)
- `route_node`: Group by severity threshold
- `explain_node`: Gemini LLM call for each result
- `determine_status()`: Maps value to Critical/Warning/Normal based on range

### Phase 4: FastAPI Integration
- Pydantic models for input validation
- CORS configured for Vite dev server
- JSON response grouped by severity

### Phase 5: React Frontend
- Textarea JSON input (pre-filled with test data)
- Real-time validation + error handling
- Color-coded results display by severity
- Reference ranges shown inline

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

## Submission Checklist

- ✅ Phases 3-7 complete (Graph, API, UI, Polish)
- ✅ End-to-end test passing
- ✅ All dependencies in requirements.txt
- ✅ .env.example with placeholders
- ✅ README with setup, testing, examples
- ✅ Clean git history
- ✅ Repo public on GitHub

## License

MIT
