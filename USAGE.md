# QA AI Tester - Complete Usage Guide

## What Is This?

**QA AI Tester** is an AI-powered automated quality assurance system that uses AI models (OpenAI GPT or Anthropic Claude) to test web applications automatically.

### What It Does

1. **Automated Browser Testing** - Uses Playwright to control a real browser
2. **AI-Powered Analysis** - AI agents analyze your web application for bugs, usability issues, and accessibility problems
3. **Smart Interactions** - AI can click buttons, fill forms, navigate pages, and validate behavior
4. **Detailed Reports** - Generates structured QA reports with findings categorized by severity
5. **Visual Evidence** - Captures screenshots and DOM snapshots as proof

### Use Cases

- **Automated QA Testing** - Let AI test your web app automatically
- **Regression Testing** - Verify nothing broke after changes
- **Accessibility Audits** - Find accessibility issues
- **Usability Testing** - Identify UX problems
- **Performance Monitoring** - Check KPIs and metrics

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Install Playwright browsers
cd ../backend && npx playwright install
```

### 2. Configure Environment

Edit `backend/.env`:

```env
# AI Provider API Keys (get from OpenAI or Anthropic)
OPENAI_API_KEY=sk-...your-openai-key
CLAUDE_API_KEY=sk-ant-...your-claude-key

# Your web app to test
BASE_URL=https://your-app-to-test.com

# Settings
DEFAULT_PROVIDER=openai
OPENAI_MODEL=computer-use-preview
CLAUDE_MODEL=claude-sonnet-4-5-sonnet-20250219
```

### 3. Start the System

**Option A: Development Mode (Recommended)**
```bash
# From root directory - runs both backend and frontend
npm run dev
```

This starts:
- Backend API: http://localhost:3000/api
- Frontend UI: http://localhost:5173

**Option B: Production Mode**
```bash
# Build everything
npm run build

# Start production server
npm start
```

Access UI at: http://localhost:3000

## How To Use

### Step 1: Open the UI

Go to http://localhost:5173 (dev) or http://localhost:3000 (production)

### Step 2: Create a QA Task (First Time)

Currently, tasks are registered in code. You need to add a task to `backend/src/tasks/task-registry.service.ts`:

```typescript
this.tasks.set('homepage-test', {
  id: 'homepage-test',
  name: 'Homepage QA Test',
  description: 'Test the homepage for bugs and usability issues',
  provider: 'openai',
  model: 'computer-use-preview',
});
```

### Step 3: Start a QA Run

1. Click "Start Run" in the navigation
2. Select your task from the dropdown
3. (Optional) Choose AI provider and model
4. Click "Start Run"

### Step 4: View Results

1. Click "Run History" to see all runs
2. Click on any run to see the detailed report
3. Review findings categorized by severity:
   - 🔴 Critical
   - 🟠 High
   - 🟡 Medium
   - 🔵 Low
   - ⚪ Info

## Understanding the Reports

### Run Status

- **Pending** - Run queued but not started
- **Running** - AI is currently testing
- **Completed** - Test finished successfully
- **Failed** - Test encountered an error

### Finding Severity Levels

- **Critical** - App-breaking bugs, security issues
- **High** - Major functional problems
- **Medium** - Moderate issues affecting user experience
- **Low** - Minor issues, cosmetic problems
- **Info** - Observations, suggestions

### Report Sections

1. **Summary** - Overview of total findings, passed/failed checks
2. **Findings by Severity** - Count of issues per severity level
3. **Detailed Findings** - Each finding includes:
   - Title and description
   - Category (e.g., "Functionality", "Accessibility")
   - Impact explanation
   - Recommendation for fixing
   - Evidence (screenshots, DOM data)

## Configuration Options

### Testing Your Own Application

Update `backend/.env`:

```env
# The URL of your web application
BASE_URL=https://your-app.com

