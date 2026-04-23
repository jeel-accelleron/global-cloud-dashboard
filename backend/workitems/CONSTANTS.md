# Constants Configuration

## Overview

All configuration constants are centralized in `workitems/utils/constants.py` for easy maintenance and consistency across the application.

## Constants Defined

### Azure DevOps Configuration
```python
AZURE_DEVOPS_ORG_URL    # From settings: https://dev.azure.com/Turbo-B
AZURE_DEVOPS_PAT        # From settings: Personal Access Token
AZURE_DEVOPS_PROJECT    # From settings: Global IS Infrastructure
```

### Project-Specific Constraints

**⚠️ IMPORTANT: All queries are automatically constrained to:**

```python
DEFAULT_PROJECT = "Global IS Infrastructure"
DEFAULT_AREA_PATH = "Global IS Infrastructure\\Cloud"
```

This means:
- ✅ All API endpoints only return work items from the **Cloud** area
- ✅ Queries are scoped to `Global IS Infrastructure\Cloud` by default
- ✅ This constraint is applied automatically to all WIQL queries

### Query Limits
```python
DEFAULT_TOP_LIMIT = 200        # Default max results for general queries
MAX_TOP_LIMIT = 1000          # Maximum allowed results per query
DEFAULT_SEARCH_LIMIT = 100    # Default max results for search queries
```

### Work Item Types
```python
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
```

### Common States
```python
WORK_ITEM_STATES = {
    'NEW': 'New',
    'ACTIVE': 'Active',
    'RESOLVED': 'Resolved',
    'CLOSED': 'Closed',
    'REMOVED': 'Removed',
    'IN_PROGRESS': 'In Progress',
    'DONE': 'Done',
}
```

### Field Names
All Azure DevOps field names are centralized:
```python
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
```

## Helper Functions

### get_base_wiql_condition()
Generates the base WHERE condition for all WIQL queries with project and area path constraints.

```python
from workitems.utils.constants import get_base_wiql_condition

# Default usage (uses DEFAULT_PROJECT and DEFAULT_AREA_PATH)
base_condition = get_base_wiql_condition()
# Returns: "[System.TeamProject] = 'Global IS Infrastructure' AND [System.AreaPath] UNDER 'Global IS Infrastructure\\Cloud'"

# Custom project
base_condition = get_base_wiql_condition(project="MyProject")

# Custom area path
base_condition = get_base_wiql_condition(area_path="MyProject\\Area")

# No area constraint
base_condition = get_base_wiql_condition(area_path=None)
```

## Usage in Code

### In Service Layer
```python
from .utils.constants import (
    AZURE_DEVOPS_ORG_URL,
    DEFAULT_AREA_PATH,
    get_base_wiql_condition,
)

# Build a query with constraints
query = f"""
    SELECT [System.Id], [System.Title]
    FROM WorkItems
    WHERE {get_base_wiql_condition()}
    AND [System.State] = 'Active'
"""
```

### In Serializers
```python
from .utils.constants import DEFAULT_TOP_LIMIT, MAX_TOP_LIMIT

class MySerializer(serializers.Serializer):
    top = serializers.IntegerField(
        default=DEFAULT_TOP_LIMIT,
        max_value=MAX_TOP_LIMIT
    )
```

## Modifying Constraints

To change the default area path or project:

1. Open `workitems/utils/constants.py`
2. Update the constants:
   ```python
   DEFAULT_PROJECT = "Your Project Name"
   DEFAULT_AREA_PATH = "Your Project\\Your Area"
   ```
3. Restart the Django server

**Note:** All queries will automatically use the new constraints.

## Benefits

✅ **Single Source of Truth** - All constants in one place  
✅ **Easy Maintenance** - Change once, apply everywhere  
✅ **Consistency** - Same values across all endpoints  
✅ **Type Safety** - Centralized field names prevent typos  
✅ **Auto-Scoping** - Area path constraint applied automatically  

## Area Path Constraint Details

### What This Means

When you query work items through the API, the results are **automatically filtered** to only include items under:

```
Global IS Infrastructure\Cloud
```

This includes:
- Items directly in `Global IS Infrastructure\Cloud`
- Items in any sub-areas like `Global IS Infrastructure\Cloud\Backend`
- Items in `Global IS Infrastructure\Cloud\Frontend`
- etc.

### What Is Excluded

❌ Items in `Global IS Infrastructure` but NOT under `Cloud`  
❌ Items in `Global IS Infrastructure\Other Area`  
❌ Items from other projects

### Override Behavior

If you need to query a different area, you can:

1. **Modify the constant** in `constants.py` (affects all queries)
2. **Use custom WIQL** endpoint with your own WHERE clause
3. **Update the service method** to accept an area_path parameter

## Examples

### Querying with Default Constraints

All these endpoints automatically use the area path constraint:

```bash
# Get all bugs in Cloud area
GET /api/workitems/?work_item_type=Bug

# Search in Cloud area only
GET /api/workitems/search/?search_text=login

# Recently updated in Cloud area
GET /api/workitems/updated-since/?since_date=2024-04-01
```

### Custom WIQL (Override Constraints)

To query outside the Cloud area, use custom WIQL:

```bash
POST /api/workitems/query/
{
  "query": "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = 'Global IS Infrastructure' AND [System.AreaPath] UNDER 'Global IS Infrastructure\\OtherArea'"
}
```
