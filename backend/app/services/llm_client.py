import asyncio
import json
from typing import Any

from app.config import get_google_api_key
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

    response = await asyncio.wait_for(
        client.aio.models.generate_content(
            model="gemini-3.6-flash",
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
    return payload
