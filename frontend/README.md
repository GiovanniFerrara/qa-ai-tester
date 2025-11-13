# QA AI Tester - Frontend

Modern React + Vite frontend for the QA AI Tester orchestration system.

## Features

- 🚀 Fast development with Vite and Hot Module Replacement
- ⚛️ React 18 with TypeScript
- 🎨 Modern, responsive UI with custom CSS
- 🔄 Real-time updates for run status
- 📊 Comprehensive QA reports visualization
- 🎯 Task selection and configuration interface

## Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Frontend will be available at http://localhost:5173

The Vite dev server automatically proxies API requests to http://localhost:3005/api

### Build for Production

```bash
npm run build
```

Builds the frontend into `dist/frontend` directory.

## Project Structure

```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── TaskList.tsx     # Display available tasks
│   │   ├── RunForm.tsx      # Form to start new runs
│   │   ├── RunsList.tsx     # List of run history
│   │   └── RunDetail.tsx    # Detailed QA report view
│   ├── api.ts           # API client
│   ├── types.ts         # TypeScript type definitions
│   ├── styles.css       # Global styles
│   ├── App.tsx          # Main app component with routing
│   └── main.tsx         # Application entry point
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Available Routes

- `/` - Start a new QA run
- `/runs` - View run history
- `/runs/:runId` - View detailed report for a specific run

## API Integration

The frontend communicates with the backend API at `/api`:

- `GET /api/tasks` - List available tasks
- `POST /api/runs` - Start a new run
- `GET /api/runs` - List all runs
- `GET /api/runs/:id` - Get run report

## Environment

The frontend automatically proxies API requests to the backend during development. No additional environment configuration is needed.