# QA AI Tester - Backend

NestJS-based backend orchestration API for AI-powered quality assurance testing. This backend coordinates Playwright browser automation with OpenAI and Anthropic AI models to execute comprehensive web application testing through a computer-use interaction loop.

## Overview

The backend implements:
- **Computer-Use Orchestration** - Complete AI-driven interaction loop with OpenAI and Anthropic
- **Multi-Provider Support** - Seamless switching between OpenAI GPT and Anthropic Claude
- **Browser Automation** - Playwright-based worker gateway for reliable browser control
- **Event Streaming** - Real-time SSE updates for run monitoring
- **Task Management** - Persistent task storage with CRUD operations
- **Artifact Management** - Comprehensive capture of screenshots, traces, and reports

## Architecture

### Core Modules

**[`orchestrator/`](src/orchestrator:1)** - Run management and execution pipeline
- [`orchestrator.service.ts`](src/orchestrator/orchestrator.service.ts:1) - Main orchestration service
- [`run-execution.service.ts`](src/orchestrator/run-execution.service.ts:1) - Executes individual runs
- [`run-events.service.ts`](src/orchestrator/run-events.service.ts:1) - Event streaming with SSE
- [`runs.controller.ts`](src/orchestrator/runs.controller.ts:1) - REST API for run operations
- [`artifacts.controller.ts`](src/orchestrator/artifacts.controller.ts:1) - Artifact serving

**[`providers/`](src/providers:1)** - AI provider integrations
- [`openai-provider.service.ts`](src/providers/openai-provider.service.ts:1) - OpenAI SDK wrapper
- [`openai-computer-use.service.ts`](src/providers/openai-computer-use.service.ts:1) - OpenAI computer-use loop
- [`anthropic-provider.service.ts`](src/providers/anthropic-provider.service.ts:1) - Anthropic SDK wrapper
- [`anthropic-computer-use.service.ts`](src/providers/anthropic-computer-use.service.ts:1) - Claude computer-use loop
- [`computer-use-orchestrator.service.ts`](src/providers/computer-use-orchestrator.service.ts:1) - Provider routing
- [`ai-provider-registry.service.ts`](src/providers/ai-provider-registry.service.ts:1) - Provider resolution
- [`schema.service.ts`](src/providers/schema.service.ts:1) - Zod to JSON Schema conversion

**[`worker/`](src/worker:1)** - Playwright browser automation
- [`worker-gateway.service.ts`](src/worker/worker-gateway.service.ts:1) - Browser control interface
- [`workerServer.ts`](src/worker/workerServer.ts:1) - Playwright session management

**[`tasks/`](src/tasks:1)** - Task registry and storage
- [`task-registry.service.ts`](src/tasks/task-registry.service.ts:1) - In-memory task management
- [`task-storage.service.ts`](src/tasks/task-storage.service.ts:1) - Persistent JSON storage
- [`tasks.controller.ts`](src/tasks/tasks.controller.ts:1) - Task CRUD API

**[`models/`](src/models:1)** - Type definitions and schemas
- [`contracts.ts`](src/models/contracts.ts:1) - Zod schemas for TaskSpec, QAReport, Finding, tools
- [`run.ts`](src/models/run.ts:1) - Run metadata and result types

**[`services/`](src/services:1)** - Utility services

## Prerequisites

- **Node.js** 20 or higher
- **npm** (comes with Node.js)
- **Playwright browsers** (installed via `npx playwright install`)
- **API Keys**: At least one AI provider key (OpenAI or Anthropic)

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Generate JSON schemas from Zod models
npm run generate:schema
```

## Configuration

Create a [`.env`](.env:1) file in the backend directory:

```env
# ============================================
# AI Provider Configuration
# ============================================

# OpenAI API Key (get from platform.openai.com)
# Required for OpenAI provider
OPENAI_API_KEY=sk-proj-...your-openai-key

# Anthropic API Key (get from console.anthropic.com)
# Required for Anthropic provider
CLAUDE_API_KEY=sk-ant-...your-anthropic-key

# Default provider to use (openai or anthropic)
DEFAULT_PROVIDER=openai

