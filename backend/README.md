# QA AI Tester - Backend

NestJS-based backend API for AI-assisted QA orchestration with Playwright browser workers.

## Structure

- `src/` - Main source code
  - `orchestrator/` - Run management and execution
  - `providers/` - OpenAI and Anthropic integrations
  - `worker/` - Playwright browser automation
  - `models/` - Zod schemas and contracts
  - `tasks/` - Task registry
  - `services/` - KPI oracle and utilities
  - `config/` - Environment configuration
- `scripts/` - Utility scripts
- `schemas/` - Generated JSON schemas
- `tests/` - Playwright test setup

## Prerequisites

- Node.js 20+
- Playwright browsers: `npx playwright install`

## Environment Setup

Create a `.env` file with:

```
OPENAI_API_KEY=your_openai_key
CLAUDE_API_KEY=your_claude_key
BASE_URL=https://your-test-app.example
STORAGE_STATE_PATH=playwright/.auth/analyst.json
ARTIFACT_DIR=artifacts
DEFAULT_PROVIDER=openai
OPENAI_MODEL=gpt-4
CLAUDE_MODEL=claude-3-7-sonnet-20250219
KPI_BASE_URL=https://your-api-host.example
KPI_ENDPOINT=/api/kpi
KPI_TOLERANCE_PERCENT=1
```

## Development

```bash
npm install
npm run start:dev
```

API available at `http://localhost:3005/api`

## Scripts

- `npm run build` - Build the application
- `npm start` - Start production server
- `npm run start:dev` - Start with hot reload
- `npm run worker` - Manual worker test
- `npm run generate:schema` - Generate JSON schemas
- `npm run test` - Run tests
- `npm run lint` - Lint code

## API Endpoints

- `GET /api/tasks` - List available tasks
- `POST /api/runs` - Create new run
- `GET /api/runs` - List all runs
- `GET /api/runs/:id` - Get run report

## Computer-Use Workflow

- Ensure `OPENAI_API_KEY` is set; the backend defaults to OpenAI for the computer-use loop.
- The orchestration service captures an initial screenshot, calls the `computer-preview` tool, and relays subsequent `computer_call` and function tool results until a structured `QAReport` is produced.
- Artifacts per run:
  - `qa-report.json` – structured model output adhering to the schema in `schemas/qaReport.schema.json`
  - `computer-use-events.json` – chronological log of DOM snapshots, KPI calls, assertions, and computer actions
  - `model-responses.jsonl` – condensed transcript with per-step usage figures
  - `trace.zip` & `screenshots/` – Playwright trace and viewport captures
- Configure `BASE_URL` for the web app and (optionally) `KPI_BASE_URL` when the model should query backend KPI data with the `kpi_oracle` tool.