# If your app requires authentication
STORAGE_STATE_PATH=playwright/.auth/analyst.json
```

### Setting Up Authentication

If your app requires login:

1. Edit `backend/tests/auth.setup.ts`
2. Add your login steps:

```typescript
await page.goto('https://your-app.com/login');
await page.fill('#email', 'test@example.com');
await page.fill('#password', 'password');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard');
```

3. Run the auth setup:

```bash
cd backend
npm run playwright:test
```

This saves authenticated session to `backend/playwright/.auth/analyst.json`

### Choosing AI Models

**OpenAI Options:**
- `computer-use-preview` - Most capable, slower, more expensive
- `computer-use-preview-turbo` - Faster, cheaper
- `gpt-3.5-turbo` - Fastest, cheapest, less capable

**Anthropic Options:**
- `claude-3-opus` - Most capable
- `claude-3-sonnet` - Balanced
- `claude-3-haiku` - Fastest, cheapest

## API Endpoints

You can also interact via API:

### List Tasks
```bash
curl http://localhost:3000/api/tasks
```

### Start a Run
```bash
curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -d '{"taskId": "homepage-test"}'
```

### Get Run History
```bash
curl http://localhost:3000/api/runs
```

### Get Run Report
```bash
curl http://localhost:3000/api/runs/{runId}
```

## Advanced Features

### KPI Monitoring

The system can fetch and validate KPIs from your app:

```env
KPI_BASE_URL=https://api.your-app.example
KPI_ENDPOINT=/api/metrics
KPI_TOLERANCE_PERCENT=5
```

AI will:
1. Fetch current KPIs from your endpoint
2. Compare with expected values
3. Report if metrics are outside tolerance

### Custom Assertions

AI can run custom checks defined in your tasks. The AI has access to these tools:

- `computer_action` - Click, type, navigate
- `dom_snapshot` - Capture page structure
- `kpi_oracle` - Check metrics
- `assert` - Verify conditions

### Computer-Use Loop (OpenAI)

- Provide `OPENAI_API_KEY` and (optionally) `CLAUDE_API_KEY`.
- The orchestrator launches an authenticated Playwright session and streams screenshots to OpenAI's `computer-preview` tool.
- Tool calls (`dom_snapshot`, `kpi_oracle`, `assert`) are executed in the backend and fed back into the model until it produces a structured `QAReport`.
- Artifacts per run include:
  - `qa-report.json` – structured result from the model
  - `computer-use-events.json` – chronological log of tool calls and actions
  - `model-responses.jsonl` – compact trail of responses/usage data
  - `trace.zip` and viewport screenshots for every step
- Configure the dashboard URL via `BASE_URL` and optionally `KPI_BASE_URL` if the model should compare UI values with your API.

## Troubleshooting

### "No tasks available"

Add tasks to `backend/src/tasks/task-registry.service.ts` and restart.

### "Storage state file not found"

Run `npm run playwright:test` to generate auth state, or use the empty one created automatically.

### "Connection refused"

Make sure the backend is running on port 3000.

### Frontend can't reach API

Check that the backend is running and `frontend/vite.config.ts` proxy is correct.

## Project Structure

```
qa-ai-tester/
├── backend/               # NestJS backend
│   ├── src/
│   │   ├── orchestrator/  # Run management
│   │   ├── providers/     # AI provider integrations
│   │   ├── worker/        # Playwright automation
│   │   ├── tasks/         # Task registry
│   │   └── models/        # Data schemas
│   ├── playwright/.auth/  # Auth state
│   └── .env              # Configuration
├── frontend/             # React UI
│   └── src/
│       ├── components/   # UI components
│       └── api.ts       # API client
└── package.json         # Workspace config
```

## Next Steps

1. **Add Your Tasks** - Define what you want to test
2. **Configure Your App URL** - Point to your staging/test environment
3. **Set Up Auth** (if needed) - Save logged-in state
4. **Run Tests** - Start QA runs and review reports
5. **Integrate in CI/CD** - Automate testing in your pipeline

## Support & Resources

- Backend code: `backend/src/`
- Frontend code: `frontend/src/`
- API docs: See API Endpoints section above
- Configuration: `backend/.env`

## Example Workflow

```bash
# 1. Start the system
npm run dev

# 2. Open browser to http://localhost:5173

# 3. Create a run through UI:
#    - Select task
#    - Choose provider
#    - Click "Start Run"

# 4. Monitor progress in Run History

# 5. Review detailed report with findings

# 6. Fix issues in your app

# 7. Run again to verify fixes
```

That's it! You now have an AI-powered QA system testing your web application automatically.
