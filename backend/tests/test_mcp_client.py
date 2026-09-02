import asyncio

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    server_params = StdioServerParameters(
        command=r"D:\Dev\Python\Clinical Lab Results Analyzer\.venv\Scripts\python.exe",
        args=["mcp_server.py"],
    )
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            print("Available tools:", [t.name for t in tools.tools])

            result = await session.call_tool(
                "reference_range_lookup",
                arguments={"test_name": "Hemoglobin"},
            )
            print("Result:", result.content)


if __name__ == "__main__":
    asyncio.run(main())
