import asyncio
import json
from contextlib import AsyncExitStack
from typing import Any

from app.config import BACKEND_DIR, get_python_executable
from app.logging_config import logger
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client



class MCPClientSingleton:
    _instance: "MCPClientSingleton | None" = None

    def __init__(self):
        self.session: ClientSession | None = None
        self._stack = AsyncExitStack()

    @classmethod
    def get(cls) -> "MCPClientSingleton":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def connect(self) -> None:
        if self.session is not None:
            logger.info("MCP session already active; reusing existing singleton connection")
            return

        logger.info("Starting MCP server connection")
        try:
            server_params = StdioServerParameters(
                command=get_python_executable(),
                args=["mcp_server.py"],
                cwd=str(BACKEND_DIR),
            )
            read, write = await asyncio.wait_for(
                self._stack.enter_async_context(stdio_client(server_params)),
                timeout=5.0,
            )
            self.session = await self._stack.enter_async_context(ClientSession(read, write))
            await asyncio.wait_for(self.session.initialize(), timeout=5.0)
            logger.info("MCP session established")
        except Exception as exc:
            logger.warning(f"Could not connect to MCP server: {exc}")
            self.session = None

    async def close(self) -> None:
        logger.info("Closing MCP session")
        try:
            await self._stack.aclose()
        except Exception:
            pass
        self.session = None
        logger.info("MCP session closed")

    async def call_reference_lookup(self, test_name: str) -> dict[str, Any] | None:
        if self.session is None:
            try:
                await self.connect()
            except Exception:
                return None

        if self.session is None:
            return None

        try:
            result = await asyncio.wait_for(
                self.session.call_tool(
                    "reference_range_lookup",
                    arguments={"test_name": test_name},
                ),
                timeout=3.0,
            )
            payload = result.content[0].text if getattr(result, "content", None) else "{}"
            return json.loads(payload)
        except Exception as exc:
            logger.error(f"MCP lookup failed for {test_name}: {exc}")
            return None

