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
KPI_ENDPOINT=/api/kpi
KPI_TOLERANCE_PERCENT=1
```

## Development

```bash
npm install
npm run start:dev
```

API available at `http://localhost:3000/api`

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