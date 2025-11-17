# QA AI Tester - Frontend

Modern React + TypeScript web interface for the QA AI Tester orchestration system. Built with Vite for fast development and optimized production builds.

## Overview

The frontend provides a comprehensive web UI for:
- **Task Management** - Create, edit, and delete QA test tasks
- **Run Orchestration** - Start new QA runs with custom parameters
- **Real-Time Monitoring** - Watch runs execute with live event streaming
- **Report Visualization** - Review detailed QA reports with categorized findings
- **Evidence Inspection** - View screenshots, DOM snapshots, and traces

## Features

### ✨ Core Capabilities

- 🎯 **Intuitive Task Management** - Visual card-based task selection and creation
- 🚀 **Quick Run Creation** - Simple form to start QA runs with provider selection
- 📊 **Live Run Monitoring** - Real-time status updates via Server-Sent Events (SSE)
- 📈 **Comprehensive Reports** - Detailed findings visualization with severity categorization
- 🎨 **Modern, Responsive Design** - Clean interface that works on all screen sizes
- 🔄 **Hot Module Replacement** - Instant updates during development
- ⚡ **Fast Performance** - Optimized builds with Vite and React 18

### 🎨 UI Components

**[`TaskList.tsx`](src/components/TaskList.tsx:1)** - Display available QA tasks
- Card-based layout with task details
- Provider and model badges
- Quick actions (edit, delete, run)

**[`TasksManager.tsx`](src/components/TasksManager.tsx:1)** - Full task CRUD interface
- Create new tasks with form validation
- Edit existing task configuration
- Delete tasks with confirmation
- Persistent storage via backend API

**[`RunForm.tsx`](src/components/RunForm.tsx:1)** - Run creation interface
- Task selection dropdown
- Provider override options (OpenAI/Anthropic)
- Model selection per provider
- Form validation and error handling

**[`RunsList.tsx`](src/components/RunsList.tsx:1)** - Run history with status
- Chronological list of all runs
- Real-time status badges
- Duration and timestamp display
- Quick navigation to detailed reports

**[`RunDetail.tsx`](src/components/RunDetail.tsx:1)** - Detailed QA report view
- Executive summary section
- Findings categorized by severity:
  - 🔴 Critical
  - 🟠 High
  - 🟡 Medium
  - 🔵 Low
  - ⚪ Info
- Evidence viewer (screenshots, DOM data)
- Run metadata and statistics

## Technology Stack

- **React 18** - Modern React with concurrent features
- **TypeScript** - Full type safety throughout the application
- **Vite** - Next-generation frontend tooling with HMR
- **React Router** - Client-side routing
- **Native Fetch API** - HTTP client for backend communication
- **CSS3** - Modern styling with CSS variables and flexbox/grid

## Prerequisites

- **Node.js** 20 or higher
- **npm** (comes with Node.js)
- **Backend running** on http://localhost:3005

## Installation

```bash
# Install dependencies
npm install
```

## Development

### Start Development Server

```bash
npm run dev
```

The dev server starts at: **http://localhost:5173**

Features:
- ⚡ Instant Hot Module Replacement (HMR)
- 🔄 Automatic backend API proxy
- 🛠️ React Fast Refresh
- 📊 Dev server with error overlay

### API Proxy Configuration

The development server automatically proxies API requests to the backend:

[`vite.config.ts`](vite.config.ts:1):
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
    },
  },
});
```

This means:
- `http://localhost:5173/api/tasks` → `http://localhost:3005/api/tasks`
- No CORS issues during development
- Seamless backend integration

## Production Build

### Build for Production

```bash
npm run build
```

Output: `dist/frontend/` directory

The build:
- Minifies JavaScript and CSS
- Optimizes assets (images, fonts)
- Generates source maps
- Tree-shakes unused code
- Chunks code for optimal loading

### Preview Production Build

```bash
npm run preview
```

Serves the production build locally to verify it works correctly.

### Deployment

The backend serves the built frontend in production:

1. Build frontend: `npm run build`
2. Backend automatically serves from `dist/frontend/`
3. Access at: http://localhost:3005

## Project Structure

```
frontend/
├── src/
│   ├── components/              # React components
│   │   ├── TaskList.tsx         # Task cards display
│   │   ├── TasksManager.tsx     # Task CRUD interface
│   │   ├── RunForm.tsx          # Run creation form
│   │   ├── RunsList.tsx         # Run history list
│   │   └── RunDetail.tsx        # Detailed report view
│   ├── api.ts                   # Backend API client
│   ├── types.ts                 # TypeScript type definitions
│   ├── App.tsx                  # Main app with routing
│   ├── main.tsx                 # Application entry point
│   └── styles.css               # Global styles
├── index.html                   # HTML template
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
├── tsconfig.node.json          # TypeScript config for Vite
└── package.json                # Dependencies and scripts
```

