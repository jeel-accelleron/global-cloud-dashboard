# Azure DevOps Work Items API

Django REST API for querying Azure DevOps work items with various filters and search capabilities.

## 🔒 Important: Area Path Constraint

**⚠️ All API queries are automatically scoped to:**

- **Project:** `Global IS Infrastructure`
- **Area Path:** `Global IS Infrastructure\Cloud`

This means all endpoints will **only return work items** under the `Cloud` area and its sub-areas. This constraint is defined in `workitems/utils/constants.py` and can be modified there.

See [CONSTANTS.md](CONSTANTS.md) for details on all configuration constants.

## Setup

### Prerequisites
- Python 3.13+
- UV package manager
- Azure DevOps Personal Access Token (PAT) with read permissions

### Installation

1. Dependencies are already installed via UV:
```powershell
uv add azure-devops djangorestframework python-dotenv django-cors-headers
```

2. Environment variables are configured in `.env`:
```
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/YourOrg
AZURE_DEVOPS_PAT=YourPersonalAccessToken
AZURE_DEVOPS_PROJECT=YourProjectName
```

### Run the server

```powershell
cd backend
python manage.py runserver
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check

**GET** `/api/workitems/health/`

Check if the Azure DevOps connection is configured correctly.

**Response:**
```json
{
  "status": "healthy",
  "message": "Azure DevOps connection is configured",
  "project": "Your Project Name"
}
```

---

### 1. List Work Items with Filters

**GET** `/api/workitems/`

Query work items with multiple filter options.

**Query Parameters:**
- `work_item_type` (optional): Type of work item (e.g., "Bug", "Task", "User Story", "Feature", "Epic")
- `state` (optional): Work item state (e.g., "Active", "Closed", "Resolved", "New")
- `assigned_to` (optional): Email or display name of assigned user
- `area_path` (optional): Area path to filter by
- `iteration_path` (optional): Iteration path to filter by
- `tags` (optional): Comma-separated list of tags
- `top` (optional): Maximum number of results (default: 200, max: 1000)

**Examples:**

```bash
# Get all active bugs
GET /api/workitems/?work_item_type=Bug&state=Active

# Get tasks assigned to specific user
GET /api/workitems/?work_item_type=Task&assigned_to=john@example.com

# Get work items with specific tags
GET /api/workitems/?tags=frontend,urgent

# Get user stories in specific iteration
GET /api/workitems/?work_item_type=User Story&iteration_path=Sprint 1

# Limit results
GET /api/workitems/?work_item_type=Bug&top=50
```

**Response:**
```json
{
  "count": 25,
  "results": [
    {
      "id": 12345,
      "rev": 3,
      "url": "https://dev.azure.com/...",
      "fields": {
        "System.Id": 12345,
        "System.Title": "Fix login issue",
        "System.WorkItemType": "Bug",
        "System.State": "Active",
        "System.AssignedTo": {
          "displayName": "John Doe",
          "uniqueName": "john@example.com"
        },
        "System.Tags": "urgent; frontend",
        "System.AreaPath": "Project\\Web",
        "System.IterationPath": "Project\\Sprint 1",
        "System.CreatedDate": "2024-01-15T10:30:00Z",
        "System.ChangedDate": "2024-01-20T14:20:00Z"
      },
      "relations": []
    }
  ]
}
```

---

### 2. Get Work Items by IDs

**POST** `/api/workitems/by-ids/`

Retrieve specific work items by their IDs.

**Request Body:**
```json
{
  "ids": [12345, 12346, 12347]
}
```

**Example:**
```bash
POST /api/workitems/by-ids/
Content-Type: application/json

{
  "ids": [12345, 12346, 12347]
}
```

**Response:**
```json
{
  "count": 3,
  "results": [
    { "id": 12345, "fields": {...} },
    { "id": 12346, "fields": {...} },
    { "id": 12347, "fields": {...} }
  ]
}
```

---

### 3. Search Work Items by Text

**GET** `/api/workitems/search/`

Search for work items by text in their title.

**Query Parameters:**
- `search_text` (required): Text to search for
- `work_item_types` (optional): Comma-separated list of work item types to filter
- `top` (optional): Maximum number of results (default: 100, max: 1000)

**Examples:**

```bash
# Search for work items containing "login"
GET /api/workitems/search/?search_text=login

# Search for bugs and tasks containing "performance"
GET /api/workitems/search/?search_text=performance&work_item_types=Bug,Task

