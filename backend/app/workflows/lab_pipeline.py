import asyncio
import time
from typing import Any, Literal

from langgraph.graph import END, StateGraph

from app.logging_config import logger
from app.services.llm_client import get_explanation_async
from app.services.reference_ranges import HARDCODED_RANGES, build_reference_lookup_payload, normalize_name
from app.services.mcp_client import MCPClientSingleton

mcp_client = MCPClientSingleton.get()


async def call_reference_range_lookup(test_name: str) -> dict[str, Any] | None:
    try:
        return await mcp_client.call_reference_lookup(test_name)
    except Exception:
        return None


def determine_status(value: float, ref_low: float | None, ref_high: float | None) -> Literal["Normal", "Warning", "Critical", "Unknown"]:
    if value is None or ref_low is None or ref_high is None:
        return "Unknown"
    if value < 0:
        return "Unknown"
    if value < ref_low:
        lower_span = ref_low - value
        lower_pct = lower_span / max(ref_high - ref_low, 1.0)
        return "Critical" if lower_pct > 0.2 else "Warning"
    if value > ref_high:
        upper_span = value - ref_high
        upper_pct = upper_span / max(ref_high - ref_low, 1.0)
        return "Critical" if upper_pct > 0.2 else "Warning"
    return "Normal"


async def classify_node(state: dict[str, Any]) -> dict[str, Any]:
    logger.info("→ classify_node started")
    start = time.time()
    try:
        classified: list[dict[str, Any]] = []
        for result in state["raw_results"]:
            test_name = str(result.get("test_name", "")).strip()
            value = result.get("value")
            unit = result.get("unit", "")

            if not test_name:
                classified.append({**result, "ref_low": None, "ref_high": None, "status": "Unknown", "explanation": "Missing test name.", "next_step": "Please provide a valid lab test name."})
                continue

            if value is None or not isinstance(value, (int, float)):
                classified.append({**result, "ref_low": None, "ref_high": None, "status": "Unknown", "explanation": "Missing or invalid lab value.", "next_step": "Enter a numeric value for the test."})
                continue

            value = float(value)
            if value < 0:
                classified.append({**result, "ref_low": None, "ref_high": None, "status": "Unknown", "explanation": "Negative value is invalid for this lab result.", "next_step": "Re-enter a valid positive numeric value."})
                continue

            ref = HARDCODED_RANGES.get(normalize_name(test_name))
            if ref is None:
                ref = await call_reference_range_lookup(test_name)
                if ref is None or "error" in ref:
                    ref = HARDCODED_RANGES.get(normalize_name(test_name).replace(" ", ""))

            ref = build_reference_lookup_payload(ref)

            if ref is None or "error" in ref:
                status = "Unknown"
                ref_low = None
                ref_high = None
            else:
                ref_low = float(ref.get("low"))
                ref_high = float(ref.get("high"))
                status = determine_status(value, ref_low, ref_high)

            classified.append(
                {
                    **result,
                    "test_name": test_name,
                    "value": value,
                    "unit": unit,
                    "ref_low": ref_low,
                    "ref_high": ref_high,
                    "status": status,
                }
            )
        elapsed = time.time() - start
        logger.info(f"✓ classify_node completed in {elapsed:.2f}s ({len(classified)} results)")
        return {**state, "classified": classified}
    except Exception as e:
        elapsed = time.time() - start
        logger.error(f"✗ classify_node FAILED after {elapsed:.2f}s — {e}")
        raise


async def route_node(state: dict[str, Any]) -> dict[str, Any]:
    logger.info("→ route_node started")
    start = time.time()
    try:
        grouped = {"Critical": [], "Warning": [], "Normal": [], "Unknown": []}
        for item in state["classified"]:
            grouped.setdefault(item["status"], []).append(item)
        elapsed = time.time() - start
        logger.info(f"✓ route_node completed in {elapsed:.2f}s (Critical: {len(grouped['Critical'])}, Warning: {len(grouped['Warning'])}, Normal: {len(grouped['Normal'])}, Unknown: {len(grouped['Unknown'])})")
        return {**state, "routed": grouped}
    except Exception as e:
        elapsed = time.time() - start
        logger.error(f"✗ route_node FAILED after {elapsed:.2f}s — {e}")
        raise


async def explain_node(state: dict[str, Any]) -> dict[str, Any]:
    logger.info("→ explain_node started")
    start = time.time()
    try:
        all_results: list[dict[str, Any]] = []
        for group_name in ["Critical", "Warning", "Normal", "Unknown"]:
            all_results.extend(state["routed"].get(group_name, []))

        async def process_result(result: dict[str, Any]) -> None:
            if result["status"] == "Unknown":
                result["explanation"] = "Reference range unavailable for this test."
                result["next_step"] = "Manual review recommended."
                return

            t0 = time.time()
            try:
                explain = await asyncio.wait_for(
                    get_explanation_async(
                        result["test_name"],
                        result["value"],
                        result.get("unit", ""),
                        result.get("ref_low"),
                        result.get("ref_high"),
                        result["status"],
                        timeout=10,
                    ),
                    timeout=10,
                )
                result["explanation"] = explain["explanation"]
                result["next_step"] = explain["next_step"]
                logger.info(f"  Gemini call for {result['test_name']} ({result['status']}) — {time.time() - t0:.2f}s")
            except asyncio.TimeoutError:
                logger.error(f"  Gemini call TIMED OUT for {result['test_name']} after 10s")
                result["explanation"] = "Explanation temporarily unavailable."
                result["next_step"] = "Manual review recommended."
            except Exception as e:
                logger.error(f"  Gemini call FAILED for {result['test_name']} — {e}")
                result["explanation"] = "Explanation unavailable (LLM error)."
                result["next_step"] = "Manual review recommended."

        await asyncio.gather(*(process_result(result) for result in all_results))

        elapsed = time.time() - start
        logger.info(f"✓ explain_node completed in {elapsed:.2f}s")
        return state
    except Exception as e:
        elapsed = time.time() - start
        logger.error(f"✗ explain_node FAILED after {elapsed:.2f}s — {e}")
        raise


workflow = StateGraph(dict)
workflow.add_node("classify", classify_node)
workflow.add_node("route", route_node)
workflow.add_node("explain", explain_node)
workflow.set_entry_point("classify")
workflow.add_edge("classify", "route")
workflow.add_edge("route", "explain")
workflow.add_edge("explain", END)

lab_agent = workflow.compile()
