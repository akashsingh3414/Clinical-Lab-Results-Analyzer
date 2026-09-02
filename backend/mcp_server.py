import asyncio
import csv
import re
from pathlib import Path

from mcp.server.mcpserver import MCPServer

server = MCPServer("lab-tools")

DATA_PATH = Path(__file__).resolve().parent / "data" / "lab_test_results_public.csv"


def normalize_name(name: str) -> str:
    value = name.strip().lower()
    value = value.replace("_", " ")
    value = value.replace("-", " ")
    value = value.replace("/", " ")
    value = re.sub(r"[^a-z0-9\s()]+", "", value)
    value = " ".join(value.split())
    return value


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


REFERENCE_RANGES = load_reference_ranges()


@server.tool()
def reference_range_lookup(test_name: str) -> dict:
    """Look up the normal reference range for a given lab test name from the dataset."""
    key = normalize_name(test_name)
    if key in REFERENCE_RANGES:
        return REFERENCE_RANGES[key]

    return {"error": f"No reference range found for '{test_name}'"}


if __name__ == "__main__":
    asyncio.run(server.run_stdio_async())
