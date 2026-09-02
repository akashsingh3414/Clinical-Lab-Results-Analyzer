"""Strengthened tests for determine_status boundary/edge cases, and identity-level
assertions for classify_node / route_node that verify *which* result lands in
*which* bucket — not just counts."""

import pytest
from app.workflows.lab_pipeline import classify_node, determine_status, route_node


# ---------------------------------------------------------------------------
# determine_status — exhaustive boundary coverage
# ---------------------------------------------------------------------------

class TestDetermineStatusBoundaries:
    """Hemoglobin range: low=13.5, high=17.5  (span = 4.0)
    Warning threshold: deviation > 0%  but <= 20% of span (0.8 g/dL)
    Critical threshold: deviation > 20% of span (> 0.8 g/dL)
    """

    # ── Normal boundaries ────────────────────────────────────────────────
    def test_exactly_at_low_boundary_is_normal(self):
        assert determine_status(13.5, 13.5, 17.5) == "Normal"

    def test_exactly_at_high_boundary_is_normal(self):
        assert determine_status(17.5, 13.5, 17.5) == "Normal"

    def test_midpoint_is_normal(self):
        assert determine_status(15.0, 13.5, 17.5) == "Normal"

    # ── Warning — slight elevation above high ────────────────────────────
    def test_slight_elevation_above_high_is_warning(self):
        # 18.0 - 17.5 = 0.5 → pct = 0.5/4.0 = 0.125 → Warning
        assert determine_status(18.0, 13.5, 17.5) == "Warning"

    # ── Critical — severe elevation above high ───────────────────────────
    def test_severe_elevation_above_high_is_critical(self):
        # 18.5 - 17.5 = 1.0 → pct = 1.0/4.0 = 0.25 > 0.2 → Critical
        assert determine_status(18.5, 13.5, 17.5) == "Critical"

    # ── Warning — slight drop below low ─────────────────────────────────
    def test_slight_drop_below_low_is_warning(self):
        # 13.5 - 13.2 = 0.3 → pct = 0.3/4.0 = 0.075 → Warning
        assert determine_status(13.2, 13.5, 17.5) == "Warning"

    # ── Critical — severe drop below low ────────────────────────────────
    def test_severe_drop_below_low_is_critical(self):
        # 13.5 - 8.0 = 5.5 → pct = 5.5/4.0 = 1.375 → Critical
        assert determine_status(8.0, 13.5, 17.5) == "Critical"

    # ── Unknown inputs ───────────────────────────────────────────────────
    def test_none_value_is_unknown(self):
        assert determine_status(None, 10.0, 20.0) == "Unknown"

    def test_negative_value_is_unknown(self):
        assert determine_status(-5.0, 10.0, 20.0) == "Unknown"

    def test_none_ref_low_is_unknown(self):
        assert determine_status(15.0, None, 17.5) == "Unknown"

    def test_none_ref_high_is_unknown(self):
        assert determine_status(15.0, 13.5, None) == "Unknown"

    def test_both_refs_none_is_unknown(self):
        assert determine_status(15.0, None, None) == "Unknown"

    # ── Glucose range spot-checks (low=70, high=100, span=30) ────────────
    def test_glucose_normal(self):
        assert determine_status(95.0, 70.0, 100.0) == "Normal"

    def test_glucose_warning_above(self):
        # 105 - 100 = 5 → pct = 5/30 = 0.167 → Warning
        assert determine_status(105.0, 70.0, 100.0) == "Warning"

    def test_glucose_critical_above(self):
        # 450 - 100 = 350 → pct = 350/30 = 11.67 → Critical
        assert determine_status(450.0, 70.0, 100.0) == "Critical"

    def test_glucose_critical_below(self):
        # 70 - 40 = 30 → pct = 30/30 = 1.0 → Critical
        assert determine_status(40.0, 70.0, 100.0) == "Critical"

    # ── Potassium (low=3.5, high=5.1, span=1.6) ─────────────────────────
    def test_potassium_normal(self):
        assert determine_status(4.2, 3.5, 5.1) == "Normal"

    def test_potassium_critical_high(self):
        # 6.8 - 5.1 = 1.7 → pct = 1.7/1.6 = 1.06 → Critical
        assert determine_status(6.8, 3.5, 5.1) == "Critical"

    # ── Zero-span guard (max span=1.0 prevents division by zero) ─────────
    def test_zero_span_does_not_raise(self):
        # Same low and high — span forced to 1.0 in code
        result = determine_status(5.5, 5.0, 5.0)
        assert result in {"Normal", "Warning", "Critical", "Unknown"}


