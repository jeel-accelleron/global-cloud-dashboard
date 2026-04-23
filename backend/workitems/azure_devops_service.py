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
            
            # Get full work item details
            return self.get_work_items(ids=ids, expand='All')
        
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
        return self.get_work_items(ids=ids, expand='All')
    
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