# Model selection
OPENAI_MODEL=computer-use-preview
CLAUDE_MODEL=claude-sonnet-4-5-sonnet-20250219

# ============================================
# Application Configuration
# ============================================

# The web application URL to test
BASE_URL=https://your-app-to-test.com

# Server port (default: 3005)
PORT=3005

# ============================================
# Authentication Configuration
# ============================================

# Path to Playwright storage state (for authenticated sessions)
# This file contains cookies and localStorage for logged-in sessions
STORAGE_STATE_PATH=playwright/.auth/analyst.json

# ============================================
# Artifact Storage
# ============================================

# Directory for storing run artifacts (screenshots, traces, reports)
ARTIFACT_DIR=artifacts

# ============================================
# Task Storage
# ============================================

# Path to task database file (JSON format)
TASKS_DB_PATH=data/tasks.json

# ============================================

# ============================================




# Run the auth setup
npm run playwright:test

# Or with specific environment
STORAGE_STATE_PATH=custom/path.json npm run playwright:test
```

**Output:**
```
Using storage state path: playwright/.auth/analyst.json
Login page loaded
Login successful
Storage state saved to playwright/.auth/analyst.json
```

### Verifying Authentication Works

After generating the auth state file:

1. Check that [`playwright/.auth/analyst.json`](playwright/.auth/analyst.json:1) exists
2. The file should contain cookies and storage data
3. Run a test QA task - it should start already logged in

### Troubleshooting Authentication

**"Storage state file not found"**
- Run `npm run playwright:test` to generate the file
- Check that `STORAGE_STATE_PATH` in `.env` points to the correct location

**"Login failed" or "Timeout waiting for navigation"**
- Verify the login URL is correct
- Check that selectors match your form fields
- Increase timeout if your app is slow: `{ timeout: 30000 }`
- Add `console.log()` statements to debug each step

**"Session expires too quickly"**
- Some apps have short session timeouts
- You may need to re-run auth setup before each testing session
- Consider longer-lived tokens or API-based authentication

**"MFA codes required"**
- Use a test account with MFA disabled if possible
- Or use a fixed backup code
- Some organizations provide test accounts with relaxed auth

## Development

### Start Development Server

```bash
# Start with hot reload
npm run start:dev

# Or watch mode
npm run start:watch
```

API available at: http://localhost:3005/api

### Generate JSON Schemas

```bash
# Generate schemas from Zod models
npm run generate:schema
```

This creates JSON Schema files in [`schemas/`](schemas:1):
- `qaReport.schema.json`
- `computerAction.schema.json`
- `domSnapshotRequest.schema.json`
- `assertToolRequest.schema.json`

### Run Tests

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov
```

### Linting

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Manual Worker Test

Test the Playwright worker directly:

```bash
npm run worker
```

This captures a screenshot using the configured `BASE_URL` and authentication state.

## API Endpoints

### Tasks

**List All Tasks**
```
GET /api/tasks
```

**Create Task**
```
POST /api/tasks
Content-Type: application/json

{
  "name": "Homepage Test",
  "description": "Test homepage functionality and accessibility",
  "route": "/",
  "provider": "openai",
  "model": "computer-use-preview"
}
```

**Update Task**
```
PUT /api/tasks/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Delete Task**
```
DELETE /api/tasks/:id
```

### Runs

**Create Run**
```
POST /api/runs
Content-Type: application/json

