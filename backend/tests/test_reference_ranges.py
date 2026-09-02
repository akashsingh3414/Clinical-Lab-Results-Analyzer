"""Tests for app.services.reference_ranges — normalize_name, build_reference_lookup_payload,
and the HARDCODED_RANGES data itself."""

import pytest
from app.services.reference_ranges import (
    HARDCODED_RANGES,
    build_reference_lookup_payload,
    normalize_name,
)


# ---------------------------------------------------------------------------
# normalize_name
# ---------------------------------------------------------------------------

class TestNormalizeName:
    def test_lowercases(self):
        assert normalize_name("Hemoglobin") == "hemoglobin"

    def test_strips_whitespace(self):
        assert normalize_name("  sodium  ") == "sodium"

    def test_replaces_underscores_with_space(self):
        assert normalize_name("blood_glucose") == "blood glucose"

    def test_replaces_hyphens_with_space(self):
        assert normalize_name("creatinine-kinase") == "creatinine kinase"

    def test_replaces_slash_with_space(self):
        assert normalize_name("AST/ALT") == "ast alt"

    def test_collapses_multiple_spaces(self):
        assert normalize_name("  white  blood  cell  ") == "white blood cell"

    def test_strips_special_characters(self):
        # Special chars other than a-z0-9, spaces, and () should be removed
        assert normalize_name("HDL!@#Cholesterol") == "hdlcholesterol"

    def test_preserves_parentheses(self):
        # Parentheses are explicitly allowed by the regex
        assert normalize_name("T4 (Free)") == "t4 (free)"

    def test_empty_string(self):
        assert normalize_name("") == ""

    def test_all_special_chars_removed(self):
        assert normalize_name("!!!") == ""


# ---------------------------------------------------------------------------
# HARDCODED_RANGES data integrity
# ---------------------------------------------------------------------------

class TestHardcodedRanges:
    EXPECTED_KEYS = [
        "hemoglobin", "glucose", "wbc", "sodium", "potassium",
        "creatinine", "cholesterol", "ldl", "hdl", "triglycerides",
    ]

    def test_all_expected_keys_present(self):
        for key in self.EXPECTED_KEYS:
            assert key in HARDCODED_RANGES, f"Missing key: {key}"

    def test_all_entries_have_low_high_unit(self):
        for name, ref in HARDCODED_RANGES.items():
            assert "low" in ref, f"{name} missing 'low'"
            assert "high" in ref, f"{name} missing 'high'"
            assert "unit" in ref, f"{name} missing 'unit'"

    def test_low_less_than_high(self):
        for name, ref in HARDCODED_RANGES.items():
            assert ref["low"] <= ref["high"], (
                f"{name}: low ({ref['low']}) is not <= high ({ref['high']})"
            )

    # Spot-check a few clinical reference values
    def test_hemoglobin_range(self):
        ref = HARDCODED_RANGES["hemoglobin"]
        assert ref["low"] == 13.5
        assert ref["high"] == 17.5
        assert ref["unit"] == "g/dL"

    def test_glucose_range(self):
        ref = HARDCODED_RANGES["glucose"]
        assert ref["low"] == 70
        assert ref["high"] == 100
        assert ref["unit"] == "mg/dL"

    def test_potassium_range(self):
        ref = HARDCODED_RANGES["potassium"]
        assert ref["low"] == 3.5
        assert ref["high"] == 5.1
        assert ref["unit"] == "mmol/L"

    def test_wbc_range(self):
        ref = HARDCODED_RANGES["wbc"]
        assert ref["low"] == 4.5
        assert ref["high"] == 11.0


# ---------------------------------------------------------------------------
# build_reference_lookup_payload
# ---------------------------------------------------------------------------

class TestBuildReferenceLookupPayload:
    def test_valid_ref_returns_floats(self):
        raw = {"low": "13.5", "high": "17.5", "unit": "g/dL"}
        result = build_reference_lookup_payload(raw)
        assert result == {"low": 13.5, "high": 17.5, "unit": "g/dL"}
        assert isinstance(result["low"], float)
        assert isinstance(result["high"], float)

    def test_none_input_returns_none(self):
        assert build_reference_lookup_payload(None) is None

    def test_error_dict_passes_through(self):
        err = {"error": "test not found"}
        result = build_reference_lookup_payload(err)
        assert result == err

    def test_missing_unit_defaults_to_empty_string(self):
        raw = {"low": 70.0, "high": 100.0}
        result = build_reference_lookup_payload(raw)
        assert result["unit"] == ""

    def test_integer_low_high_cast_to_float(self):
        raw = {"low": 70, "high": 100, "unit": "mg/dL"}
        result = build_reference_lookup_payload(raw)
        assert result["low"] == 70.0
        assert result["high"] == 100.0
