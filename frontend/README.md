# Global Cloud Dashboard — Frontend

Modern React dashboard for the Global Cloud Dashboard application. Built with Vite + React + TypeScript + Tailwind CSS, with Recharts for visualizations and a streaming chat (SSE) for the AI Assistant powered by the GitHub Copilot SDK backend.

## Tech stack

- Vite 5 + React 18 + TypeScript
- Tailwind CSS 3 (custom dark/light theme via CSS variables)
- React Router v6
- Recharts (charts)
- Axios (REST) + native fetch + ReadableStream (SSE)
- lucide-react (icons), marked + DOMPurify (Markdown rendering)

## Project structure

```
frontend/
├── index.html
├── package.json
├── vite.config.ts            # /api proxied to http://localhost:8000
├── tailwind.config.js        # darkMode: 'class', custom tokens
├── postcss.config.js
├── tsconfig.json
└── src/
    ├── main.tsx              # ThemeProvider, ToastProvider, Router
    ├── App.tsx               # Routes
    ├── index.css             # Tailwind + theme tokens + Markdown styles
    ├── api/
    │   ├── client.ts         # Axios instance (baseURL /api/workitems)
    │   ├── workItems.ts      # list/search/recent + normalize()
    │   ├── chat.ts           # streamChat() SSE + sendChat() + clearChat()
    │   └── types.ts
    ├── hooks/
    │   ├── useWorkItems.ts
    │   └── useDebounce.ts
    ├── lib/
    │   ├── utils.ts          # cn(), formatDate(), initials()...
    │   ├── theme.tsx         # ThemeProvider (light/dark + localStorage)
    │   └── selectors.ts      # countBy, trendByDay, leaderboard…
    ├── components/
    │   ├── layout/           # Sidebar, Topbar, AppLayout, PageHeader
    │   └── ui/               # Card, Button, Input, Badge, DataTable,
    │                         # ChartContainer, KpiCard, Skeleton,
    │                         # EmptyState, ErrorState, Toast
    └── pages/
        ├── Dashboard.tsx
        ├── WorkItems.tsx
        ├── Analytics.tsx
        ├── TeamInsights.tsx
        └── AIChat.tsx
```

## Run

Make sure the Django backend is running on port 8000:

```powershell
cd ..\backend
uv run python manage.py runserver
```

In another terminal, install and start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies all `/api/*` requests to `http://localhost:8000`, so there are no CORS concerns in dev.

## Features

- **Dashboard** — KPI cards (active, overdue, high-priority bugs, completed-30d), 30-day trend line chart, priority pie, state bar chart, recent updates table.
- **Work Items** — Filters (type, state, assignee, tag, free-text search), sortable + paginated DataTable, badges for type / state / priority.
- **Analytics** — Throughput area chart, cumulative completion, type pie, top areas, state distribution.
- **Team Insights** — Workload bar chart, completed-leaderboard with avatars, full contributor table with completion %.
- **AI Assistant** — ChatGPT-style UI with SSE streaming, GitHub-flavored Markdown (sanitized), example prompt chips, stop-generation button, session persistence in `localStorage`, clear-chat.
- **UX polish** — Light/dark mode toggle, collapsible sidebar, skeleton loaders, empty states, error states with retry, toast notifications, smooth scrolling, soft shadows, rounded-2xl cards.

## Backend endpoints used

| Endpoint                                  | Used by              |
|-------------------------------------------|----------------------|
| `GET  /api/workitems/`                    | All data pages       |
| `GET  /api/workitems/search/?q=`          | (available, optional)|
| `GET  /api/workitems/updated-since/`      | (available, optional)|
| `POST /api/workitems/copilot/chat/stream/`| AI Assistant (SSE)   |
| `POST /api/workitems/copilot/chat/clear/` | AI Assistant         |

Analytics & Team Insights are derived client-side from `/api/workitems/?top=200`.

## Build

```powershell
npm run build
npm run preview
```

The `dist/` folder can be served from any static host. For production, configure the host or backend to serve the SPA and proxy `/api/*` to the Django service.
