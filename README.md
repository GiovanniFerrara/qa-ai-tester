# QA AI Tester

AI-powered automated quality assurance system that uses AI models (OpenAI GPT or Anthropic Claude) to test web applications through browser automation. The system combines a NestJS control plane with Playwright browser workers, multi-provider AI adapters, and strongly typed QA artifacts to deliver comprehensive, AI-driven testing.

## Overview

**QA AI Tester** orchestrates AI agents to automatically test web applications by:
- Controlling a real browser through Playwright
- Using AI to interact with your application (clicking, typing, navigating)
- Analyzing UI, functionality, accessibility, and performance
- Capturing evidence (screenshots, DOM snapshots, traces)
- Generating structured QA reports with categorized findings

### Key Features

- 🤖 **AI-Powered Testing** - Uses OpenAI GPT or Anthropic Claude for intelligent test execution
- 🌐 **Real Browser Automation** - Playwright-based browser control for accurate testing
- 🔧 **Computer-Use Loop** - Fully implemented AI-driven interaction loop with tool calls
- 📊 **Structured Reports** - Detailed QA reports with severity-categorized findings
- 🎯 **Task Management** - Web UI for creating, managing, and running QA tasks
- 📸 **Visual Evidence** - Screenshots, DOM snapshots, and Playwright traces
- 🔄 **Real-Time Updates** - Event streaming for live run monitoring
- 🔐 **Authentication Support** - Persistent login state for protected applications
- 📈 **KPI Monitoring** - Optional integration with backend metrics endpoints

## Project Structure

```
qa-ai-tester/
├── backend/                    # NestJS backend API
│   ├── src/
│   │   ├── orchestrator/      # Run management and execution pipeline
│   │   ├── providers/         # OpenAI & Anthropic integrations
│   │   ├── worker/            # Playwright browser gateway
│   │   ├── tasks/             # Task registry and storage
│   │   ├── models/            # Zod schemas and TypeScript contracts
│   │   └── services/          # KPI oracle and utilities
│   ├── tests/
│   │   └── auth.setup.ts      # Playwright authentication setup
│   ├── schemas/               # Generated JSON schemas
│   └── .env                   # Configuration (create from .env.example)
├── frontend/                   # React + Vite web UI
│   └── src/
│       ├── components/        # UI components
│       └── api.ts            # API client
└── package.json              # Workspace scripts
```

## Prerequisites

- **Node.js** 20 or higher
- **npm** (comes with Node.js)
- **API Keys**: OpenAI and/or Anthropic Claude API key
- **Playwright**: Browsers will be installed during setup

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install Playwright browsers
cd backend && npx playwright install
```

### 2. Configure API Keys

Create `backend/.env` file:

```env
# Required: At least one AI provider API key
OPENAI_API_KEY=sk-proj-...your-openai-key
CLAUDE_API_KEY=sk-ant-...your-anthropic-key

# The web application you want to test
BASE_URL=https://your-app-to-test.com

# Default AI provider (openai or anthropic)
DEFAULT_PROVIDER=openai

# AI model selection
OPENAI_MODEL=computer-use-preview
CLAUDE_MODEL=claude-3-7-sonnet-20250219

# Authentication (optional - see Authentication Setup below)
STORAGE_STATE_PATH=playwright/.auth/analyst.json

# Artifacts storage
ARTIFACT_DIR=artifacts

# KPI monitoring (optional)
KPI_BASE_URL=https://your-api-host.example
KPI_ENDPOINT=/api/kpi
KPI_TOLERANCE_PERCENT=1

# Task storage
TASKS_DB_PATH=data/tasks.json
```

#### Where to Get API Keys

**OpenAI:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-proj-`)

**Anthropic Claude:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new key
5. Copy the key (starts with `sk-ant-`)

**Note:** You only need one provider to get started, but having both gives you flexibility to choose models.

### 3. Authentication Setup (If Needed)

If your application requires login, configure the authentication setup:

**Edit [`backend/tests/auth.setup.ts`](backend/tests/auth.setup.ts:1):**

```typescript
import { test as setup } from '@playwright/test';

setup('create authenticated storage state', async ({ page }) => {
  const storagePath = process.env.STORAGE_STATE_PATH ?? 'playwright/.auth/analyst.json';
  
  // Navigate to your login page
  await page.goto('https://your-app.com/login');
  
  // Fill in login credentials
  await page.fill('#username', 'test@example.com');
  await page.fill('#password', 'your-password');
  
  // Submit login form
  await page.click('button[type="submit"]');
  
  // Wait for successful login (adjust selector to your app)
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  
  // Save the authenticated session
  await page.context().storageState({ path: storagePath });
  console.log(`Storage state saved to ${storagePath}`);
});
```

