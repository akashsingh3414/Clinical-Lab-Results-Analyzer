import json
import os
import time

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()


if __name__ == "__main__":
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.6-flash",
        temperature=0.2,
        response_mime_type="application/json",
        api_key=os.getenv("GOOGLE_API_KEY"),
    )

    prompt = (
        "Return a JSON object with keys: explanation and next_step. "
        "For a lab result of total cholesterol 240 mg/dL with reference range 0-199 mg/dL, "
        "explain the result briefly."
    )

    start = time.time()
    response = llm.invoke([HumanMessage(content=prompt)])
    latency_ms = round((time.time() - start) * 1000, 1)

    raw_text = response.content
    if isinstance(raw_text, list):
        text_parts = [part.get("text", "") for part in raw_text if isinstance(part, dict)]
        raw_text = "".join(text_parts)

    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError:
        payload = {"explanation": raw_text, "next_step": "Review with a clinician."}

    print(json.dumps({"latency_ms": latency_ms, "payload": payload}, indent=2))
