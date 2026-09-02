from typing import Any, Optional, Union

from fastapi import Body, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.logging_config import logger
from app.workflows.lab_pipeline import lab_agent, mcp_client

app = FastAPI(title="Clinical Lab Results Analyzer")


@app.on_event("startup")
async def startup() -> None:
    logger.info("Application startup began")
    try:
        await mcp_client.connect()
        logger.info("MCP client connected successfully")
        logger.info("Application startup complete")
    except Exception as exc:
        logger.exception(f"Application startup failed while connecting MCP: {exc}")
        raise


@app.on_event("shutdown")
async def shutdown() -> None:
    logger.info("Application shutdown started")
    try:
        await mcp_client.close()
        logger.info("MCP client closed successfully")
    except Exception as exc:
        logger.exception(f"Error during application shutdown: {exc}")
        raise


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
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

