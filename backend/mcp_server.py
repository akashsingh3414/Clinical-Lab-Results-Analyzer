import asyncio

from mcp.server.mcpserver import MCPServer

server = MCPServer("lab-tools")

REFERENCE_RANGES = {
    "hemoglobin": {"low": 13.5, "high": 17.5, "unit": "g/dL"},
    "glucose": {"low": 70, "high": 100, "unit": "mg/dL"},
    "wbc": {"low": 4.5, "high": 11.0, "unit": "x10^9/L"},
}


@server.tool()
def reference_range_lookup(test_name: str) -> dict:
    """Look up the normal reference range for a given lab test name."""
    key = test_name.strip().lower()
    if key in REFERENCE_RANGES:
        return REFERENCE_RANGES[key]
    return {"error": f"No reference range found for '{test_name}'"}


if __name__ == "__main__":
    asyncio.run(server.run_stdio_async())
