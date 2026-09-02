import asyncio

from app.workflows.lab_pipeline import lab_agent


async def main() -> None:
    state = await lab_agent.ainvoke(
        {
            "raw_results": [
                {"test_name": "Hemoglobin", "value": 8.2, "unit": "g/dL"},
                {"test_name": "Glucose", "value": 105, "unit": "mg/dL"},
                {"test_name": "WBC", "value": 7.5, "unit": "x10^9/L"},
                {"test_name": "Unknown Test", "value": 50, "unit": "mg/dL"},
            ]
        }
    )

    assert "routed" in state
    assert state["routed"]["Critical"]
    assert state["routed"]["Warning"]
    assert state["routed"]["Normal"]
    assert state["routed"]["Unknown"]
    for result in state["routed"]["Critical"] + state["routed"]["Warning"] + state["routed"]["Normal"]:
        assert result.get("explanation")
    print("agent_ok")


asyncio.run(main())
