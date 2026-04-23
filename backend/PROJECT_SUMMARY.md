# Azure DevOps Work Items Django API - Project Summary

## ✅ Project Setup Complete

Your Django application is now fully configured with Azure DevOps Work Items integration!

## � Important: Area Path Constraint

**⚠️ All API queries are automatically scoped to:**

- **Project:** `Global IS Infrastructure`  
- **Area Path:** `Global IS Infrastructure\Cloud`

All configuration constants are centralized in `workitems/utils/constants.py`. See [workitems/CONSTANTS.md](workitems/CONSTANTS.md) for details.

## �📁 Project Structure

```
backend/
├── .env                          # Azure DevOps credentials
├── .venv/                        # Virtual environment
├── manage.py                     # Django management script
├── pyproject.toml               # UV dependencies
├── USAGE_EXAMPLES.md            # API usage examples
├── backend/
│   ├── settings.py              # Django settings (configured)
│   ├── urls.py                  # Main URL routing
│   └── ...
└── workitems/
    ├── azure_devops_service.py  # Azure DevOps service layer
    ├── serializers.py           # Request/Response serializers
    ├── views.py                 # API endpoints
    ├── urls.py                  # Workitems URL routing
    ├── README.md                # API documentation
    ├── CONSTANTS.md             # Constants configuration guide
    └── utils/
        ├── __init__.py
        └── constants.py         # Centralized constants
```

## 🔧 Configuration

### Environment Variables (.env)
```
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/Turbo-B
AZURE_DEVOPS_PAT=your-personal-access-token
AZURE_DEVOPS_PROJECT=Global IS Infrastructure
```

### Dependencies Installed
- ✅ `django` (6.0.4)
- ✅ `azure-devops` (7.1.0b4)
- ✅ `djangorestframework` (3.17.1)
- ✅ `python-dotenv` (1.2.2)
- ✅ `django-cors-headers` (4.9.0)

## 🚀 Getting Started

### Start the Server
```powershell
cd backend
.venv\Scripts\activate
python manage.py runserver
```

The API will be available at: `http://localhost:8000`

### Test the Health Endpoint
```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:8000/api/workitems/health/"

# Or using curl
curl http://localhost:8000/api/workitems/health/
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Azure DevOps connection is configured",
  "project": "Global IS Infrastructure"
}
```

## 📡 Available API Endpoints

### 1. **Health Check**
- **GET** `/api/workitems/health/`
- Verify Azure DevOps connection

### 2. **List Work Items with Filters**
- **GET** `/api/workitems/`
- **Filters:** `work_item_type`, `state`, `assigned_to`, `area_path`, `iteration_path`, `tags`, `top`

**Example:**
```bash
GET /api/workitems/?work_item_type=Bug&state=Active&top=50
```

### 3. **Get Work Items by IDs**
- **POST** `/api/workitems/by-ids/`
- **Body:** `{"ids": [12345, 12346]}`

### 4. **Search Work Items**
- **GET** `/api/workitems/search/`
- **Params:** `search_text` (required), `work_item_types`, `top`

**Example:**
```bash
GET /api/workitems/search/?search_text=authentication&work_item_types=Bug,Task
```

### 5. **Get Recently Updated Items**
- **GET** `/api/workitems/updated-since/`
- **Params:** `since_date` (required, YYYY-MM-DD), `work_item_type`, `top`

**Example:**
```bash
GET /api/workitems/updated-since/?since_date=2024-04-01&work_item_type=Bug
```

### 6. **Custom WIQL Query**
- **POST** `/api/workitems/query/`
- **Body:** `{"query": "SELECT...", "top": 100}`

**Example:**
```json
{
  "query": "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.TeamProject] = 'Global IS Infrastructure' AND [System.State] = 'Active'",
  "top": 100
}
```

## 📝 Quick Examples

### PowerShell - Get All Active Bugs
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/workitems/?work_item_type=Bug&state=Active"
Write-Host "Found $($response.count) bugs"
```

### Python - Search for Work Items
```python
import requests

response = requests.get(
    'http://localhost:8000/api/workitems/search/',
    params={'search_text': 'login', 'top': 20}
)

data = response.json()
for item in data['results']:
    print(f"{item['id']}: {item['fields']['System.Title']}")
```

### JavaScript - Get Work Items by IDs
```javascript
const response = await fetch('http://localhost:8000/api/workitems/by-ids/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: [12345, 12346] })
});
const data = await response.json();
console.log(data.results);
```

## 🔍 Common Work Item Types
- Bug
- Task
- User Story
- Feature
- Epic
- Issue
- Test Case

## 🔍 Common States
- New
- Active
- Resolved
- Closed
- In Progress
- Done

## 📚 Documentation Files

1. **workitems/README.md** - Complete API documentation with all endpoints
2. **USAGE_EXAMPLES.md** - Practical usage examples in multiple languages

## 🔐 Security Notes

- ✅ CORS configured for `localhost:3000` and `localhost:8080`
- ✅ PAT stored in `.env` file (not in version control)
- ⚠️ Make sure to add `.env` to `.gitignore`
- ⚠️ For production, use environment-specific configurations

## 🛠️ Next Steps

1. **Test the API:**
   ```powershell
   # Start the server
   cd backend
   python manage.py runserver
   
   # In another terminal, test health endpoint
   curl http://localhost:8000/api/workitems/health/
   ```

2. **Try different queries:**
   - Get all bugs: `GET /api/workitems/?work_item_type=Bug`
   - Search: `GET /api/workitems/search/?search_text=yourtext`
   - Recent updates: `GET /api/workitems/updated-since/?since_date=2024-04-01`

3. **Integrate with frontend:**
   - Use the CORS-enabled API from your React/Vue/Angular app
   - All endpoints return JSON responses

4. **Customize as needed:**
   - Add more filters in `azure_devops_service.py`
   - Create additional endpoints in `views.py`
   - Modify serializers in `serializers.py`

## 🐛 Troubleshooting

### Connection Issues
If you get connection errors:
1. Verify your PAT in `.env` has read permissions
2. Check the organization URL is correct
3. Ensure the project name matches exactly

### Module Not Found
If you get import errors:
```powershell
cd backend
.venv\Scripts\activate
uv sync
```

### Server Won't Start
```powershell
# Run system check
python manage.py check

# Check for migration issues
python manage.py migrate
```

## 📞 Support

For issues or questions:
- Check [workitems/README.md](workitems/README.md) for detailed API docs
- Review [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md) for code examples
- Django documentation: https://docs.djangoproject.com/
- Azure DevOps API: https://learn.microsoft.com/en-us/rest/api/azure/devops/

---

**Status:** ✅ All configured and ready to use!