**Key Points:**
- Replace selectors (`#username`, `#password`) with your app's actual form field selectors
- Update the login URL and post-login URL pattern (`**/dashboard`)
- For multi-factor authentication, add additional steps as shown in the default example
- The saved session will be reused for all test runs

**Run the setup to generate the authentication file:**

```bash
cd backend
npm run playwright:test
```

This creates [`backend/playwright/.auth/analyst.json`](backend/playwright/.auth/analyst.json:1) with your authenticated session, which will be used for all subsequent runs.

### 4. Start the Application

**Development Mode (Recommended):**

```bash
# From root directory
npm run dev
```

This starts:
- **Backend API**: http://localhost:3005/api
- **Frontend UI**: http://localhost:5173

**Production Mode:**

```bash
# Build everything
npm run build

# Start production server
npm start
```

Access at: http://localhost:3005

## Using the System

### Via Web UI

1. **Open the Interface**
   - Development: http://localhost:5173
   - Production: http://localhost:3005

2. **Create a Task** (Tasks Manager)
   - Click "Tasks Manager" in navigation
   - Click "New Task"
   - Fill in task details:
     - Name and description
     - Target route (e.g., `/dashboard`)
     - Select AI provider and model
   - Save the task

3. **Start a QA Run**
   - Click "Start Run" in navigation
   - Select a task from the dropdown
   - (Optional) Override provider/model
   - Click "Start Run"

4. **Monitor Progress**
   - Click "Run History" to see all runs
   - Status updates in real-time
   - View live screenshots and events

5. **Review Reports**
   - Click on any completed run
   - Review findings by severity:
     - 🔴 Critical - App-breaking issues
     - 🟠 High - Major functional problems
     - 🟡 Medium - Moderate UX issues
     - 🔵 Low - Minor problems
     - ⚪ Info - Observations and suggestions

### Via API

**List Available Tasks:**
```bash
curl http://localhost:3005/api/tasks
```

**Create a New Task:**
```bash
curl -X POST http://localhost:3005/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Homepage Test",
    "description": "Test homepage functionality",
    "route": "/",
    "provider": "openai",
    "model": "computer-use-preview"
  }'
```

**Start a QA Run:**
```bash
curl -X POST http://localhost:3005/api/runs \
  -H "Content-Type: application/json" \
  -d '{"taskId": "your-task-id"}'
```

**Get Run History:**
```bash
curl http://localhost:3005/api/runs
```

**Get Run Report:**
```bash
curl http://localhost:3005/api/runs/{runId}
```

## How It Works

### Computer-Use Orchestration

The system implements a complete AI-driven computer-use loop:

1. **Initialization**
   - Starts Playwright browser with authenticated session
   - Navigates to target route
   - Captures initial screenshot

2. **AI Interaction Loop**
   - Sends screenshot to AI (OpenAI or Claude)
   - AI analyzes the page and decides actions
   - Executes tool calls:
     - `computer_action` - Click, type, scroll, navigate
     - `dom_snapshot` - Capture page structure
     - `kpi_oracle` - Query backend metrics
     - `assert` - Verify conditions
   - Captures results and feeds back to AI
   - Repeats until task completion

3. **Report Generation**
   - AI produces structured QA report
   - Findings categorized by severity and type
   - Each finding includes evidence (screenshots, DOM data)
   - Suggestions for fixes and improvements

### Artifacts Per Run

Each run generates comprehensive artifacts in [`backend/artifacts/{runId}/`](backend/artifacts:1):

- **`qa-report.json`** - Structured QA report with findings
- **`computer-use-events.json`** - Chronological log of all tool calls and actions
- **`model-responses.jsonl`** - AI model responses with token usage
- **`trace.zip`** - Full Playwright trace for debugging
- **`screenshots/`** - Screenshots at each step

## Available Scripts

### Root Scripts
- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build both backend and frontend
- `npm start` - Start production server (backend serves frontend)

### Backend Scripts
- `npm run start:dev` - Start backend with hot reload
- `npm run worker` - Manual worker test (captures screenshot)
- `npm run generate:schema` - Generate JSON schemas from Zod models
- `npm run playwright:test` - Run auth setup
- `npm run lint` - Lint TypeScript code
- `npm run test` - Run tests