## Components Guide

### TaskList Component

Displays available tasks as interactive cards.

**Props:** None (fetches from API)

**Features:**
- Grid layout of task cards
- Provider/model badges
- Task description preview
- Quick action buttons

**Usage:**
```tsx
import TaskList from './components/TaskList';

<TaskList />
```

### TasksManager Component

Full-featured task management interface.

**Features:**
- Create new tasks with form
- Edit existing tasks inline
- Delete with confirmation dialog
- Real-time updates

**Form Fields:**
- Task name (required)
- Description (required)
- Target route (required, e.g., `/dashboard`)
- AI provider (openai/anthropic)
- Model selection

### RunForm Component

Interface for starting new QA runs.

**Features:**
- Task selection dropdown
- Provider override (optional)
- Model override (optional)
- Validation and error handling
- Loading states

**Usage:**
```tsx
import RunForm from './components/RunForm';

<RunForm />
```

### RunsList Component

Displays run history with real-time updates.

**Features:**
- Chronological listing
- Status badges with colors:
  - 🟡 Pending
  - 🔵 Running
  - 🟢 Completed
  - 🔴 Failed
- Duration calculation
- Click to view details

**Auto-refresh:** Polls every 5 seconds for updates

### RunDetail Component

Comprehensive QA report viewer.

**Features:**
- Executive summary
- Finding counts by severity
- Detailed finding cards with:
  - Severity badge
  - Category label
  - Assertion description
  - Expected vs observed
  - Evidence viewer
  - Suggested fixes
  - Confidence score
- Run metadata (duration, timestamps)
- Artifact links

## API Integration

The frontend communicates with the backend API through [`src/api.ts`](src/api.ts:1).

### API Client Functions

**Test Cases:**
```typescript
// Get all tasks
const tasks = await fetchTasks();

// Create task
const newTask = await createTask({
  name: "Homepage Test",
  description: "Test homepage functionality",
  route: "/",
  provider: "openai",
  model: "computer-use-preview"
});

// Update task
await updateTask(taskId, { name: "New Name" });

// Delete task
await deleteTask(taskId);
```

**Runs:**
```typescript
// Start a run
const run = await startRun({
  taskId: "task-id",
  provider: "openai",
  model: "computer-use-preview"
});

// Get all runs
const runs = await fetchRuns();

// Get specific run report
const report = await fetchRunReport(runId);
```

**Events (SSE):**
```typescript
// Subscribe to run events
const eventSource = new EventSource(`/api/runs/${runId}/events`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data);
};
```

## Type Definitions

[`src/types.ts`](src/types.ts:1) defines all TypeScript interfaces:

```typescript
interface Task {
  id: string;
  name: string;
  description: string;
  route: string;
  provider: 'openai' | 'anthropic';
  model: string;
}

interface Run {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  provider: string;
  model: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

interface QAReport {
  executiveSummary: string;
  findings: Finding[];
  summary: {
    totalFindings: number;
    bySeverity: Record<string, number>;
    passedAssertions: number;
    failedAssertions: number;
  };
}

interface Finding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  assertion: string;
  expected: string;
  observed: string;
  tolerance?: number;
  evidence: Evidence[];
  suggestedFix?: string;
  confidence: number;
}
```

## Routing

[`src/App.tsx`](src/App.tsx:1) defines application routes:

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `RunForm` | Start new QA run |
| `/runs` | `RunsList` | View run history |
| `/runs/:runId` | `RunDetail` | View specific run report |
| `/tasks` | `TasksManager` | Manage QA tasks |

**Navigation:**
```tsx
import { Link } from 'react-router-dom';

<Link to="/">Start Run</Link>
<Link to="/runs">Test Reports</Link>
<Link to="/tasks">Test Cases Manager</Link>
```

## Styling

Global styles in [`src/styles.css`](src/styles.css:1) use CSS custom properties:

```css
:root {
  --primary-color: #007bff;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
  --info-color: #17a2b8;
  
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #212529;
  --text-secondary: #6c757d;
}
```

**Component-specific styles** are scoped within components.

**Responsive design** uses flexbox and CSS grid for layout adaptability.

## State Management

The application uses React's built-in state management:
- **useState** for local component state
- **useEffect** for side effects (data fetching, subscriptions)
- **Props** for parent-child communication

**No external state library needed** - the application is simple enough for React's built-in tools.

## Error Handling

All API calls include error handling:

```typescript
try {
  const data = await fetchTasks();
  setTasks(data);
} catch (error) {
  console.error('Failed to fetch tasks:', error);
  setError('Failed to load tasks. Please try again.');
}
```

