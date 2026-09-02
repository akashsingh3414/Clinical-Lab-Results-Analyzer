from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agent import lab_agent

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


class LabResultInput(BaseModel):
    test_name: str = Field(..., min_length=1)
    value: float
    unit: Optional[str] = None


class LabBatchInput(BaseModel):
    raw_results: list[LabResultInput]


@app.post("/analyze_labs")
def analyze_labs(payload: LabBatchInput) -> dict:
    state = lab_agent.invoke({"raw_results": [item.model_dump() for item in payload.raw_results]})
    return {
        "status": "ok",
        "results": state.get("routed", {}),
    }
