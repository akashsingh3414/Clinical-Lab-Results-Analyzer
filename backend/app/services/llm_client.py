import asyncio
import json
from typing import Any

from app.config import get_google_api_key
from app.logging_config import logger
from google import genai
from google.genai import types

PROMPT_TEMPLATE = """You are a clinical assistant. Given this lab result, respond ONLY with JSON:
{{"explanation": "<1-2 sentence clinical explanation>", "next_step": "<short suggested action>"}}

Test: {test_name}
Value: {value} {unit}
Reference range: {ref_low}-{ref_high} {unit}
Status: {status}
"""

client = genai.Client(api_key=get_google_api_key())

# In-memory explanation cache to reduce LLM calls and avoid rate limits
EXPLANATION_CACHE: dict[str, dict[str, str]] = {}


def _get_cache_key(
    test_name: str,
    value: float,
    unit: str,
    ref_low: float | None,
    ref_high: float | None,
    status: str,
) -> str:
    return f"{test_name.strip().lower()}:{round(float(value), 3)}:{unit.strip().lower()}:{ref_low}:{ref_high}:{status.strip().lower()}"


def _generate_fallback_explanation(
    test_name: str,
    value: float,
    unit: str,
    ref_low: float | None,
    ref_high: float | None,
    status: str,
) -> dict[str, str]:
    if status == "Normal":
        return {
            "explanation": f"{test_name} level of {value} {unit} is within the expected normal reference range ({ref_low}-{ref_high} {unit}).",
            "next_step": "Maintain routine checkups.",
        }
    elif status == "Warning":
        direction = "above" if (ref_high is not None and value > ref_high) else "below"
        return {
            "explanation": f"{test_name} level of {value} {unit} is moderately {direction} the normal reference range ({ref_low}-{ref_high} {unit}).",
            "next_step": "Recommend repeating test or scheduling clinical follow-up.",
        }
    elif status == "Critical":
        direction = "severely elevated" if (ref_high is not None and value > ref_high) else "severely depressed"
        return {
            "explanation": f"{test_name} level of {value} {unit} is {direction} compared to standard reference limits ({ref_low}-{ref_high} {unit}), indicating high clinical urgency.",
            "next_step": "Urgent medical evaluation / specialist consultation required.",
        }
    return {
        "explanation": "Reference range unavailable for this test.",
        "next_step": "Consult a physician or specialist for comprehensive clinical review and manual evaluation.",
    }


async def get_explanation_async(
    test_name: str,
    value: float,
    unit: str,
    ref_low: float | None,
    ref_high: float | None,
    status: str,
    timeout: float = 10,
) -> dict[str, str]:
    if status == "Unknown":
        return {
            "explanation": "Reference range unavailable for this test.",
            "next_step": "Consult a physician or specialist for comprehensive clinical review and manual evaluation.",
        }


    cache_key = _get_cache_key(test_name, value, unit, ref_low, ref_high, status)
    if cache_key in EXPLANATION_CACHE:
        logger.info(f"LLM Cache HIT for {test_name} ({status})")
        return EXPLANATION_CACHE[cache_key]

    prompt = PROMPT_TEMPLATE.format(
        test_name=test_name,
        value=value,
        unit=unit,
        ref_low=ref_low,
        ref_high=ref_high,
        status=status,
    )

    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            ),
            timeout=timeout,
        )

        text = response.text.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].lstrip()
        payload = json.loads(text)
        
        # Validate keys in payload
        if "explanation" in payload and "next_step" in payload:
            EXPLANATION_CACHE[cache_key] = payload
            return payload
    except Exception as exc:
        logger.warning(f"LLM call encountered issue for {test_name}: {exc}. Using clinical fallback logic.")
    
    fallback = _generate_fallback_explanation(test_name, value, unit, ref_low, ref_high, status)
    EXPLANATION_CACHE[cache_key] = fallback
    return fallback
