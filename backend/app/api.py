from typing import Optional

from fastapi import FastAPI
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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
    raw_results: list[LabResultInput]


@app.post("/analyze_labs")
async def analyze_labs(payload: LabBatchInput) -> dict:
    logger.info(f"Analyze request received for {len(payload.raw_results)} lab result(s)")
    try:
        state = await lab_agent.ainvoke({"raw_results": [item.model_dump() for item in payload.raw_results]})
        routed = state.get("routed", {})
        counts = {k: len(v) for k, v in routed.items()}
        logger.info(f"Analyze request complete: {counts}")
        return {"status": "ok", "results": routed}
    except Exception as exc:
        logger.exception(f"Analyze request failed: {exc}")
        raise