# ---------------------------------------------------------------------------
# classify_node + route_node — identity-level assertions
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_classify_node_identifies_critical_hemoglobin():
    """Hemoglobin 6.5 g/dL is severely below normal (13.5-17.5) → Critical."""
    state = {"raw_results": [{"test_name": "Hemoglobin", "value": 6.5, "unit": "g/dL"}]}
    result = await classify_node(state)
    hgb = result["classified"][0]
    assert hgb["test_name"] == "Hemoglobin"
    assert hgb["status"] == "Critical"
    assert hgb["ref_low"] == 13.5
    assert hgb["ref_high"] == 17.5


@pytest.mark.anyio
async def test_classify_node_identifies_normal_wbc():
    """WBC 7.5 x10^9/L is within normal (4.5-11.0) → Normal."""
    state = {"raw_results": [{"test_name": "WBC", "value": 7.5, "unit": "x10^9/L"}]}
    result = await classify_node(state)
    wbc = result["classified"][0]
    assert wbc["status"] == "Normal"
    assert wbc["ref_low"] == 4.5
    assert wbc["ref_high"] == 11.0


@pytest.mark.anyio
async def test_classify_node_identifies_warning_glucose():
    """Glucose 105 mg/dL is slightly above normal (70-100) → Warning."""
    state = {"raw_results": [{"test_name": "Glucose", "value": 105, "unit": "mg/dL"}]}
    result = await classify_node(state)
    glc = result["classified"][0]
    assert glc["status"] == "Warning"


@pytest.mark.anyio
async def test_classify_node_missing_test_name_is_unknown():
    """Empty test_name must produce an Unknown status entry."""
    state = {"raw_results": [{"test_name": "", "value": 50, "unit": "mg/dL"}]}
    result = await classify_node(state)
    entry = result["classified"][0]
    assert entry["status"] == "Unknown"


@pytest.mark.anyio
async def test_classify_node_none_value_is_unknown():
    """None value must produce Unknown and not raise."""
    state = {"raw_results": [{"test_name": "Sodium", "value": None, "unit": "mmol/L"}]}
    result = await classify_node(state)
    assert result["classified"][0]["status"] == "Unknown"


@pytest.mark.anyio
async def test_classify_node_negative_value_is_unknown():
    state = {"raw_results": [{"test_name": "Sodium", "value": -10, "unit": "mmol/L"}]}
    result = await classify_node(state)
    assert result["classified"][0]["status"] == "Unknown"


@pytest.mark.anyio
async def test_route_node_segregates_by_status():
    """route_node must place each result in the correct bucket by name."""
    pre_classified = {
        "classified": [
            {"test_name": "Hemoglobin", "value": 6.5,  "unit": "g/dL",    "status": "Critical"},
            {"test_name": "Glucose",    "value": 105.0, "unit": "mg/dL",   "status": "Warning"},
            {"test_name": "WBC",        "value": 7.5,   "unit": "x10^9/L", "status": "Normal"},
            {"test_name": "",           "value": 50.0,  "unit": "mg/dL",   "status": "Unknown"},
        ]
    }
    result = await route_node(pre_classified)
    routed = result["routed"]

    critical_names = [r["test_name"] for r in routed["Critical"]]
    warning_names  = [r["test_name"] for r in routed["Warning"]]
    normal_names   = [r["test_name"] for r in routed["Normal"]]
    unknown_names  = [r["test_name"] for r in routed["Unknown"]]

    assert "Hemoglobin" in critical_names
    assert "Glucose"    in warning_names
    assert "WBC"        in normal_names
    assert ""           in unknown_names


@pytest.mark.anyio
async def test_route_node_empty_input_returns_empty_buckets():
    result = await route_node({"classified": []})
    routed = result["routed"]
    assert routed["Critical"] == []
    assert routed["Warning"]  == []
    assert routed["Normal"]   == []
    assert routed["Unknown"]  == []


@pytest.mark.anyio
async def test_full_classify_then_route_pipeline():
    """End-to-end: classify then route a batch and verify identities."""
    state = {
        "raw_results": [
            {"test_name": "Hemoglobin", "value": 6.5,  "unit": "g/dL"},     # Critical
            {"test_name": "Glucose",    "value": 95.0,  "unit": "mg/dL"},    # Normal
            {"test_name": "Potassium",  "value": 6.8,   "unit": "mmol/L"},   # Critical
            {"test_name": "WBC",        "value": 18.0,  "unit": "x10^9/L"},  # Critical (>20% above)
            {"test_name": "",           "value": 1.0,   "unit": ""},          # Unknown
        ]
    }
    classified_state = await classify_node(state)
    routed_state = await route_node(classified_state)
    routed = routed_state["routed"]

    critical_names = [r["test_name"] for r in routed["Critical"]]
    normal_names   = [r["test_name"] for r in routed["Normal"]]

    assert "Hemoglobin" in critical_names
    assert "Potassium"  in critical_names
    assert "Glucose"    in normal_names
    assert len(routed["Unknown"]) == 1