{
  "taskId": "task-id-here",
  "provider": "openai",
  "model": "computer-use-preview"
}
```

**List Runs**
```
GET /api/runs
```

**Get Run Report**
```
GET /api/runs/:runId
```

**Stream Run Events (SSE)**
```
GET /api/runs/:runId/events
```

### Artifacts

**Access Artifact**
```
GET /api/artifacts/:runId/:filename
```

Examples:
- `GET /api/artifacts/{runId}/qa-report.json` - QA report
- `GET /api/artifacts/{runId}/trace.zip` - Playwright trace
- `GET /api/artifacts/{runId}/screenshots/initial.jpg` - Screenshot

## Computer-Use Implementation

### OpenAI Computer-Use Loop

The OpenAI integration ([`openai-computer-use.service.ts`](src/providers/openai-computer-use.service.ts:1)) implements:

1. **Initialization**
   - Sends system prompt with task context
   - Includes initial screenshot
   - Defines tool schemas

2. **Interaction Loop**
   - Streams responses from OpenAI
   - Parses tool calls from response
   - Executes tools via worker gateway
   - Captures results and screenshots
   - Feeds results back to model
   - Continues until completion

3. **Tool Execution**
   - `computer_action` - Browser actions (click, type, scroll)
   - `dom_snapshot` - Capture page structure
   - `assert` - Record test assertions

4. **Report Generation**
   - Extracts structured QA report from final response
   - Validates against Zod schema
   - Saves artifacts to disk

### Anthropic Computer-Use Loop

The Anthropic integration ([`anthropic-computer-use.service.ts`](src/providers/anthropic-computer-use.service.ts:1)) follows a similar pattern but uses Claude's computer-use API format.

### Artifacts Generated

Each run creates a directory: [`artifacts/{runId}/`](artifacts:1)

**Files:**
- `qa-report.json` - Structured QA report with findings
- `computer-use-events.json` - Chronological tool call log
- `model-responses.jsonl` - AI responses with token usage
- `trace.zip` - Full Playwright trace
- `screenshots/` - Screenshots at each interaction

**Example QA Report:**
```json
{
  "executiveSummary": "Completed testing of homepage...",
  "findings": [
    {
      "id": "uuid",
      "severity": "high",
      "category": "accessibility",
      "assertion": "Images missing alt text",
      "expected": "All images should have descriptive alt text",
      "observed": "3 images found without alt attributes",
      "evidence": [...],
      "suggestedFix": "Add alt attributes to images",
      "confidence": 0.9
    }
  ],
  "summary": {
    "totalFindings": 5,
    "bySeverity": {...},
    "passedAssertions": 12,
    "failedAssertions": 3
  }
}
```

## Production Considerations

### Performance
- Runs are executed synchronously (one at a time)
- Consider implementing a job queue for concurrent runs
- Monitor memory usage with long-running sessions

### Storage
- Artifacts can grow large (traces, screenshots)
- Implement cleanup policies or archival
- Consider external storage (S3, GCS) for production

### Security
- Store API keys securely (environment variables, secrets manager)
- Validate and sanitize task inputs
- Implement rate limiting on API endpoints
- Restrict artifact access in production

### Monitoring
- Log all runs and errors
- Track AI provider usage and costs
- Monitor artifact disk usage
- Set up alerts for failures

## Extending the System

### Adding a New AI Provider

1. Create provider service in [`providers/`](src/providers:1)
2. Implement computer-use loop
3. Register in [`ai-provider-registry.service.ts`](src/providers/ai-provider-registry.service.ts:1)
4. Update orchestrator routing

### Adding New Tools

1. Define Zod schema in [`models/contracts.ts`](src/models/contracts.ts:1)
2. Generate JSON schema via `npm run generate:schema`
3. Implement tool handler in worker gateway
4. Add to provider tool definitions

### Custom Artifact Storage

Override artifact service to use S3/GCS:

```typescript
@Injectable()
export class S3ArtifactService {
  async saveArtifact(runId: string, filename: string, data: Buffer) {
    // Upload to S3
  }
}
```

## Troubleshooting

### "Module not found" errors
```bash
npm install
```

### "Playwright browsers not installed"
```bash
npx playwright install
```

### "OpenAI API key invalid"
- Check `.env` file has correct key
- Verify key starts with `sk-proj-`
- Ensure key is active on platform.openai.com

### "Connection timeout to BASE_URL"
- Verify `BASE_URL` is accessible
- Check network connectivity
- Increase timeouts if site is slow

### "Storage state not working"
- Re-run `npm run playwright:test`
- Check [`playwright/.auth/analyst.json`](playwright/.auth/analyst.json:1) exists
- Verify selectors in [`auth.setup.ts`](tests/auth.setup.ts:1) are correct

### High memory usage
- Reduce screenshot frequency
- Clean up old artifacts
- Limit concurrent runs

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Playwright Documentation](https://playwright.dev/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference)
- [Zod Documentation](https://zod.dev/)
