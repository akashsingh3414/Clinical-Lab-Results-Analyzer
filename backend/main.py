from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="Clinical Lab Results Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


class LabInput(BaseModel):
    test_name: str = Field(..., min_length=1)
    value: float
    unit: Optional[str] = None
    reference_range: Optional[str] = None


@app.post("/analyze_labs")
def analyze_labs(payload: LabInput) -> dict:
    return {
        "status": "ok",
        "result": {
            "test_name": payload.test_name,
            "value": payload.value,
            "unit": payload.unit,
            "reference_range": payload.reference_range,
            "classification": "normal",
            "explanation": "Backend skeleton is in place. Real rule-based and LLM-driven analysis will be added in the agent phase.",
            "next_step": "Awaiting LangGraph integration.",
        },
    }
