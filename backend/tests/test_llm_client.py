"""Tests for app.services.llm_client — _get_cache_key and _generate_fallback_explanation."""

import pytest
from app.services.llm_client import (
    EXPLANATION_CACHE,
    _generate_fallback_explanation,
    _get_cache_key,
    get_explanation_async,
)


# ---------------------------------------------------------------------------
# _get_cache_key
# ---------------------------------------------------------------------------

class TestGetCacheKey:
    def test_basic_key_format(self):
        key = _get_cache_key("Hemoglobin", 8.2, "g/dL", 13.5, 17.5, "Critical")
        assert key == "hemoglobin:8.2:g/dl:13.5:17.5:critical"

    def test_value_rounded_to_3_decimals(self):
        key = _get_cache_key("Glucose", 105.12345, "mg/dL", 70.0, 100.0, "Warning")
        assert key == "glucose:105.123:mg/dl:70.0:100.0:warning"

    def test_strips_whitespace_and_lowercases(self):
        key1 = _get_cache_key("  Sodium  ", 138.0, "  mmol/L  ", 135.0, 145.0, "  Normal  ")
        key2 = _get_cache_key("Sodium", 138.0, "mmol/L", 135.0, 145.0, "Normal")
        assert key1 == key2

    def test_none_ref_values_included_in_key(self):
        key = _get_cache_key("Unknown Test", 5.0, "units", None, None, "Unknown")
        assert "none" in key.lower()

    def test_different_values_produce_different_keys(self):
        key1 = _get_cache_key("Glucose", 80.0, "mg/dL", 70.0, 100.0, "Normal")
        key2 = _get_cache_key("Glucose", 110.0, "mg/dL", 70.0, 100.0, "Warning")
        assert key1 != key2

    def test_different_tests_produce_different_keys(self):
        key1 = _get_cache_key("Sodium", 138.0, "mmol/L", 135.0, 145.0, "Normal")
        key2 = _get_cache_key("Potassium", 138.0, "mmol/L", 135.0, 145.0, "Normal")
        assert key1 != key2


# ---------------------------------------------------------------------------
# _generate_fallback_explanation
# ---------------------------------------------------------------------------

class TestGenerateFallbackExplanation:
    def test_normal_status(self):
        result = _generate_fallback_explanation("WBC", 7.5, "x10^9/L", 4.5, 11.0, "Normal")
        assert "explanation" in result
        assert "next_step" in result
        assert "WBC" in result["explanation"]
        assert "7.5" in result["explanation"]
        assert "normal" in result["explanation"].lower() or "within" in result["explanation"].lower()

    def test_warning_status_above(self):
        result = _generate_fallback_explanation("Glucose", 110.0, "mg/dL", 70.0, 100.0, "Warning")
        assert "above" in result["explanation"].lower()
        assert "Glucose" in result["explanation"]
        assert "110.0" in result["explanation"]

    def test_warning_status_below(self):
        result = _generate_fallback_explanation("Hemoglobin", 12.0, "g/dL", 13.5, 17.5, "Warning")
        assert "below" in result["explanation"].lower()

    def test_critical_status_elevated(self):
        result = _generate_fallback_explanation("Glucose", 450.0, "mg/dL", 70.0, 100.0, "Critical")
        assert "elevated" in result["explanation"].lower() or "severely" in result["explanation"].lower()
        assert "urgent" in result["next_step"].lower() or "specialist" in result["next_step"].lower()

    def test_critical_status_depressed(self):
        result = _generate_fallback_explanation("Hemoglobin", 6.5, "g/dL", 13.5, 17.5, "Critical")
        assert "depressed" in result["explanation"].lower() or "severely" in result["explanation"].lower()

    def test_unknown_status(self):
        result = _generate_fallback_explanation("Mystery", 5.0, "units", None, None, "Unknown")
        assert "unavailable" in result["explanation"].lower()
        assert "physician" in result["next_step"].lower() or "specialist" in result["next_step"].lower()

    def test_all_results_have_both_keys(self):
        for status in ["Normal", "Warning", "Critical", "Unknown"]:
            result = _generate_fallback_explanation("Test", 10.0, "u", 5.0, 15.0, status)
            assert "explanation" in result, f"Missing 'explanation' for status={status}"
            assert "next_step" in result, f"Missing 'next_step' for status={status}"


# ---------------------------------------------------------------------------
# get_explanation_async — Unknown status short-circuit
# ---------------------------------------------------------------------------

class TestGetExplanationAsync:
    @pytest.mark.anyio
    async def test_unknown_status_returns_without_api_call(self):
        """Unknown status must bypass cache and LLM, returning a fixed message."""
        result = await get_explanation_async("X", 0.0, "u", None, None, "Unknown")
        assert "explanation" in result
        assert "next_step" in result
        assert "unavailable" in result["explanation"].lower()

    @pytest.mark.anyio
    async def test_cache_hit_returned_immediately(self):
        key = _get_cache_key("Creatinine", 4.2, "mg/dL", 0.6, 1.2, "Critical")
        EXPLANATION_CACHE[key] = {
            "explanation": "Severely elevated creatinine indicates acute kidney injury.",
            "next_step": "Nephrology consultation required.",
        }
        result = await get_explanation_async("Creatinine", 4.2, "mg/dL", 0.6, 1.2, "Critical")
        assert result["explanation"] == "Severely elevated creatinine indicates acute kidney injury."
        assert "nephrology" in result["next_step"].lower()

    @pytest.mark.anyio
    async def test_cache_miss_returns_fallback_when_no_api(self, monkeypatch):
        """When the LLM raises, the function must return a valid fallback dict."""
        import app.services.llm_client as llm_mod

        async def _fake_generate(*args, **kwargs):
            raise RuntimeError("simulated LLM failure")

        monkeypatch.setattr(llm_mod.client.aio.models, "generate_content", _fake_generate)

        # Use a unique value to avoid hitting a pre-seeded cache entry
        result = await get_explanation_async("Sodium", 999.0, "mmol/L", 135.0, 145.0, "Critical")
        assert "explanation" in result
        assert "next_step" in result
