import json
import os
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

PROMPT_TEMPLATE = """You are a clinical assistant. Given this lab result, respond ONLY with JSON:
{{"explanation": "<1-2 sentence clinical explanation>", "next_step": "<short suggested action>"}}

Test: {test_name}
Value: {value} {unit}
Reference range: {ref_low}-{ref_high} {unit}
Status: {status}
"""


def get_explanation(test_name, value, unit, ref_low, ref_high, status):
    prompt = PROMPT_TEMPLATE.format(
        test_name=test_name,
        value=value,
        unit=unit,
        ref_low=ref_low,
        ref_high=ref_high,
        status=status,
    )
    start = time.time()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    elapsed = time.time() - start
    print(f"Latency: {elapsed:.2f}s")
    text = response.text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].lstrip()
    return json.loads(text)


if __name__ == "__main__":
    dummy_cases = [
        ("Hemoglobin", 8.2, "g/dL", 13.5, 17.5, "Critical"),
        ("Glucose", 105, "mg/dL", 70, 100, "Warning"),
        ("WBC", 7.5, "x10^9/L", 4.5, 11.0, "Normal"),
    ]
    for case in dummy_cases:
        result = get_explanation(*case)
        print(json.dumps(result, indent=2))
        print("---")
