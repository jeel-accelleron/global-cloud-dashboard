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
import queue
import threading
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Generator, List, Optional

from pydantic import BaseModel, Field

from .azure_devops_service import AzureDevOpsService
from .utils.constants import (
    DEFAULT_AREA_PATH,
    DEFAULT_PROJECT,
    WIQL_BASE_SELECT,
    WIQL_FROM,
    get_base_wiql_condition,
)

logger = logging.getLogger(__name__)

# Default model. gpt-4.1 is free with a Copilot subscription (multiplier 0.0).
DEFAULT_MODEL = os.getenv("COPILOT_MODEL", "gpt-4.1")

# Hard timeout (seconds) for a single Copilot SDK call so Django request
# threads can't hang indefinitely if the upstream stalls.
COPILOT_CHAT_TIMEOUT = float(os.getenv("COPILOT_CHAT_TIMEOUT", "120"))
# Heartbeat interval (seconds) for SSE streaming so proxies don't time out
# while we wait for the SDK response.
COPILOT_STREAM_HEARTBEAT = float(os.getenv("COPILOT_STREAM_HEARTBEAT", "15"))


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

    def run(self, coro, timeout: Optional[float] = COPILOT_CHAT_TIMEOUT):
        """Schedule ``coro`` on the background loop and wait for its result.

        A timeout is enforced so Django worker threads can't hang forever if
        the SDK call stalls; on timeout we cancel the underlying task.
        """
        future = asyncio.run_coroutine_threadsafe(coro, self.loop)
        try:
            return future.result(timeout=timeout)
        except TimeoutError:
            future.cancel()
            raise TimeoutError(
                f"Copilot SDK call timed out after {timeout}s"
            )

    @classmethod
    def instance(cls) -> "_AsyncRunner":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
        return cls._instance


class QueryWorkItemsParams(BaseModel):
    work_item_type: Optional[str] = Field(
        default=None,
        description="Single type filter: Bug, Task, User Story, Feature, Epic, Issue.",
    )
    work_item_types: Optional[List[str]] = Field(
        default=None,
        description="Multiple types (OR). Use this OR work_item_type, not both.",
    )
    state: Optional[str] = Field(
        default=None,
        description="Single state filter: New, Active, Resolved, Closed, Removed, Done, In Progress.",
    )
    state_in: Optional[List[str]] = Field(
        default=None,
        description="States to include (OR). Example: ['Active','New','In Progress'].",
    )
    state_not_in: Optional[List[str]] = Field(
        default=None,
        description="States to exclude. Example: ['Closed','Resolved','Done','Removed'] for 'open items'.",
    )
    assigned_to: Optional[str] = Field(
        default=None, description="Single user email or display name."
    )
    assigned_to_in: Optional[List[str]] = Field(
        default=None, description="Multiple assignees (OR)."
    )
    unassigned: Optional[bool] = Field(
        default=None, description="If true, only items with no assignee."
    )
    priority_in: Optional[List[int]] = Field(
        default=None, description="Priority values to include (1=highest, 4=lowest)."
    )
    tags_contains: Optional[List[str]] = Field(
        default=None, description="Items whose tags contain ANY of these values."
    )
    iteration_path: Optional[str] = Field(
        default=None, description="Iteration path (UNDER match), e.g. sprint name."
    )
    due_before: Optional[str] = Field(
        default=None,
        description="DueDate strictly before this date (YYYY-MM-DD). Use '@today' for today.",
    )
    due_after: Optional[str] = Field(
        default=None,
        description="DueDate strictly after this date (YYYY-MM-DD).",
    )
    changed_after: Optional[str] = Field(
        default=None,
        description="Items changed on or after this date (YYYY-MM-DD).",
    )
    created_after: Optional[str] = Field(
        default=None,
        description="Items created on or after this date (YYYY-MM-DD).",
    )
    order_by: Optional[str] = Field(
        default="changed",
        description="Sort: 'changed' (default), 'created', 'due', 'priority', 'id'.",
    )
    top: int = Field(default=50, description="Max results (1-200).")


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


