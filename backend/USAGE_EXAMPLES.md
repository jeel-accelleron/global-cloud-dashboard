# Azure DevOps Work Items API - Usage Examples

## Quick Start

### 1. Start the server
```powershell
cd backend
.venv\Scripts\activate
python manage.py runserver
```

The API will be available at `http://localhost:8000`

## Python Examples

### Example 1: Get All Active Bugs
```python
import requests

response = requests.get(
    'http://localhost:8000/api/workitems/',
    params={
        'work_item_type': 'Bug',
        'state': 'Active',
        'top': 50
    }
)

data = response.json()
print(f"Found {data['count']} active bugs")
for item in data['results']:
    print(f"- {item['fields']['System.Title']}")
```

### Example 2: Search for Work Items
```python
import requests

response = requests.get(
    'http://localhost:8000/api/workitems/search/',
    params={
        'search_text': 'authentication',
        'work_item_types': 'Bug,Task',
        'top': 20
    }
)

data = response.json()
for item in data['results']:
    fields = item['fields']
    print(f"{fields['System.Id']}: {fields['System.Title']} ({fields['System.WorkItemType']})")
```

### Example 3: Get Work Items by IDs
```python
import requests

response = requests.post(
    'http://localhost:8000/api/workitems/by-ids/',
    json={'ids': [12345, 12346, 12347]}
)

data = response.json()
for item in data['results']:
    print(item['fields']['System.Title'])
```

### Example 4: Get Recently Updated Items
```python
import requests
from datetime import datetime, timedelta

# Get items updated in the last 7 days
since_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')

response = requests.get(
    'http://localhost:8000/api/workitems/updated-since/',
    params={
        'since_date': since_date,
        'work_item_type': 'Task'
    }
)

data = response.json()
print(f"{data['count']} tasks updated since {since_date}")
```

### Example 5: Custom WIQL Query
```python
import requests

query = """
SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo]
FROM WorkItems
WHERE [System.TeamProject] = 'Global IS Infrastructure'
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] = 'Active'
  AND [Microsoft.VSTS.Common.Priority] = 1
ORDER BY [System.CreatedDate] DESC
"""

response = requests.post(
    'http://localhost:8000/api/workitems/query/',
    json={
        'query': query,
        'top': 100
    }
)

data = response.json()
print(f"Found {data['count']} high priority bugs")
```

## JavaScript/Fetch Examples

### Example 1: Get Work Items with Filters
```javascript
async function getWorkItems() {
    const params = new URLSearchParams({
        work_item_type: 'User Story',
        state: 'Active',
        iteration_path: 'Sprint 5'
    });
    
    const response = await fetch(`http://localhost:8000/api/workitems/?${params}`);
    const data = await response.json();
    
    console.log(`Found ${data.count} user stories`);
    data.results.forEach(item => {
        console.log(`- ${item.fields['System.Title']}`);
    });
}
```

### Example 2: Search Work Items
```javascript
async function searchWorkItems(searchText) {
    const params = new URLSearchParams({
        search_text: searchText,
        top: 50
    });
    
    const response = await fetch(`http://localhost:8000/api/workitems/search/?${params}`);
    const data = await response.json();
    
    return data.results;
}

// Usage
searchWorkItems('login').then(results => {
    console.log('Search results:', results);
});
```

### Example 3: Get Work Items by IDs
```javascript
async function getWorkItemsByIds(ids) {
    const response = await fetch('http://localhost:8000/api/workitems/by-ids/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids })
    });
    
    const data = await response.json();
    return data.results;
}

// Usage
getWorkItemsByIds([12345, 12346]).then(items => {
    console.log('Work items:', items);
});
```

## cURL Examples

### Health Check
```bash
curl http://localhost:8000/api/workitems/health/
```

### Get All Tasks
```bash
curl "http://localhost:8000/api/workitems/?work_item_type=Task&state=Active"
```

### Search for Work Items
```bash
curl "http://localhost:8000/api/workitems/search/?search_text=api&top=10"
```

### Get Work Items by IDs
```bash
curl -X POST http://localhost:8000/api/workitems/by-ids/ \
  -H "Content-Type: application/json" \
  -d '{"ids": [12345, 12346]}'
```

### Get Recently Updated Items
```bash
curl "http://localhost:8000/api/workitems/updated-since/?since_date=2024-04-01&work_item_type=Bug"
```

### Custom WIQL Query
```bash
curl -X POST http://localhost:8000/api/workitems/query/ \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.TeamProject] = '\''Global IS Infrastructure'\'' AND [System.State] = '\''Active'\''",
    "top": 50
  }'
```

## PowerShell Examples

### Example 1: Get Active Bugs
```powershell
$params = @{
    work_item_type = 'Bug'
    state = 'Active'
    top = 50
}
$queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join '&'
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/workitems/?$queryString"
Write-Host "Found $($response.count) bugs"
$response.results | ForEach-Object { Write-Host "- $($_.fields.'System.Title')" }
```

### Example 2: Get Work Items by IDs
```powershell
$body = @{
    ids = @(12345, 12346, 12347)
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/api/workitems/by-ids/" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

$response.results | ForEach-Object {
    Write-Host "$($_.id): $($_.fields.'System.Title')"
}
```

## Common Filters

### By Work Item Type
- `work_item_type=Bug`
- `work_item_type=Task`
- `work_item_type=User Story`
- `work_item_type=Feature`
- `work_item_type=Epic`

### By State
- `state=New`
- `state=Active`
- `state=Resolved`
- `state=Closed`

### By Assigned User
- `assigned_to=john.doe@example.com`
- `assigned_to=Jane Doe`

### By Area/Iteration Path
- `area_path=Project\Web\Frontend`
- `iteration_path=Project\Sprint 5`

### By Tags
- `tags=urgent`
- `tags=frontend,backend` (multiple tags)

## Response Format

All endpoints return data in this format:

```json
{
  "count": 10,
  "results": [
    {
      "id": 12345,
      "rev": 3,
      "url": "https://dev.azure.com/...",
      "fields": {
        "System.Id": 12345,
        "System.Title": "Work item title",
        "System.WorkItemType": "Bug",
        "System.State": "Active",
        "System.AssignedTo": {
          "displayName": "John Doe",
          "uniqueName": "john@example.com"
        },
        "System.CreatedDate": "2024-01-15T10:30:00Z",
        "System.ChangedDate": "2024-01-20T14:20:00Z",
        "System.AreaPath": "Project\\Area",
        "System.IterationPath": "Project\\Sprint 1",
        "System.Tags": "tag1; tag2",
        "System.Description": "Work item description",
        "Microsoft.VSTS.Common.Priority": 1
      },
      "relations": []
    }
  ]
}
```

## Common Field Names

- `System.Id` - Work item ID
- `System.Title` - Title
- `System.Description` - Description
- `System.WorkItemType` - Type (Bug, Task, etc.)
- `System.State` - Current state
- `System.AssignedTo` - Assigned user
- `System.CreatedDate` - Creation date
- `System.ChangedDate` - Last modified date
- `System.AreaPath` - Area path
- `System.IterationPath` - Iteration path
- `System.Tags` - Tags (semicolon-separated)
- `Microsoft.VSTS.Common.Priority` - Priority (1-4)
- `Microsoft.VSTS.Common.Severity` - Severity (for bugs)