# Limit search results
GET /api/workitems/search/?search_text=api&top=50
```

**Response:**
```json
{
  "count": 15,
  "results": [
    {
      "id": 12345,
      "fields": {
        "System.Title": "Fix login API endpoint",
        "System.WorkItemType": "Bug",
        "System.State": "Active"
      }
    }
  ]
}
```

---

### 4. Get Recently Updated Work Items

**GET** `/api/workitems/updated-since/`

Get work items that have been updated since a specific date.

**Query Parameters:**
- `since_date` (required): ISO format date (YYYY-MM-DD)
- `work_item_type` (optional): Filter by work item type
- `top` (optional): Maximum number of results (default: 200, max: 1000)

**Examples:**

```bash
# Get all work items updated since January 1, 2024
GET /api/workitems/updated-since/?since_date=2024-01-01

# Get bugs updated in the last week
GET /api/workitems/updated-since/?since_date=2024-01-15&work_item_type=Bug

# Limit results
GET /api/workitems/updated-since/?since_date=2024-01-01&top=50
```

**Response:**
```json
{
  "count": 42,
  "results": [
    {
      "id": 12345,
      "fields": {
        "System.Title": "Recently updated task",
        "System.ChangedDate": "2024-01-20T14:20:00Z"
      }
    }
  ]
}
```

---

### 5. Custom WIQL Query

**POST** `/api/workitems/query/`

Execute custom Work Item Query Language (WIQL) queries for advanced filtering.

**Request Body:**
```json
{
  "query": "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.TeamProject] = 'YourProject' AND [System.WorkItemType] = 'Bug' AND [System.State] = 'Active' ORDER BY [System.ChangedDate] DESC",
  "top": 100,
  "team_context": "optional team name"
}
```

**Examples:**

```bash
# Complex query with multiple conditions
POST /api/workitems/query/
Content-Type: application/json

{
  "query": "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.TeamProject] = 'MyProject' AND [System.State] = 'Active' AND [System.Priority] = 1",
  "top": 50
}

# Query with date range
POST /api/workitems/query/
Content-Type: application/json

{
  "query": "SELECT [System.Id] FROM WorkItems WHERE [System.CreatedDate] >= '2024-01-01' AND [System.CreatedDate] <= '2024-01-31'"
}
```

**Common WIQL Patterns:**

```sql
-- Get high priority bugs
SELECT [System.Id], [System.Title] 
FROM WorkItems 
WHERE [System.TeamProject] = 'YourProject' 
  AND [System.WorkItemType] = 'Bug' 
  AND [Microsoft.VSTS.Common.Priority] = 1

-- Get work items in specific area
SELECT [System.Id] 
FROM WorkItems 
WHERE [System.AreaPath] UNDER 'YourProject\\Web\\Frontend'

-- Get work items created this month
SELECT [System.Id] 
FROM WorkItems 
WHERE [System.CreatedDate] >= @Today - 30

-- Get work items with specific tags
SELECT [System.Id] 
FROM WorkItems 
WHERE [System.Tags] CONTAINS 'urgent'
```

**Response:**
```json
{
  "count": 10,
  "results": [
    {
      "id": 12345,
      "fields": {
        "System.Id": 12345,
        "System.Title": "Custom query result"
      }
    }
  ]
}
```

---

## Common Use Cases

### Get all open bugs assigned to you
```bash
GET /api/workitems/?work_item_type=Bug&state=Active&assigned_to=your.email@example.com
```

### Get all tasks in the current sprint
```bash
GET /api/workitems/?work_item_type=Task&iteration_path=MyProject\Sprint 5
```

### Find work items with urgent tag
```bash
GET /api/workitems/?tags=urgent
```

### Get recently modified work items
```bash
GET /api/workitems/updated-since/?since_date=2024-04-01
```

### Search for work items about authentication
```bash
GET /api/workitems/search/?search_text=authentication
```

## Error Responses

All endpoints return standardized error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid query parameters",
  "details": {
    "field_name": ["Error message"]
  }
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to fetch work items",
  "details": "Detailed error message"
}
```

## Testing

You can test the API using curl, Postman, or any HTTP client:

```bash
# Health check
curl http://localhost:8000/api/workitems/health/

# Get bugs
curl "http://localhost:8000/api/workitems/?work_item_type=Bug&state=Active"

# Search
curl "http://localhost:8000/api/workitems/search/?search_text=login"

# Get by IDs
curl -X POST http://localhost:8000/api/workitems/by-ids/ \
  -H "Content-Type: application/json" \
  -d '{"ids": [12345, 12346]}'
```

## Available Work Item Types

Common work item types (may vary by project template):
- Bug
- Task
- User Story
- Feature
- Epic
- Issue
- Test Case
- Impediment

## Available States

Common states (may vary by work item type):
- New
- Active
- Resolved
- Closed
- Removed
- In Progress
- Done

## Notes

- All endpoints support CORS for frontend integration
- The API uses pagination with a default page size of 100
- Maximum results per query is 1000
- Dates should be in ISO 8601 format (YYYY-MM-DD)
- The PAT must have at least read permissions for work items
