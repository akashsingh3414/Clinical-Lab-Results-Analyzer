import pytest
from app.workflows.lab_pipeline import determine_status, classify_node, route_node
from app.services.llm_client import EXPLANATION_CACHE, get_explanation_async, _get_cache_key


def test_determine_status():
    # Normal range 13.5 - 17.5
    assert determine_status(15.0, 13.5, 17.5) == "Normal"
    # Warning (slight elevation)
    assert determine_status(18.0, 13.5, 17.5) == "Warning"
    # Critical (severe drop or elevation > 20% span)
    assert determine_status(8.0, 13.5, 17.5) == "Critical"
    # Edge cases
    assert determine_status(None, 10.0, 20.0) == "Unknown"
    assert determine_status(-5.0, 10.0, 20.0) == "Unknown"


@pytest.mark.anyio
async def test_classify_and_route_nodes():
    state = {
        "raw_results": [
            {"test_name": "Hemoglobin", "value": 8.2, "unit": "g/dL"},
            {"test_name": "Glucose", "value": 105, "unit": "mg/dL"},
            {"test_name": "WBC", "value": 7.5, "unit": "x10^9/L"},
            {"test_name": "", "value": 50, "unit": "mg/dL"},
        ]
    }
    classified_state = await classify_node(state)
    assert "classified" in classified_state
    assert len(classified_state["classified"]) == 4

    routed_state = await route_node(classified_state)
    assert "routed" in routed_state
    assert len(routed_state["routed"]["Critical"]) >= 1
    assert len(routed_state["routed"]["Warning"]) >= 1
    assert len(routed_state["routed"]["Normal"]) >= 1
    assert len(routed_state["routed"]["Unknown"]) >= 1


@pytest.mark.anyio
async def test_llm_cache_storage():
    cache_key = _get_cache_key("Potassium", 6.8, "mmol/L", 3.5, 5.1, "Critical")
    EXPLANATION_CACHE[cache_key] = {
        "explanation": "Severe hyperkalemia detected.",
        "next_step": "Administer urgent cardiac and membrane stabilization therapy.",
    }

    # Should immediately hit cache without calling external API
    result = await get_explanation_async("Potassium", 6.8, "mmol/L", 3.5, 5.1, "Critical")
    assert result["explanation"] == "Severe hyperkalemia detected."
    assert "cardiac" in result["next_step"]




