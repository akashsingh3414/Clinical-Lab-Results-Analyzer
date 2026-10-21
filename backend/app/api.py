import os
from typing import Any, Optional, Union

from fastapi import Body, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.logging_config import logger
from app.workflows.lab_pipeline import lab_agent


app = FastAPI(title="Clinical Lab Results Analyzer")
frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/api/health")
def health() -> dict:
    logger.info("Health check requested")
    return {"status": "ok"}


class LabResultInput(BaseModel):
    test_name: str = Field(..., min_length=1)
    value: float
    unit: Optional[str] = None


class LabBatchInput(BaseModel):
    raw_results: Optional[list[LabResultInput]] = None
    labs: Optional[list[LabResultInput]] = None


@app.post("/analyze_labs")
@app.post("/api/analyze_labs")
async def analyze_labs(
    payload: Union[LabBatchInput, list[LabResultInput], dict[str, Any]] = Body(...),
) -> dict:
    raw_items: list[dict[str, Any]] = []

    if isinstance(payload, list):
        for item in payload:
            raw_items.append(item.model_dump() if hasattr(item, "model_dump") else dict(item))
    elif isinstance(payload, LabBatchInput):
        items = payload.raw_results or payload.labs or []
        raw_items = [item.model_dump() for item in items]
    elif isinstance(payload, dict):
        items = payload.get("raw_results") or payload.get("labs") or []
        for item in items:
            raw_items.append(item.model_dump() if hasattr(item, "model_dump") else dict(item))

    logger.info(f"Analyze request received for {len(raw_items)} lab result(s)")
    try:
        state = await lab_agent.ainvoke({"raw_results": raw_items})
        routed = state.get("routed", {})
        counts = {k: len(v) for k, v in routed.items()}
        logger.info(f"Analyze request complete: {counts}")
        return {"status": "ok", "results": routed}
    except Exception as exc:
        logger.exception(f"Analyze request failed: {exc}")
        raise
