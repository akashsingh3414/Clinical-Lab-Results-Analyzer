import asyncio
import json
import os
from typing import Any, Literal

from dotenv import load_dotenv
from google import genai
from google.genai import types
from langgraph.graph import END, StateGraph

load_dotenv()

client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

HARDCODED_RANGES = {
    "hemoglobin": {"low": 13.5, "high": 17.5, "unit": "g/dL"},
    "glucose": {"low": 70, "high": 100, "unit": "mg/dL"},
    "wbc": {"low": 4.5, "high": 11.0, "unit": "x10^9/L"},
    "sodium": {"low": 135, "high": 145, "unit": "mmol/L"},
    "potassium": {"low": 3.5, "high": 5.1, "unit": "mmol/L"},
    "creatinine": {"low": 0.6, "high": 1.2, "unit": "mg/dL"},
    "cholesterol": {"low": 0, "high": 200, "unit": "mg/dL"},
    "ldl": {"low": 0, "high": 100, "unit": "mg/dL"},
    "hdl": {"low": 40, "high": 60, "unit": "mg/dL"},
    "triglycerides": {"low": 0, "high": 150, "unit": "mg/dL"},
}

PROMPT_TEMPLATE = """You are a clinical assistant. Given this lab result, respond ONLY with JSON:
{{"explanation": "<1-2 sentence clinical explanation>", "next_step": "<short suggested action>"}}

Test: {test_name}
Value: {value} {unit}
Reference range: {ref_low}-{ref_high} {unit}
Status: {status}
"""


def call_reference_range_lookup(test_name: str) -> dict[str, Any] | None:
    try:
        # Keep the MCP fallback tiny and real: use the stdio MCP tool from the spike.
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client

        async def _lookup() -> dict:
            server_params = StdioServerParameters(
                command=r"D:\Dev\Python\Clinical Lab Results Analyzer\.venv\Scripts\python.exe",
                args=["mcp_server.py"],
                cwd=r"D:\Dev\Python\Clinical Lab Results Analyzer\backend",
            )
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    result = await session.call_tool(
                        "reference_range_lookup",
                        arguments={"test_name": test_name},
                    )
                    payload = result.content[0].text if result.content else "{}"
                    return json.loads(payload)

        return asyncio.run(_lookup())
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


def get_explanation(test_name: str, value: float, unit: str, ref_low: float | None, ref_high: float | None, status: str) -> dict[str, str]:
    if status == "Unknown":
        return {
            "explanation": "Reference range unavailable for this test.",
            "next_step": "Manual review recommended.",
        }

    prompt = PROMPT_TEMPLATE.format(
        test_name=test_name,
        value=value,
        unit=unit,
        ref_low=ref_low,
        ref_high=ref_high,
        status=status,
    )
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    text = response.text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].lstrip()
    return json.loads(text)


def classify_node(state: dict[str, Any]) -> dict[str, Any]:
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

        ref = HARDCODED_RANGES.get(test_name.lower())
        if ref is None:
            ref = call_reference_range_lookup(test_name)

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
    return {**state, "classified": classified}


def route_node(state: dict[str, Any]) -> dict[str, Any]:
    grouped = {"Critical": [], "Warning": [], "Normal": [], "Unknown": []}
    for item in state["classified"]:
        grouped.setdefault(item["status"], []).append(item)
    return {**state, "routed": grouped}


def explain_node(state: dict[str, Any]) -> dict[str, Any]:
    for group_name in ["Critical", "Warning", "Normal", "Unknown"]:
        for result in state["routed"].get(group_name, []):
            if result["status"] == "Unknown":
                result["explanation"] = "Reference range unavailable for this test."
                result["next_step"] = "Manual review recommended."
                continue
            explain = get_explanation(
                result["test_name"],
                result["value"],
                result.get("unit", ""),
                result.get("ref_low"),
                result.get("ref_high"),
                result["status"],
            )
            result["explanation"] = explain["explanation"]
            result["next_step"] = explain["next_step"]
    return state


workflow = StateGraph(dict)
workflow.add_node("classify", classify_node)
workflow.add_node("route", route_node)
workflow.add_node("explain", explain_node)
workflow.set_entry_point("classify")
workflow.add_edge("classify", "route")
workflow.add_edge("route", "explain")
workflow.add_edge("explain", END)

lab_agent = workflow.compile()