### Frontend Scripts
- `npm run dev` - Start Vite dev server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Advanced Configuration

### AI Model Selection

**OpenAI Models:**
- `computer-use-preview` - Most capable, best for complex testing
- `computer-use-preview-turbo` - Faster, more cost-effective
- `o1-mini` - Optimized for reasoning tasks

**Anthropic Models:**
- `claude-3-opus-20240229` - Highest capability
- `claude-3-sonnet-20240229` - Balanced performance
- `claude-3-7-sonnet-20250219` - Latest, improved reasoning

### KPI Monitoring

Enable backend metric validation:

```env
KPI_BASE_URL=https://api.your-app.com
KPI_ENDPOINT=/api/metrics
KPI_TOLERANCE_PERCENT=5
```

The AI will:
1. Fetch metrics from your API endpoint
2. Compare actual vs expected values
3. Report deviations outside tolerance threshold

### Custom Task Configuration

Tasks support extensive customization:
- Target route and application URL
- Provider and model selection
- Custom instructions for the AI
- Specific areas to focus on

## Troubleshooting

### "Cannot find module" or dependency errors
```bash
# Reinstall all dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### "Playwright browsers not found"
```bash
cd backend
npx playwright install
```

### "API key invalid or missing"
- Verify your `.env` file has correct API keys
- Ensure keys start with `sk-proj-` (OpenAI) or `sk-ant-` (Anthropic)
- Check that the key is active in your provider dashboard

### "Storage state file not found"
- Run `cd backend && npm run playwright:test` to generate auth state
- Or configure `STORAGE_STATE_PATH` to point to an existing file
- For public sites, authentication is optional

### "Connection refused" errors
- Ensure backend is running: `npm run dev` or `npm run start:dev` in backend/
- Check that port 3005 is not in use
- Verify `BASE_URL` points to an accessible application

### Frontend can't reach API
- Confirm backend is running on port 3005
- Check [`frontend/vite.config.ts`](frontend/vite.config.ts:1) proxy configuration
- In production, backend serves frontend automatically

## Development

### Architecture

- **Backend**: NestJS with dependency injection, modular architecture
- **Frontend**: React 18 with TypeScript and Vite
- **AI Integration**: OpenAI and Anthropic SDKs with streaming support
- **Browser Automation**: Playwright for cross-browser testing
- **Schema Validation**: Zod for runtime type safety
- **Events**: Real-time event streaming for run updates

### Key Technologies

- TypeScript for end-to-end type safety
- NestJS for scalable backend architecture
- React + Vite for fast frontend development
- Playwright for reliable browser automation
- Zod for schema definition and validation
- Server-Sent Events (SSE) for real-time updates

## API Endpoints

| Method | Path                    | Description                                  |
|--------|-------------------------|----------------------------------------------|
| GET    | `/api/tasks`            | List all registered tasks                    |
| POST   | `/api/tasks`            | Create a new task                            |
| PUT    | `/api/tasks/:id`        | Update an existing task                      |
| DELETE | `/api/tasks/:id`        | Delete a task                                |
| POST   | `/api/runs`             | Start a new QA run                           |
| GET    | `/api/runs`             | List all runs with status                    |
| GET    | `/api/runs/:id`         | Get detailed report for specific run         |
| GET    | `/api/runs/:id/events`  | Stream real-time events for a run (SSE)      |
| GET    | `/api/artifacts/:path*` | Access run artifacts (screenshots, traces)   |

## Production Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Configure environment:**
   - Set production `BASE_URL`
   - Configure secure API keys
   - Set up persistent storage for artifacts
   - Configure task database path

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Considerations:**
   - Use a process manager (PM2, systemd)
   - Configure reverse proxy (nginx, Apache)
   - Set up SSL/TLS certificates
   - Implement artifact cleanup/archival
   - Monitor disk usage for artifacts
   - Consider external storage (S3, GCS) for artifacts

## Contributing

Contributions are welcome! Areas for improvement:
- Additional AI provider integrations
- Enhanced reporting visualizations
- Improved error handling and recovery
- Performance optimizations
- Additional tool implementations
- Test coverage expansion

## License

See LICENSE file for details.

## Support

For issues, questions, or contributions:
- Review the documentation in this README
- Check [`backend/README.md`](backend/README.md:1) for backend details
- Check [`frontend/README.md`](frontend/README.md:1) for frontend details
- Review [`USAGE.md`](USAGE.md:1) for comprehensive usage guide