class GetWorkItemDetailsParams(BaseModel):
    ids: List[int] = Field(
        description=(
            "Work item IDs to fetch full details for. Pick these from a "
            "previous list/search result. Max 10 per call."
        )
    )


class FindOverdueParams(BaseModel):
    work_item_type: Optional[str] = Field(
        default=None, description="Optional type filter (Bug, Task, User Story, ...)."
    )
    assigned_to: Optional[str] = Field(
        default=None, description="Optional assignee filter."
    )
    top: int = Field(default=50, description="Max results (1-200).")


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

        # ---- WIQL helpers --------------------------------------------------

        def _q(value: str) -> str:
            """Escape a string for safe inclusion in a single-quoted WIQL literal."""
            return str(value).replace("'", "''")

        def _date_or_macro(value: str) -> str:
            v = (value or "").strip()
            if not v:
                return ""
            if v.lower() in ("@today", "today"):
                return "@Today"
            # WIQL date literal
            return f"'{_q(v)}'"

        ORDER_FIELDS = {
            "changed": "[System.ChangedDate] DESC",
            "created": "[System.CreatedDate] DESC",
            "due": "[Microsoft.VSTS.Scheduling.DueDate] ASC",
            "priority": "[Microsoft.VSTS.Common.Priority] ASC, [System.ChangedDate] DESC",
            "id": "[System.Id] ASC",
        }

        def _build_query_wiql(p: "QueryWorkItemsParams") -> str:
            parts: List[str] = [
                WIQL_BASE_SELECT,
                WIQL_FROM,
                f"WHERE {get_base_wiql_condition()}",
            ]
            # Type
            types = list(p.work_item_types or [])
            if p.work_item_type:
                types.append(p.work_item_type)
            if types:
                ors = " OR ".join(
                    f"[System.WorkItemType] = '{_q(t)}'" for t in types
                )
                parts.append(f"AND ({ors})")
            # State
            states_in = list(p.state_in or [])
            if p.state:
                states_in.append(p.state)
            if states_in:
                ors = " OR ".join(
                    f"[System.State] = '{_q(s)}'" for s in states_in
                )
                parts.append(f"AND ({ors})")
            if p.state_not_in:
                ands = " AND ".join(
                    f"[System.State] <> '{_q(s)}'" for s in p.state_not_in
                )
                parts.append(f"AND ({ands})")
            # Assignee
            assignees = list(p.assigned_to_in or [])
            if p.assigned_to:
                assignees.append(p.assigned_to)
            if assignees:
                ors = " OR ".join(
                    f"[System.AssignedTo] = '{_q(a)}'" for a in assignees
                )
                parts.append(f"AND ({ors})")
            if p.unassigned:
                parts.append("AND [System.AssignedTo] = ''")
            # Priority
            if p.priority_in:
                ors = " OR ".join(
                    f"[Microsoft.VSTS.Common.Priority] = {int(v)}"
                    for v in p.priority_in
                )
                parts.append(f"AND ({ors})")
            # Tags
            if p.tags_contains:
                ors = " OR ".join(
                    f"[System.Tags] CONTAINS '{_q(t)}'" for t in p.tags_contains
                )
                parts.append(f"AND ({ors})")
            # Iteration
            if p.iteration_path:
                parts.append(
                    f"AND [System.IterationPath] UNDER '{_q(p.iteration_path)}'"
                )
            # Dates
            if p.due_before:
                parts.append(
                    f"AND [Microsoft.VSTS.Scheduling.DueDate] < {_date_or_macro(p.due_before)}"
                )
            if p.due_after:
                parts.append(
                    f"AND [Microsoft.VSTS.Scheduling.DueDate] > {_date_or_macro(p.due_after)}"
                )
            if p.changed_after:
                parts.append(
                    f"AND [System.ChangedDate] >= {_date_or_macro(p.changed_after)}"
                )
            if p.created_after:
                parts.append(
                    f"AND [System.CreatedDate] >= {_date_or_macro(p.created_after)}"
                )
            order = ORDER_FIELDS.get(
                (p.order_by or "changed").lower(), ORDER_FIELDS["changed"]
            )
            parts.append(f"ORDER BY {order}")
            return " ".join(parts)

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
                # Azure DevOps stores planned dates under Microsoft.VSTS.Scheduling.*
                due = (
                    fields.get("Microsoft.VSTS.Scheduling.DueDate")
                    or fields.get("Microsoft.VSTS.Scheduling.TargetDate")
                    or fields.get("Microsoft.VSTS.Scheduling.FinishDate")
                )
                rows.append({
                    "id": item.get("id"),
                    "type": fields.get("System.WorkItemType"),
                    "state": fields.get("System.State"),
                    "title": (fields.get("System.Title") or "")[:120],
                    "assigned_to": assignee or "Unassigned",
                    "priority": fields.get("Microsoft.VSTS.Common.Priority"),
                    "start_date": (
                        fields.get("Microsoft.VSTS.Scheduling.StartDate") or ""
                    )[:10],
                    "due_date": (due or "")[:10],
                    "changed": (fields.get("System.ChangedDate") or "")[:10],
                    "tags": fields.get("System.Tags") or "",
                })
            payload = {"count": len(items), "showing": len(rows), "items": rows}
            return json.dumps(payload, default=str, separators=(",", ":"))

        @define_tool(
            description=(
                "Query Azure DevOps work items with rich filters (type, "
                "state include/exclude, assignee, priority, tags, iteration, "
                "due_before/due_after, changed_after, created_after, order_by). "
                "Always scoped to project "
                f"'{DEFAULT_PROJECT}' and area path '{DEFAULT_AREA_PATH}'. "
                "Use state_not_in=['Closed','Resolved','Done','Removed'] for "
                "'open items'. Use due_before='@today' + the same state_not_in "
                "for 'overdue items' (or call find_overdue_work_items)."
            ),
            skip_permission=True,
        )
        def query_work_items(params: QueryWorkItemsParams) -> str:
            try:
                wiql = _build_query_wiql(params)
                logger.info("query_work_items WIQL: %s", wiql)
                items = ado.query_work_items(
                    wiql_query=wiql, top=min(max(params.top, 1), 200)
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

        @define_tool(
            description=(
                "Find OVERDUE work items: DueDate is in the past AND state is "
                "NOT one of (Closed, Resolved, Done, Removed). Use this for "
                "'tasks whose finish date has passed but are not done', "
                "'overdue items', 'late tasks'. Optional filters: "
                "work_item_type, assigned_to."
            ),
            skip_permission=True,
        )
        def find_overdue_work_items(params: FindOverdueParams) -> str:
            try:
                parts: List[str] = [
                    WIQL_BASE_SELECT,
                    WIQL_FROM,
                    f"WHERE {get_base_wiql_condition()}",
                    "AND [Microsoft.VSTS.Scheduling.DueDate] < @Today",
                    "AND [System.State] <> 'Closed'",
                    "AND [System.State] <> 'Resolved'",
                    "AND [System.State] <> 'Done'",
                    "AND [System.State] <> 'Removed'",
                ]
                if params.work_item_type:
                    parts.append(
                        f"AND [System.WorkItemType] = '{_q(params.work_item_type)}'"
                    )
                if params.assigned_to:
                    parts.append(
                        f"AND [System.AssignedTo] = '{_q(params.assigned_to)}'"
                    )
                parts.append(
                    "ORDER BY [Microsoft.VSTS.Scheduling.DueDate] ASC"
                )
                wiql = " ".join(parts)
                logger.info("find_overdue WIQL: %s", wiql)
                items = ado.query_work_items(
                    wiql_query=wiql, top=min(max(params.top, 1), 200)
                )
                return _format(items)
            except Exception as exc:  # noqa: BLE001
                logger.exception("find_overdue_work_items failed")
                return f"Error finding overdue items: {exc}"

        @define_tool(
            description=(
                "Fetch ALL fields for one or more work items by ID. Use this "
                "after a list/search when you need attributes that aren't in "
                "the compact list (e.g. Description, AcceptanceCriteria, "
                "Iteration, Effort, Severity, Reason, history dates, custom "
                "fields). Limit to <=10 IDs per call."
            ),
            skip_permission=True,
        )
        def get_work_item_details(params: GetWorkItemDetailsParams) -> str:
            try:
                ids = list(params.ids)[:10]
                if not ids:
                    return "No IDs provided."
                items = ado.get_work_items_by_ids(ids)
                # Flatten and slim each item: keep id + every field, but
                # collapse identity dicts to display names and trim long
                # HTML descriptions so the payload stays small.
                slim: List[Dict[str, Any]] = []
                for item in items:
                    fields = item.get("fields", {}) if isinstance(item, dict) else {}
                    flat: Dict[str, Any] = {"id": item.get("id")}
                    for key, value in fields.items():
                        if isinstance(value, dict):
                            value = (
                                value.get("displayName")
                                or value.get("uniqueName")
                                or value
                            )
                        if isinstance(value, str) and len(value) > 800:
                            value = value[:800] + "\u2026"
                        flat[key] = value
                    slim.append(flat)
                return json.dumps(slim, default=str, separators=(",", ":"))
            except Exception as exc:  # noqa: BLE001
                logger.exception("get_work_item_details failed")
                return f"Error fetching work item details: {exc}"

        return [
            query_work_items,
            search_work_items,
            get_recent_updates,
            get_work_item_summary,
            find_overdue_work_items,
            get_work_item_details,
        ]

    async def _get_client(self):
        if self._client is None:
            self._client = self._CopilotClient()
            await self._client.start()
        return self._client

    @staticmethod
    def _system_message() -> str:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        return (
            "You are an Azure DevOps Work Items assistant for the "
            f"'{DEFAULT_PROJECT}' project, scoped to the area path "
            f"'{DEFAULT_AREA_PATH}'. Today's date is {today}.\n\n"
            "## Tools\n"
            "- query_work_items: rich filters (state_in, state_not_in, "
            "assigned_to_in, priority_in, tags_contains, iteration_path, "
            "due_before, due_after, changed_after, created_after, order_by, "
            "top). PREFER pushing filters into this tool over post-filtering.\n"
            "- find_overdue_work_items: shortcut for items past their due "
            "date and not closed. Use whenever the user asks about overdue / "
            "late / 'finish date passed but not done' items.\n"
            "- search_work_items: keyword search in titles only.\n"
            "- get_recent_updates: items changed in the last N days.\n"
            "- get_work_item_summary: counts grouped by state/type/assignee.\n"
            "- get_work_item_details(ids): full fields (Description, "
            "AcceptanceCriteria, Iteration, Effort, Severity, Reason, "
            "custom fields). Call this when the user wants details, "
            "description, history, or any field beyond the compact list.\n\n"
            "## Compact list schema (returned by list/search tools)\n"
            "id, type, state, title, assigned_to, priority, start_date, "
            "due_date, changed, tags. The payload also has count vs showing; "
            "if count > showing, mention 'showing first N of M'.\n\n"
            "## Vocabulary\n"
            "- 'open' / 'not done' = state_not_in=['Closed','Resolved','Done','Removed']\n"
            "- 'completed' / 'done' / 'finished' = state_in=['Closed','Resolved','Done']\n"
            "- 'high priority' = priority_in=[1,2]\n"
            "- 'this week' = changed_after = (today - 7 days)\n"
            "- 'overdue' = call find_overdue_work_items\n\n"
            "## Response style (Markdown)\n"
            "1. Start with a one-sentence summary (e.g. **5 overdue tasks**).\n"
            "2. If >3 items: render a Markdown table with columns "
            "`ID | Title | State | Assignee | Due`. Bold the ID.\n"
            "3. If \u22643 items: use a bullet list with **Title** then state, "
            "assignee, due_date.\n"
            "4. If the user asks for details on a specific item, fetch via "
            "get_work_item_details and use clear sub-headings (## Title, "
            "**State**, **Description**, **Acceptance Criteria**, etc.).\n"
            "5. Never dump raw JSON. Never invent fields you didn't see.\n"
            "6. If a tool returns zero items, say so plainly and suggest one "
            "concrete refinement."
        )

    async def _get_session(self, session_id: str):
        # Fast path: existing session lookup is cheap; guard the dict only
        # for the read so we don't race with concurrent create/remove.
        with self._sessions_lock:
            session = self._sessions.get(session_id)
        if session is not None:
            return session

        # Create the session outside the lock — `create_session` performs
        # network I/O and we don't want to serialize all chat traffic.
        client = await self._get_client()

        async def on_permission(_request):
            return True

        session = await client.create_session(
            model=DEFAULT_MODEL,
            tools=self._tools,
            system_message={"content": self._system_message()},
            on_permission_request=on_permission,
        )

        # Register the new session, but if a concurrent caller beat us to it
        # keep the existing one and discard ours so we don't leak resources.
        with self._sessions_lock:
            existing = self._sessions.get(session_id)
            if existing is not None:
                session_to_return = existing
                session_to_discard = session
            else:
                self._sessions[session_id] = session
                session_to_return = session
                session_to_discard = None

        if session_to_discard is not None:
            try:
                await session_to_discard.disconnect()
            except Exception:  # noqa: BLE001
                logger.exception("Failed to disconnect duplicate session")

        return session_to_return

    async def _chat_async(self, session_id: str, message: str) -> str:
        session = await self._get_session(session_id)
        result = await session.send_and_wait(message, timeout=120.0)
        if result is None:
            return "(no response)"
        content = getattr(result.data, "content", None)
        return content or "(empty response)"

    async def _clear_async(self, session_id: str) -> None:
        with self._sessions_lock:
            session = self._sessions.pop(session_id, None)
        if session is not None:
            try:
                await session.disconnect()
            except Exception:  # noqa: BLE001
                logger.exception("Failed to disconnect session %s", session_id)

    def chat(self, message: str, session_id: str = "default") -> Dict[str, Any]:
        # Lock is held only inside _get_session for the dict ops; the long
        # send_and_wait call runs without holding _sessions_lock so other
        # sessions and clear_session aren't blocked.
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

        The Copilot SDK doesn't expose token-level streaming yet, so we run
        the blocking ``chat`` call in a worker thread and emit SSE comment
        heartbeats while waiting. This keeps proxies from timing out and
        gives the frontend a steady byte stream until the final content +
        done events are flushed.
        """
        result_q: "queue.Queue[tuple[str, Any]]" = queue.Queue(maxsize=1)

        def _worker() -> None:
            try:
                result_q.put(("ok", self.chat(message, session_id=session_id)))
            except Exception as exc:  # noqa: BLE001
                logger.exception("chat_stream worker failed")
                result_q.put(("err", exc))

        worker = threading.Thread(
            target=_worker, name=f"copilot-chat-{session_id[:8]}", daemon=True
        )
        worker.start()

        deadline = time.monotonic() + COPILOT_CHAT_TIMEOUT
        while True:
            try:
                kind, payload = result_q.get(timeout=COPILOT_STREAM_HEARTBEAT)
                break
            except queue.Empty:
                if time.monotonic() >= deadline:
                    yield (
                        f"data: {json.dumps({'error': 'Copilot SDK call timed out', 'session_id': session_id})}\n\n"
                    )
                    return
                # SSE comment line — keeps the connection alive without
                # being delivered as a message event to the client.
                yield ": keep-alive\n\n"

        if kind == "err":
            yield f"data: {json.dumps({'error': str(payload), 'session_id': session_id})}\n\n"
            return

        result = payload
        effective_session_id = result["session_id"]
        yield (
            f"data: {json.dumps({'content': result['message'], 'session_id': effective_session_id})}\n\n"
        )
        yield (
            f"data: {json.dumps({'done': True, 'session_id': effective_session_id})}\n\n"
        )

    def clear_session(self, session_id: str) -> None:
        # _clear_async takes _sessions_lock only for the pop().
        self._runner.run(self._clear_async(session_id))
