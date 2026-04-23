# Global Cloud - Dashboard Backend

Django REST API for querying Azure DevOps Work Items with advanced filtering capabilities.

## 🔒 Important: Query Constraints

**All API queries are automatically scoped to:**
- **Project:** `Global IS Infrastructure`
- **Area Path:** `Global IS Infrastructure\Cloud`

This ensures all results are limited to the Cloud area. Modify `workitems/utils/constants.py` to change these constraints.

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- [UV](https://github.com/astral-sh/uv) package manager
- Azure DevOps Personal Access Token (PAT) with Work Items read permissions

### Setup

1. **Clone the repository**
   ```powershell
   git clone <repository-url>
   cd backend
   ```

2. **Create virtual environment and install dependencies**
   ```powershell
   uv venv
   .venv\Scripts\activate
   uv sync
   ```

3. **Configure environment variables**
   ```powershell
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and add your Azure DevOps credentials
   # AZURE_DEVOPS_ORG_URL=https://dev.azure.com/YourOrg
   # AZURE_DEVOPS_PAT=YourPersonalAccessToken
   # AZURE_DEVOPS_PROJECT=YourProjectName
   ```

4. **Run migrations** (optional, for Django admin)
   ```powershell
   python manage.py migrate
   ```

5. **Start the development server**
   ```powershell
   python manage.py runserver
   ```

The API will be available at `http://localhost:8000`

### Test the API

```powershell
# Health check
curl http://localhost:8000/api/workitems/health/

# Get all work items (limited to Cloud area)
curl http://localhost:8000/api/workitems/

# Get active bugs
curl "http://localhost:8000/api/workitems/?work_item_type=Bug&state=Active"
```

## 📡 API Endpoints

### 1. Health Check
**GET** `/api/workitems/health/`

Verify Azure DevOps connection is working.

### 2. List Work Items
**GET** `/api/workitems/`

**Query Parameters:**
- `work_item_type` - Bug, Task, User Story, Feature, Epic, etc.
- `state` - New, Active, Resolved, Closed, etc.
- `assigned_to` - Email or display name
- `area_path` - Area path filter (in addition to default Cloud constraint)
- `iteration_path` - Iteration/sprint path
- `tags` - Comma-separated tags
- `top` - Max results (default: 200, max: 1000)

**Example:**
```bash
GET /api/workitems/?work_item_type=Bug&state=Active&top=50
```

### 3. Get Work Items by IDs
**POST** `/api/workitems/by-ids/`

**Body:**
```json
{
  "ids": [12345, 12346, 12347]
}
```

### 4. Search Work Items
**GET** `/api/workitems/search/`

**Query Parameters:**
- `search_text` (required) - Text to search in titles
- `work_item_types` - Comma-separated types
- `top` - Max results (default: 100)

**Example:**
```bash
GET /api/workitems/search/?search_text=authentication&work_item_types=Bug,Task
```

### 5. Recently Updated Items
**GET** `/api/workitems/updated-since/`

**Query Parameters:**
- `since_date` (required) - ISO date (YYYY-MM-DD)
- `work_item_type` - Optional type filter
- `top` - Max results (default: 200)

**Example:**
```bash
GET /api/workitems/updated-since/?since_date=2024-04-01&work_item_type=Bug
```

### 6. Custom WIQL Query
**POST** `/api/workitems/query/`

Execute custom Work Item Query Language queries.

**Body:**
```json
{
  "query": "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.TeamProject] = 'YourProject' AND [System.State] = 'Active'",
  "top": 100
}
```

## 📁 Project Structure

```
backend/
├── .env                      # Environment variables (git-ignored)
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── manage.py                 # Django management
├── pyproject.toml            # UV dependencies
├── backend/                  # Django project settings
│   ├── settings.py           # Main settings
│   └── urls.py               # Root URL config
└── workitems/                # Work items app
    ├── views.py              # API endpoints
    ├── serializers.py        # Request/response validation
    ├── urls.py               # App URL routing
    ├── azure_devops_service.py  # Azure DevOps integration
    ├── utils/
    │   └── constants.py      # Centralized constants
    ├── README.md             # Detailed API docs
    └── CONSTANTS.md          # Constants configuration guide
```

## 🔧 Configuration

### Modifying Area Path Constraint

Edit `workitems/utils/constants.py`:

```python
DEFAULT_PROJECT = "Your Project Name"
DEFAULT_AREA_PATH = "Your Project\\Your Area"
```

Restart the server to apply changes.

### CORS Configuration

Default CORS origins in `backend/settings.py`:
- `http://localhost:3000`
- `http://localhost:8080`

Add more origins as needed for your frontend.

## 📚 Documentation

- **[workitems/README.md](workitems/README.md)** - Complete API documentation
- **[workitems/CONSTANTS.md](workitems/CONSTANTS.md)** - Constants configuration guide
- **[USAGE_EXAMPLES.md](USAGE_EXAMPLES.md)** - Code examples (Python, JavaScript, PowerShell)
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Project overview

## 🧪 Testing

Run the test script to verify all endpoints:

```powershell
python test_api.py
```

## 🔐 Security Notes

- Never commit `.env` file with real credentials
- PAT should have minimal required permissions (Work Items: Read)
- Use environment-specific settings for production
- Enable Django's security features for production deployment

## 📦 Dependencies

Core dependencies (managed by UV):
- `django` - Web framework
- `djangorestframework` - REST API framework
- `azure-devops` - Azure DevOps Python SDK
- `python-dotenv` - Environment variable management
- `django-cors-headers` - CORS support

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

[Add your license here]

## 🆘 Support

For issues or questions, refer to:
- [Django Documentation](https://docs.djangoproject.com/)
- [Azure DevOps REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops/)
- [Django REST Framework](https://www.django-rest-framework.org/)
