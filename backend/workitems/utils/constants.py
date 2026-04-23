"""
Constants for Azure DevOps Work Items API
"""
from django.conf import settings

# Azure DevOps Configuration
AZURE_DEVOPS_ORG_URL = settings.AZURE_DEVOPS_ORG_URL
AZURE_DEVOPS_PAT = settings.AZURE_DEVOPS_PAT
AZURE_DEVOPS_PROJECT = settings.AZURE_DEVOPS_PROJECT

# Project-specific constants
DEFAULT_PROJECT = "Global IS Infrastructure"
DEFAULT_AREA_PATH = "Global IS Infrastructure\\Cloud"

# Query limits
DEFAULT_TOP_LIMIT = 200
MAX_TOP_LIMIT = 1000
DEFAULT_SEARCH_LIMIT = 100

# Common Work Item Types
WORK_ITEM_TYPES = {
    'BUG': 'Bug',
    'TASK': 'Task',
    'USER_STORY': 'User Story',
    'FEATURE': 'Feature',
    'EPIC': 'Epic',
    'ISSUE': 'Issue',
    'TEST_CASE': 'Test Case',
    'IMPEDIMENT': 'Impediment',
}

# Common States
WORK_ITEM_STATES = {
    'NEW': 'New',
    'ACTIVE': 'Active',
    'RESOLVED': 'Resolved',
    'CLOSED': 'Closed',
    'REMOVED': 'Removed',
    'IN_PROGRESS': 'In Progress',
    'DONE': 'Done',
}

# Common Fields
WORK_ITEM_FIELDS = {
    'ID': 'System.Id',
    'TITLE': 'System.Title',
    'DESCRIPTION': 'System.Description',
    'STATE': 'System.State',
    'WORK_ITEM_TYPE': 'System.WorkItemType',
    'ASSIGNED_TO': 'System.AssignedTo',
    'CREATED_DATE': 'System.CreatedDate',
    'CHANGED_DATE': 'System.ChangedDate',
    'AREA_PATH': 'System.AreaPath',
    'ITERATION_PATH': 'System.IterationPath',
    'TAGS': 'System.Tags',
    'PRIORITY': 'Microsoft.VSTS.Common.Priority',
    'SEVERITY': 'Microsoft.VSTS.Common.Severity',
}

# WIQL Query Templates
WIQL_BASE_SELECT = f"SELECT [{WORK_ITEM_FIELDS['ID']}], [{WORK_ITEM_FIELDS['TITLE']}], [{WORK_ITEM_FIELDS['STATE']}], [{WORK_ITEM_FIELDS['ASSIGNED_TO']}], [{WORK_ITEM_FIELDS['WORK_ITEM_TYPE']}]"
WIQL_FROM = "FROM WorkItems"

def get_base_wiql_condition(project: str = None, area_path: str = None) -> str:
    """
    Generate base WIQL WHERE condition with project and area constraints
    
    Args:
        project: Project name (defaults to DEFAULT_PROJECT)
        area_path: Area path (defaults to DEFAULT_AREA_PATH)
    
    Returns:
        WIQL WHERE condition string
    """
    project = project or DEFAULT_PROJECT
    area_path = area_path or DEFAULT_AREA_PATH
    
    conditions = [
        f"[System.TeamProject] = '{project}'"
    ]
    
    if area_path:
        conditions.append(f"[System.AreaPath] UNDER '{area_path}'")
    
    return " AND ".join(conditions)
