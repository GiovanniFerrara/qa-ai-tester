# QA AI Tester (MVP1)

AI-assisted QA orchestration scaffold that combines a NestJS control plane with Playwright browser workers, OpenAI/Claude provider adapters, and strongly typed QA artifacts.

## Project Layout

This is a monorepo with separate backend and frontend packages:

### Backend (`backend/`)
- `src/app.module.ts` – NestJS root module wiring config, providers, orchestrator, and worker modules.
- `src/orchestrator` – Run management services, REST controller for runs, and scaffolded execution pipeline.
- `src/providers` – OpenAI and Anthropic provider helpers plus shared JSON schema conversion.
- `src/worker` – Playwright gateway that executes computer-use actions and captures artifacts.
- `src/models` – Zod contracts defining TaskSpec, Finding, QAReport, tool schemas, and run metadata.
- `src/tasks` – In-memory registry/controller exposing available QA tasks.
- `src/services` – KPI oracle service (static values or API endpoint fetch).
- `scripts/generate-schemas.ts` – Emits JSON Schemas derived from Zod contracts (for provider definitions, validation, tooling).
- `tests/auth.setup.ts` – Placeholder Playwright project to generate authenticated storage state.

### Frontend (`frontend/`)
- React + Vite web UI for task management, run creation, and QA report visualization.

## Prerequisites

- Node.js 20+
- OpenAI and/or Claude API keys in `backend/.env`
- Playwright browsers installed (`cd backend && npx playwright install`)
- Authenticated storage state saved at `backend/playwright/.auth/analyst.json` (or update `STORAGE_STATE_PATH`)

## Environment Variables

Configure via `backend/.env`:

```
OPENAI_API_KEY=...
CLAUDE_API_KEY=...
BASE_URL=https://your-sandbox-app.example
KPI_BASE_URL=https://your-api-host.example
STORAGE_STATE_PATH=playwright/.auth/analyst.json
ARTIFACT_DIR=artifacts
DEFAULT_PROVIDER=openai
OPENAI_MODEL=o4-mini
CLAUDE_MODEL=claude-3-7-sonnet-20250219
KPI_ENDPOINT=/api/kpi
KPI_TOLERANCE_PERCENT=1
```

## Install & Build

```bash
# Install root dependencies (for dev scripts)
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Build everything
npm run build
```

## Development Scripts

### Backend & API
- `npm run start:dev` – Launch NestJS orchestrator (REST API at `http://localhost:3005/api`).
- `npm run worker` – Manual worker smoke run (captures a screenshot using the authenticated storage state).
- `npm run generate:schema` – Output JSON schemas to the `schemas/` directory.
- `npm run playwright:test` – Execute Playwright tests (once storage state setup is complete).
- `npm run lint` – Lint TypeScript sources.

### Frontend UI
- `npm run dev` – Launch both backend API and frontend UI in development mode (with hot reload)
  - Backend: `http://localhost:3005/api`
  - Frontend: `http://localhost:5173`
- `npm run build:frontend` – Build frontend for production
- `npm run build` – Build both backend and frontend

### Production
After building both frontend and backend, start the production server:
```bash
npm start
```
The backend serves the built frontend at `http://localhost:3005`

## Web UI

The project now includes a modern React-based web interface for managing QA tests:

### Features
- 🎯 Task selection with visual cards
- 🚀 Simple form to start new QA runs
- 📊 Real-time run history with status updates
- 📈 Detailed QA reports with findings visualization
- 🎨 Responsive design with modern styling

### Accessing the UI
- **Development**: `http://localhost:5173` (with `npm run dev`)
- **Production**: `http://localhost:3005` (after `npm run build` and `npm start`)

See [`frontend/README.md`](frontend/README.md) for more details.

## API Endpoints (scaffold)

| Method | Path            | Description                                |
| ------ | --------------- | ------------------------------------------ |
| GET    | `/api/tasks`    | List registered `TaskSpec` definitions     |
| POST   | `/api/runs`     | Kick off a QA run (`{"taskId": "..."} `)   |
| GET    | `/api/runs`     | List in-memory run records & artifacts     |
| GET    | `/api/runs/:id` | Retrieve the most recent QAReport for run |

## Current Limitations

- The provider interaction loop (OpenAI/Claude tool calls) is scaffolded but not yet wired; `RunExecutionService` currently generates a placeholder QAReport that references KPI oracle output.
- Assertion logging and transcript capture will be completed once the LLM tool-call loop is implemented.
- KPI oracle requests assume the backend sandbox responds with JSON payloads compatible with the current schema.
- Artifact persistence is filesystem-based; swap in S3/GCS/etc. for production.

## Next Steps

1. Implement the provider loop that iterates on tool calls (computer_action, dom_snapshot, kpi_oracle, assert) and aggregates the structured QAReport returned by the LLM.
2. Stream tool-call events and LLM responses into the run log/transcript and expose download endpoints.
3. Extend KPI oracle with tolerance evaluation and data-diff utilities, then feed results into assertion logging.
4. Integrate an AI Test-Author agent (per requirements) to auto-generate deterministic Playwright tests.
5. Add persistence (database/object storage) and CI wiring for artifacts and QAReport ingestion.
