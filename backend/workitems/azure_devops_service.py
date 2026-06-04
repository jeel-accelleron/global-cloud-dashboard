"""
Azure DevOps Service for interacting with Work Items
"""
from azure.devops.connection import Connection
from msrest.authentication import BasicAuthentication
from django.conf import settings
from typing import Optional, List, Dict
import logging

from .utils.constants import (
    AZURE_DEVOPS_ORG_URL,
    AZURE_DEVOPS_PAT,
    AZURE_DEVOPS_PROJECT,
    DEFAULT_PROJECT,
    DEFAULT_AREA_PATH,
    DEFAULT_TOP_LIMIT,
    DEFAULT_SEARCH_LIMIT,
    WIQL_BASE_SELECT,
    WIQL_FROM,
    get_base_wiql_condition,
)

logger = logging.getLogger(__name__)


class AzureDevOpsService:
    """Service class to interact with Azure DevOps Work Items"""
    
    def __init__(self):
        """Initialize connection to Azure DevOps"""
        try:
            credentials = BasicAuthentication('', AZURE_DEVOPS_PAT)
            self.connection = Connection(
                base_url=AZURE_DEVOPS_ORG_URL,
                creds=credentials
            )
            self.wit_client = self.connection.clients.get_work_item_tracking_client()
            self.core_client = self.connection.clients.get_core_client()
            self.project = AZURE_DEVOPS_PROJECT
            self.default_area_path = DEFAULT_AREA_PATH
            logger.info(f"Successfully connected to Azure DevOps: {AZURE_DEVOPS_ORG_URL}")
            logger.info(f"Default area path: {DEFAULT_AREA_PATH}")
        except Exception as e:
            logger.error(f"Failed to initialize Azure DevOps connection: {str(e)}")
            raise
    
    def get_work_items(
        self,
        ids: Optional[List[int]] = None,
        fields: Optional[List[str]] = None,
        as_of: Optional[str] = None,
        expand: Optional[str] = None
    ) -> List[Dict]:
        """
        Get work items by IDs
        
        Args:
            ids: List of work item IDs
            fields: List of fields to return
            as_of: Date/time to get work item state
            expand: Level of detail (None, Relations, Fields, Links, All)
        
        Returns:
            List of work item dictionaries
        """
        try:
            if not ids:
                return []
            
            work_items = self.wit_client.get_work_items(
                ids=ids,
                fields=fields,
                as_of=as_of,
                expand=expand
            )
            
            return [self._serialize_work_item(wi) for wi in work_items]
        except Exception as e:
            logger.error(f"Error getting work items: {str(e)}")
            raise
    
    def query_work_items(
        self,
        wiql_query: str,
        top: Optional[int] = None,
        team_context: Optional[str] = None
    ) -> List[Dict]:
        """
        Query work items using WIQL (Work Item Query Language)
        
        Args:
            wiql_query: WIQL query string
            top: Maximum number of results
            team_context: Team context for the query
        
        Returns:
            List of work item dictionaries
        """
        try:
            wiql = {
                'query': wiql_query
            }
            
            # Build team context if needed
            if team_context:
                from azure.devops.v7_0.work_item_tracking.models import TeamContext
                team_ctx = TeamContext(project=self.project, team=team_context)
                query_result = self.wit_client.query_by_wiql(
                    wiql=wiql,
                    team_context=team_ctx,
                    top=top
                )
            else:
                # Query without team context - just use project in WIQL
                query_result = self.wit_client.query_by_wiql(
                    wiql=wiql,
                    top=top
                )
            
            if not query_result.work_items:
                return []
            
            # Extract work item IDs from query result
            ids = [item.id for item in query_result.work_items]

            # ADO get_work_items has a hard cap of 200 IDs per call.
            # Batch to stay safely under it and merge results.
            BATCH_SIZE = 200
            results: List[Dict] = []
            for i in range(0, len(ids), BATCH_SIZE):
                batch = ids[i:i + BATCH_SIZE]
                results.extend(self.get_work_items(ids=batch, expand='All'))
            return results
        
        except Exception as e:
            logger.error(f"Error querying work items: {str(e)}")
            raise
    
    def get_work_items_by_type(
        self,
        work_item_type: Optional[str] = None,
        state: Optional[str] = None,
        assigned_to: Optional[str] = None,
        area_path: Optional[str] = None,
        iteration_path: Optional[str] = None,
        tags: Optional[List[str]] = None,
        top: Optional[int] = 200
    ) -> List[Dict]:
        """
        Get work items filtered by type and other criteria
        
        Args:
            work_item_type: Type of work item (Bug, Task, User Story, etc.) - Optional
            state: Work item state (Active, Closed, etc.)
            assigned_to: User assigned to the work item
            area_path: Area path filter
            iteration_path: Iteration path filter
            tags: List of tags to filter by
            top: Maximum number of results
        
        Returns:
            List of work item dictionaries
        """
        # Build WIQL query with default area path constraint
        query_parts = [
            WIQL_BASE_SELECT,
            WIQL_FROM,
            f"WHERE {get_base_wiql_condition(self.project, self.default_area_path)}"
        ]
        
        if work_item_type:
            query_parts.append(f"AND [System.WorkItemType] = '{work_item_type}'")
        
        if state:
            query_parts.append(f"AND [System.State] = '{state}'")
        
        if assigned_to:
            query_parts.append(f"AND [System.AssignedTo] = '{assigned_to}'")
        
        if area_path:
            query_parts.append(f"AND [System.AreaPath] UNDER '{area_path}'")
        
        if iteration_path:
            query_parts.append(f"AND [System.IterationPath] UNDER '{iteration_path}'")
        
        if tags:
            tags_condition = " OR ".join([f"[System.Tags] CONTAINS '{tag}'" for tag in tags])
            query_parts.append(f"AND ({tags_condition})")
        
        query_parts.append(f"ORDER BY [System.ChangedDate] DESC")
        
        wiql_query = " ".join(query_parts)
        
        return self.query_work_items(wiql_query=wiql_query, top=top)
    
    def get_work_items_by_ids(self, ids: List[int]) -> List[Dict]:
        """
        Get work items by specific IDs

        Args:
            ids: List of work item IDs

        Returns:
            List of work item dictionaries
        """
        BATCH_SIZE = 200
        results: List[Dict] = []
        for i in range(0, len(ids), BATCH_SIZE):
            batch = ids[i:i + BATCH_SIZE]
            results.extend(self.get_work_items(ids=batch, expand='All'))
        return results
    
    def search_work_items(
        self,
        search_text: str,
        work_item_types: Optional[List[str]] = None,
        top: Optional[int] = 100
    ) -> List[Dict]:
        """
        Search work items by text
        
        Args:
            search_text: Text to search for
            work_item_types: List of work item types to filter
            top: Maximum number of results
        
        Returns:
            List of work item dictionaries
        """
        # Build search query with default area path constraint
        query_parts = [
            f"SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType]",
            WIQL_FROM,
            f"WHERE {get_base_wiql_condition(self.project, self.default_area_path)}"
        ]
        
        # Add text search
        query_parts.append(f"AND [System.Title] CONTAINS '{search_text}'")
        
        # Add work item type filter if provided
        if work_item_types:
            types_condition = " OR ".join([f"[System.WorkItemType] = '{wit}'" for wit in work_item_types])
            query_parts.append(f"AND ({types_condition})")
        
        query_parts.append(f"ORDER BY [System.ChangedDate] DESC")
        
        wiql_query = " ".join(query_parts)
        
        return self.query_work_items(wiql_query=wiql_query, top=top)
    
    def get_work_items_updated_since(
        self,
        since_date: str,
        work_item_type: Optional[str] = None,
        top: Optional[int] = 200
    ) -> List[Dict]:
        """
        Get work items updated since a specific date
        
        Args:
            since_date: ISO format date string (e.g., '2024-01-01')
            work_item_type: Type of work item to filter
            top: Maximum number of results
        
        Returns:
            List of work item dictionaries
        """
        # Build updated-since query with default area path constraint
        query_parts = [
            f"SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType]",
            WIQL_FROM,
            f"WHERE {get_base_wiql_condition(self.project, self.default_area_path)}",
            f"AND [System.ChangedDate] >= '{since_date}'"
        ]
        
        if work_item_type:
            query_parts.append(f"AND [System.WorkItemType] = '{work_item_type}'")
        
        query_parts.append(f"ORDER BY [System.ChangedDate] DESC")
        
        wiql_query = " ".join(query_parts)
        
        return self.query_work_items(wiql_query=wiql_query, top=top)
    
    def _serialize_work_item(self, work_item) -> Dict:
        """
        Serialize work item object to dictionary
        
        Args:
            work_item: Work item object from Azure DevOps API
        
        Returns:
            Dictionary representation of work item
        """
        if not work_item:
            return {}
        
        fields = work_item.fields if hasattr(work_item, 'fields') else {}
        
        return {
            'id': work_item.id,
            'rev': work_item.rev,
            'url': work_item.url,
            'fields': fields,
            'relations': [
                {
                    'rel': rel.rel,
                    'url': rel.url,
                    'attributes': rel.attributes
                }
                for rel in (work_item.relations or [])
            ] if hasattr(work_item, 'relations') and work_item.relations else []
        }

    def get_team_info(self, team_name: Optional[str] = None) -> Dict:
        """
        Get information about a team in the configured project.

        Args:
            team_name: Name of the team. Defaults to the project's default team
                (named "<project> Team" by Azure DevOps convention).

        Returns:
            {
                'project': {'name', 'description'},
                'team': {'name', 'description'},
                'admins': [{'displayName', 'uniqueName', 'imageUrl'}],
                'members': [{'displayName', 'uniqueName', 'imageUrl'}],
            }
        """
        try:
            project = self.core_client.get_project(self.project)
            project_id = project.id

            target_team_name = team_name or "Cloud Operations"

            team = None
            try:
                team = self.core_client.get_team(project_id, target_team_name)
            except Exception:
                # Fallback: pick the first team in the project.
                teams = self.core_client.get_teams(project_id, top=1) or []
                team = teams[0] if teams else None

            if team is None:
                return {
                    'project': {
                        'name': project.name,
                        'description': getattr(project, 'description', '') or '',
                    },
                    'team': None,
                    'admins': [],
                    'members': [],
                }

            members_raw = self.core_client.get_team_members_with_extended_properties(
                project_id, team.id
            ) or []

            def _serialize(identity) -> Dict:
                return {
                    'displayName': getattr(identity, 'display_name', None),
                    'uniqueName': getattr(identity, 'unique_name', None),
                    'imageUrl': getattr(identity, 'image_url', None),
                }

            admins: List[Dict] = []
            members: List[Dict] = []
            for m in members_raw:
                identity = getattr(m, 'identity', None)
                if identity is None:
                    continue
                payload = _serialize(identity)
                if getattr(m, 'is_team_admin', False):
                    admins.append(payload)
                else:
                    members.append(payload)

            return {
                'project': {
                    'name': project.name,
                    'description': getattr(project, 'description', '') or '',
                },
                'team': {
                    'id': team.id,
                    'name': team.name,
                    'description': getattr(team, 'description', '') or '',
                },
                'admins': admins,
                'members': members,
            }
        except Exception as e:
            logger.error(f"Error getting team info: {str(e)}")
            raise

    def get_project_activity(
        self,
        start_iso: str,
        bucket: str = 'day',
    ) -> Dict:
        """
        Compute activity per Feature (project) by walking the parent chain of
        every item in the configured area.

        For each item in the Cloud area whose ChangedDate >= start_iso, walk
        System.Parent until a Feature ancestor is found and bucket the
        ChangedDate under that feature.

        Args:
            start_iso: ISO date (YYYY-MM-DD) to filter ChangedDate.
            bucket: 'day' or 'month'.

        Returns:
            {
                'projects': [
                    {'id', 'name', 'state', 'total', 'series': [{'date', 'count'}]},
                    ...
                ],
                'buckets': ['2026-04-01', ...]   # ordered list of bucket keys
            }
        """
        from datetime import datetime, timezone

        # 1. Pull the IDs of every item changed since start_iso in the area.
        wiql = (
            "SELECT [System.Id] FROM WorkItems "
            f"WHERE {get_base_wiql_condition(self.project, self.default_area_path)} "
            f"AND [System.ChangedDate] >= '{start_iso}'"
        )
        query_result = self.wit_client.query_by_wiql({'query': wiql})
        ids = [w.id for w in (query_result.work_items or [])]
        if not ids:
            return {'projects': [], 'buckets': []}

        # 2. Fetch slim payloads for those items (id, type, parent, changed).
        fields = [
            'System.Id',
            'System.Title',
            'System.WorkItemType',
            'System.State',
            'System.Parent',
            'System.ChangedDate',
        ]
        items: List[Dict] = []
        for i in range(0, len(ids), 200):
            batch = ids[i:i + 200]
            items.extend(self.get_work_items(ids=batch, fields=fields))

        # 3. Build a parent map from the items we already fetched.
        parent_of: Dict[int, Optional[int]] = {}
        type_of: Dict[int, str] = {}
        for it in items:
            f = it.get('fields', {}) or {}
            wid = it.get('id')
            if wid is None:
                continue
            parent_of[wid] = f.get('System.Parent')
            type_of[wid] = f.get('System.WorkItemType') or ''

        # 4. Some parents (Features) may not be in the changed set; fetch them
        # so we can resolve types when walking the chain.
        missing_parents = {
            pid for pid in parent_of.values()
            if pid is not None and pid not in type_of
        }
        if missing_parents:
            extra: List[Dict] = []
            ids_list = list(missing_parents)
            for i in range(0, len(ids_list), 200):
                batch = ids_list[i:i + 200]
                extra.extend(self.get_work_items(ids=batch, fields=fields))
            for it in extra:
                f = it.get('fields', {}) or {}
                wid = it.get('id')
                if wid is None:
                    continue
                parent_of.setdefault(wid, f.get('System.Parent'))
                type_of[wid] = f.get('System.WorkItemType') or ''

        # 5. Walk parent chain for each item until we find a Feature.
        FEATURE = 'Feature'
        feature_cache: Dict[int, Optional[int]] = {}

        def find_feature(wid: int) -> Optional[int]:
            if wid in feature_cache:
                return feature_cache[wid]
            seen = set()
            cur: Optional[int] = wid
            while cur is not None and cur not in seen:
                seen.add(cur)
                if type_of.get(cur) == FEATURE:
                    for s in seen:
                        feature_cache[s] = cur
                    return cur
                cur = parent_of.get(cur)
            for s in seen:
                feature_cache[s] = None
            return None

        # 6. Bucket helper.
        def to_bucket(iso_date: str) -> Optional[str]:
            try:
                dt = datetime.fromisoformat(iso_date.replace('Z', '+00:00'))
            except ValueError:
                return None
            dt = dt.astimezone(timezone.utc)
            if bucket == 'month':
                return dt.strftime('%Y-%m')
            if bucket == 'week':
                iso_year, iso_week, _ = dt.isocalendar()
                return f"{iso_year}-W{iso_week:02d}"
            return dt.strftime('%Y-%m-%d')

        # 7. Aggregate.
        per_feature: Dict[int, Dict] = {}
        all_buckets: set = set()
        for it in items:
            wid = it.get('id')
            if wid is None:
                continue
            feat_id = find_feature(wid)
            if feat_id is None:
                continue
            f = it.get('fields', {}) or {}
            changed = f.get('System.ChangedDate')
            if not changed:
                continue
            key = to_bucket(changed)
            if key is None:
                continue
            all_buckets.add(key)
            entry = per_feature.setdefault(feat_id, {
                'id': feat_id,
                'name': None,
                'state': None,
                'total': 0,
                'series': {},
            })
            entry['total'] += 1
            entry['series'][key] = entry['series'].get(key, 0) + 1

        # 8. Backfill feature names/state from the items we have, falling back
        # to a fetch if needed.
        unknown = [fid for fid in per_feature if per_feature[fid]['name'] is None]
        feature_meta_ids = [fid for fid in unknown]
        # Try to populate from already-fetched items.
        item_by_id = {it.get('id'): it for it in items}
        still_missing = []
        for fid in feature_meta_ids:
            it = item_by_id.get(fid)
            if it:
                f = it.get('fields', {}) or {}
                per_feature[fid]['name'] = f.get('System.Title') or f'Feature #{fid}'
                per_feature[fid]['state'] = f.get('System.State')
            else:
                still_missing.append(fid)
        if still_missing:
            extra: List[Dict] = []
            for i in range(0, len(still_missing), 200):
                batch = still_missing[i:i + 200]
                extra.extend(self.get_work_items(
                    ids=batch,
                    fields=['System.Id', 'System.Title', 'System.State'],
                ))
            for it in extra:
                fid = it.get('id')
                f = it.get('fields', {}) or {}
                if fid in per_feature:
                    per_feature[fid]['name'] = f.get('System.Title') or f'Feature #{fid}'
                    per_feature[fid]['state'] = f.get('System.State')

        ordered_buckets = sorted(all_buckets)
        projects = []
        for entry in per_feature.values():
            series_map = entry['series']
            series = [
                {'date': b, 'count': series_map.get(b, 0)}
                for b in ordered_buckets
            ]
            projects.append({
                'id': entry['id'],
                'name': entry['name'] or f"Feature #{entry['id']}",
                'state': entry['state'],
                'total': entry['total'],
                'series': series,
            })
        projects.sort(key=lambda p: p['total'], reverse=True)
        return {'projects': projects, 'buckets': ordered_buckets}
