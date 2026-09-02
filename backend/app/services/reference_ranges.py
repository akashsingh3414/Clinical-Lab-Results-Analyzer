import csv
import re
from pathlib import Path
from typing import Any

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "lab_test_results_public.csv"

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


def normalize_name(name: str) -> str:
    value = name.strip().lower()
    value = value.replace("_", " ")
    value = value.replace("-", " ")
    value = value.replace("/", " ")
    value = re.sub(r"[^a-z0-9\s()]+", "", value)
    return " ".join(value.split())


def load_reference_ranges() -> dict[str, dict[str, float | str]]:
    ranges: dict[str, dict[str, float | str]] = {}
    if not DATA_PATH.exists():
        return ranges

    with DATA_PATH.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            test_name = (row.get("Test_Name") or "").strip()
            if not test_name:
                continue

            min_ref = (row.get("Min_Reference") or "").strip()
            max_ref = (row.get("Max_Reference") or "").strip()
            if not min_ref or not max_ref:
                continue

            try:
                low = float(min_ref)
                high = float(max_ref)
            except ValueError:
                continue

            unit = (row.get("Unit") or row.get("Unit_Description") or "").strip()
            key = normalize_name(test_name)
            ranges[key] = {"low": low, "high": high, "unit": unit}

    return ranges


def build_reference_lookup_payload(reference: dict[str, Any] | None) -> dict[str, Any] | None:
    if reference is None or "error" in reference:
        return reference
    return {
        "low": float(reference.get("low")),
        "high": float(reference.get("high")),
        "unit": reference.get("unit", ""),
    }
