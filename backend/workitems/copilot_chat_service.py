"""
GitHub Copilot SDK Chat Service for Work Items Insights
Provides natural language interface to Azure DevOps Work Items.

The Copilot SDK is async-only. We run a single background event loop in a
dedicated thread; Django (sync) views use ``run_coroutine_threadsafe`` to
schedule work on it. One ``CopilotClient`` is shared across all sessions.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import threading
from datetime import datetime, timedelta
from typing import Any, Dict, Generator, List, Optional

from pydantic import BaseModel, Field

from .azure_devops_service import AzureDevOpsService
from .utils.constants import DEFAULT_AREA_PATH, DEFAULT_PROJECT

logger = logging.getLogger(__name__)

# Default model. gpt-4.1 is free with a Copilot subscription (multiplier 0.0).
DEFAULT_MODEL = os.getenv("COPILOT_MODEL", "gpt-4.1")


class _AsyncRunner:
    """Owns a long-lived asyncio loop running in a background thread."""

    _instance: Optional["_AsyncRunner"] = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(
            target=self._run_loop, name="copilot-asyncio", daemon=True
        )
        self.thread.start()

    def _run_loop(self) -> None:
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()

    def run(self, coro):
        future = asyncio.run_coroutine_threadsafe(coro, self.loop)
        return future.result()

    @classmethod
    def instance(cls) -> "_AsyncRunner":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
        return cls._instance


class QueryWorkItemsParams(BaseModel):
    work_item_type: Optional[str] = Field(
        default=None,
        description="Type filter: Bug, Task, User Story, Feature, Epic, Issue.",
    )
    state: Optional[str] = Field(
        default=None,
        description="State filter: New, Active, Resolved, Closed, Removed.",
    )
    assigned_to: Optional[str] = Field(
        default=None, description="User email or display name."
    )
    top: int = Field(default=50, description="Max number of results (1-200).")


class SearchWorkItemsParams(BaseModel):
    search_text: str = Field(description="Text to search for in work item titles.")
    work_item_type: Optional[str] = Field(
        default=None, description="Optional work item type filter."
    )
    top: int = Field(default=50, description="Max number of results (1-200).")


class GetRecentUpdatesParams(BaseModel):
    days_ago: int = Field(
        default=7,
        description=(
            "Look back this many days. Use 1 for 'today', 7 for 'last week', "
            "30 for 'last month'."
        ),
    )
    work_item_type: Optional[str] = Field(
        default=None, description="Optional work item type filter."
    )
    top: int = Field(default=50, description="Max number of results (1-200).")


class WorkItemSummaryParams(BaseModel):
    group_by: str = Field(
        default="state",
        description="Group counts by: 'state', 'type', or 'assignee'.",
    )


class CopilotChatService:
    """Natural-language chat over Azure DevOps work items via Copilot SDK."""

    _instance: Optional["CopilotChatService"] = None
    _instance_lock = threading.Lock()

    def __init__(self) -> None:
        try:
            from copilot import CopilotClient, define_tool  # noqa: F401
        except ImportError as exc:
            raise ImportError(
                "GitHub Copilot SDK not installed. Run: uv add github-copilot-sdk"
            ) from exc

        if not os.getenv("GITHUB_TOKEN"):
            raise ValueError("GITHUB_TOKEN not found in environment variables")

        self._CopilotClient = CopilotClient
        self._define_tool = define_tool
        self._ado = AzureDevOpsService()
        self._runner = _AsyncRunner.instance()
        self._client = None
        self._sessions: Dict[str, Any] = {}
        self._sessions_lock = threading.Lock()
        self._tools = self._build_tools()

    @classmethod
    def get_instance(cls) -> "CopilotChatService":
        with cls._instance_lock:
            if cls._instance is None:
                cls._instance = cls()
        return cls._instance

    def _build_tools(self) -> list:
        ado = self._ado
        define_tool = self._define_tool

        def _format(items: List[Dict]) -> str:
            if not items:
                return "No work items found matching the criteria."
            # Return a compact list. Copilot CLI auto-pages large tool
            # outputs to disk and then can't read them back, so keep this
            # short and structured (no pretty-printed JSON).
            rows: List[Dict[str, Any]] = []
            for item in items[:25]:
                fields = item.get("fields", {}) if isinstance(item, dict) else {}
                assignee = fields.get("System.AssignedTo")
                if isinstance(assignee, dict):
                    assignee = assignee.get("displayName") or assignee.get(
                        "uniqueName"
                    )
                rows.append({
                    "id": item.get("id"),
                    "type": fields.get("System.WorkItemType"),
                    "state": fields.get("System.State"),
                    "title": (fields.get("System.Title") or "")[:120],
                    "assigned_to": assignee or "Unassigned",
                    "changed": (fields.get("System.ChangedDate") or "")[:10],
                })
            payload = {"count": len(items), "showing": len(rows), "items": rows}
            return json.dumps(payload, default=str, separators=(",", ":"))

        @define_tool(
            description=(
                "Query Azure DevOps work items with filters. Results are "
                f"automatically scoped to project '{DEFAULT_PROJECT}' and area "
                f"path '{DEFAULT_AREA_PATH}'."
            ),
            skip_permission=True,
        )
        def query_work_items(params: QueryWorkItemsParams) -> str:
            try:
                items = ado.get_work_items_by_type(
                    work_item_type=params.work_item_type,
                    state=params.state,
                    assigned_to=params.assigned_to,
                    top=min(max(params.top, 1), 200),
                )
                return _format(items)
            except Exception as exc:  # noqa: BLE001
                logger.exception("query_work_items failed")
                return f"Error querying work items: {exc}"

        @define_tool(
            description="Search work items by text in their title.",
            skip_permission=True,
        )
        def search_work_items(params: SearchWorkItemsParams) -> str:
            try:
                types = [params.work_item_type] if params.work_item_type else None
                items = ado.search_work_items(
                    search_text=params.search_text,
                    work_item_types=types,
                    top=min(max(params.top, 1), 200),
                )
                return _format(items)
            except Exception as exc:  # noqa: BLE001
                logger.exception("search_work_items failed")
                return f"Error searching work items: {exc}"

        @define_tool(
            description=(
                "Get work items updated within the last N days. Use this for "
                "questions like 'updated today', 'last week', 'this month', "
                "or 'completed last week'."
            ),
            skip_permission=True,
        )
        def get_recent_updates(params: GetRecentUpdatesParams) -> str:
            try:
                since = (
                    datetime.utcnow() - timedelta(days=max(params.days_ago, 0))
                ).strftime("%Y-%m-%d")
                items = ado.get_work_items_updated_since(
                    since_date=since,
                    work_item_type=params.work_item_type,
                    top=min(max(params.top, 1), 200),
                )
                return _format(items)
            except Exception as exc:  # noqa: BLE001
                logger.exception("get_recent_updates failed")
                return f"Error fetching recent updates: {exc}"

        @define_tool(
            description=(
                "Get aggregate counts of work items grouped by state, type, "
                "or assignee."
            ),
            skip_permission=True,
        )
        def get_work_item_summary(params: WorkItemSummaryParams) -> str:
            try:
                items = ado.get_work_items_by_type(top=200)
                key_map = {
                    "state": "System.State",
                    "type": "System.WorkItemType",
                    "assignee": "System.AssignedTo",
                }
                key = key_map.get(params.group_by.lower(), "System.State")
                counts: Dict[str, int] = {}
                for item in items:
                    fields = item.get("fields", {}) if isinstance(item, dict) else {}
                    value = fields.get(key) or "Unassigned"
                    if isinstance(value, dict):
                        value = (
                            value.get("displayName")
                            or value.get("uniqueName")
                            or "Unknown"
                        )
                    counts[str(value)] = counts.get(str(value), 0) + 1
                return json.dumps(
                    {
                        "group_by": params.group_by,
                        "total": len(items),
                        "counts": counts,
                    },
                    indent=2,
                )
            except Exception as exc:  # noqa: BLE001
                logger.exception("get_work_item_summary failed")
                return f"Error generating summary: {exc}"

        return [
            query_work_items,
            search_work_items,
            get_recent_updates,
            get_work_item_summary,
        ]

    async def _get_client(self):
        if self._client is None:
            self._client = self._CopilotClient()
            await self._client.start()
        return self._client

    @staticmethod
    def _system_message() -> str:
        return (
            "You are an Azure DevOps Work Items assistant for the "
            f"'{DEFAULT_PROJECT}' project, scoped to the "
            f"'{DEFAULT_AREA_PATH}' area path. Use the provided tools to "
            "answer questions about bugs, tasks, user stories, features and "
            "their states. Today's date is "
            f"{datetime.utcnow().strftime('%Y-%m-%d')}. When the user asks "
            "about 'today', 'last week', 'this month', etc., translate that "
            "into the days_ago parameter for get_recent_updates. For "
            "'completed' work items, treat that as state='Closed' or "
            "state='Resolved'. Reply in concise natural language and "
            "summarise results; do not dump raw JSON unless explicitly "
            "requested."
        )

    async def _get_session(self, session_id: str):
        if session_id in self._sessions:
            return self._sessions[session_id]

        client = await self._get_client()

        async def on_permission(_request):
            return True

        session = await client.create_session(
            model=DEFAULT_MODEL,
            tools=self._tools,
            system_message={"content": self._system_message()},
            on_permission_request=on_permission,
        )
        self._sessions[session_id] = session
        return session

    async def _chat_async(self, session_id: str, message: str) -> str:
        session = await self._get_session(session_id)
        result = await session.send_and_wait(message, timeout=120.0)
        if result is None:
            return "(no response)"
        content = getattr(result.data, "content", None)
        return content or "(empty response)"

    async def _clear_async(self, session_id: str) -> None:
        session = self._sessions.pop(session_id, None)
        if session is not None:
            try:
                await session.disconnect()
            except Exception:  # noqa: BLE001
                logger.exception("Failed to disconnect session %s", session_id)

    def chat(self, message: str, session_id: str = "default") -> Dict[str, Any]:
        with self._sessions_lock:
            content = self._runner.run(self._chat_async(session_id, message))
        return {
            "session_id": session_id,
            "message": content,
            "model": DEFAULT_MODEL,
        }

    def chat_stream(
        self, message: str, session_id: str = "default"
    ) -> Generator[str, None, None]:
        """Yield the assistant reply as SSE chunks.

        The Copilot SDK supports event streaming, but for this initial
        integration we yield the final content as a single chunk so the
        existing frontend keeps working.
        """
        try:
            result = self.chat(message, session_id=session_id)
            yield f"data: {json.dumps({'content': result['message']})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as exc:  # noqa: BLE001
            logger.exception("chat_stream failed")
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    def clear_session(self, session_id: str) -> None:
        with self._sessions_lock:
            self._runner.run(self._clear_async(session_id))