**User-visible errors:**
- Form validation errors
- Network request failures
- Backend error messages
- Loading states

## Performance Optimization

### Implemented Optimizations

- **Code splitting** via Vite's dynamic imports
- **Lazy loading** for route components
- **Debounced inputs** for search/filter
- **Memoization** for expensive calculations
- **Optimized re-renders** with React.memo where appropriate

### Build Optimization

Vite automatically:
- Minifies JavaScript and CSS
- Tree-shakes unused code
- Generates optimal chunks
- Compresses assets
- Creates source maps

## Development Tips

### Hot Module Replacement

Vite's HMR preserves component state during development:
- Edit a component → See changes instantly
- React state preserved
- No full page reload

### TypeScript Integration

Full type checking:
```bash
# Type check without emitting
npm run tsc

# Type check in watch mode
npm run tsc -- --watch
```

### Browser DevTools

**React DevTools Extension:**
- Inspect component hierarchy
- View props and state
- Profile performance
- Debug hooks

**Network Tab:**
- Monitor API requests
- Inspect request/response
- Check SSE connections

## Troubleshooting

### "Cannot connect to backend"

**Check:**
1. Backend is running: `cd backend && npm run start:dev`
2. Backend is on port 3005
3. Proxy configuration in [`vite.config.ts`](vite.config.ts:1)

**Solution:**
```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### "Module not found" errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "Type errors" in TypeScript

```bash
# Check types
npm run tsc

# Common issues:
# - Mismatched interface properties
# - Missing null checks
# - Incorrect imports
```

### "Build fails" in production

```bash
# Check build output
npm run build

# Common issues:
# - Environment-specific code
# - Missing dependencies
# - Type errors (fix with tsc)
```

### "Blank page after build"

**Check:**
1. Backend is serving the correct directory
2. Base path in [`vite.config.ts`](vite.config.ts:1)
3. Browser console for errors

**Solution:**
```typescript
// vite.config.ts
export default defineConfig({
  base: '/', // Adjust if deployed to subdirectory
});
```

### "Real-time updates not working"

**Check:**
1. SSE connection in browser DevTools (Network tab)
2. Backend event streaming implementation
3. CORS settings if on different domain

**Debug SSE:**
```typescript
const eventSource = new EventSource(`/api/runs/${runId}/events`);

eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
};

eventSource.onopen = () => {
  console.log('SSE Connected');
};
```

## Testing

### Manual Testing Checklist

**Task Management:**
- [ ] Create task with all fields
- [ ] Edit existing task
- [ ] Delete task with confirmation
- [ ] View task list

**Run Creation:**
- [ ] Start run with default provider
- [ ] Override provider and model
- [ ] Form validation works
- [ ] Error messages display

**Run Monitoring:**
- [ ] View run list
- [ ] Status updates in real-time
- [ ] Click to view details
- [ ] Duration calculation accurate

**Report Viewing:**
- [ ] Executive summary displays
- [ ] Findings show by severity
- [ ] Evidence viewer works
- [ ] Screenshots load correctly

### Browser Compatibility

Tested on:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ⚠️ IE11 (not supported)

## Extending the Frontend

### Adding a New Component

1. Create component file in [`src/components/`](src/components:1)
2. Define props interface in TypeScript
3. Implement component logic
4. Add to routing if needed
5. Import and use in parent component

### Adding a New Route

```tsx
// src/App.tsx
import NewComponent from './components/NewComponent';

<Route path="/new-path" element={<NewComponent />} />
```

### Adding New API Endpoints

```typescript
// src/api.ts
export async function newApiCall() {
  const response = await fetch('/api/new-endpoint');
  if (!response.ok) throw new Error('API call failed');
  return response.json();
}
```

### Customizing Styles

Edit [`src/styles.css`](src/styles.css:1):
```css
:root {
  --primary-color: #your-color;
}
```

## Environment Variables

For frontend-specific configuration, create `.env`:

```env
# API base URL (for production deployment)
VITE_API_BASE_URL=https://api.your-domain.com

# Feature flags
VITE_ENABLE_DEBUG=false
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

## Production Checklist

Before deploying to production:

- [ ] Run `npm run build` successfully
- [ ] Test production build with `npm run preview`
- [ ] Verify API proxy configuration
- [ ] Check console for errors
- [ ] Test on multiple browsers
- [ ] Verify responsive design on mobile
- [ ] Check loading performance
- [ ] Ensure error handling works
- [ ] Verify SSE connections stable
- [ ] Test with real backend data

## Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Router Documentation](https://reactrouter.com/)
- [MDN Web Docs](https://developer.mozilla.org/)