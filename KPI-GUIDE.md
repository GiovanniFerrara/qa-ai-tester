# KPI Endpoint Configuration Guide

## What is KPI_ENDPOINT?

`KPI_ENDPOINT` is an **optional** configuration that allows the AI QA system to fetch and validate Key Performance Indicators (KPIs) from your application during testing.

## Do I Need It?

**No, it's completely optional.** You can leave it as is or remove it. The system works fine without it.

### When to Use It:

Use KPI monitoring if your application has:
- Performance metrics API
- Analytics endpoints
- Dashboard statistics
- Health check endpoints with metrics
- Business metrics (users, transactions, etc.)

### When NOT to Use It:

Skip this if:
- Your app doesn't expose metrics via API
- You're just testing UI/functionality
- You don't need performance validation
- You're getting started (add it later)

## How It Works

1. During a QA test, the AI can call the `kpi_oracle` tool
2. The system fetches current metrics from your app's API endpoint
3. AI compares metrics against expected values or tolerances
4. Results are included in the QA report

## Configuration Options

### Option 1: No KPI Monitoring (Simplest)

Just comment out or remove these lines in `backend/.env`:

```env
# KPI_ENDPOINT=/api/kpi
# KPI_TOLERANCE_PERCENT=1
```

### Option 2: Use Your App's Metrics Endpoint

If your app has a metrics/stats API:

```env
# The endpoint on your BASE_URL that returns metrics
KPI_ENDPOINT=/api/metrics

# Or use a different base URL
KPI_BASE_URL=https://metrics.your-app.com
KPI_ENDPOINT=/v1/stats

# How much deviation is acceptable (percentage)
KPI_TOLERANCE_PERCENT=5
```

### Option 3: Static Test Values

You can also define static KPIs in your task configuration:

```typescript
// In backend/src/tasks/task-registry.service.ts
{
  kpiSpec: {
    type: 'staticValues',
    values: {
      expectedUsers: 1000,
      maxResponseTime: 200,
      errorRate: 0.01
    }
  }
}
```

## What Should Your KPI Endpoint Return?

Your API endpoint should return JSON with numeric/string metrics:

### Example Response:

```json
{
  "activeUsers": 1523,
  "responseTime": 145,
  "errorRate": 0.002,
  "successRate": 99.8,
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

### Requirements:

- ✅ Content-Type: `application/json`
- ✅ HTTP 200 status
- ✅ Numeric or string values
- ✅ Any structure (flat or nested)

## Example Use Cases

### 1. Performance Monitoring

```env
BASE_URL=https://your-app.com
KPI_ENDPOINT=/api/performance
KPI_TOLERANCE_PERCENT=10
```

Your `/api/performance` returns:
```json
{
  "avgResponseTime": 150,
  "p95ResponseTime": 300,
  "throughput": 1000
}
```

AI checks: "Is response time within acceptable range?"

### 2. Business Metrics

```env
KPI_ENDPOINT=/api/dashboard/stats
```

Your endpoint returns:
```json
{
  "totalUsers": 5000,
  "activeToday": 250,
  "newSignups": 12,
  "revenue": 15000
}
```

AI validates: "Are business metrics healthy?"

### 3. Health Check

```env
KPI_ENDPOINT=/health
```

Your endpoint returns:
```json
{
  "status": "healthy",
  "dbConnections": 95,
  "memoryUsage": 67.5,
  "cpuUsage": 45.2
}
```

AI verifies: "Is the system healthy?"

## Real Configuration Examples

### Example 1: Simple App (No KPIs)

```env
OPENAI_API_KEY=sk-...
BASE_URL=https://my-app.com
```

That's it! No KPI configuration needed.

### Example 2: App with Metrics

```env
OPENAI_API_KEY=sk-...
BASE_URL=https://my-app.com
KPI_ENDPOINT=/api/v1/metrics
KPI_TOLERANCE_PERCENT=5
```

### Example 3: Separate Metrics Server

```env
OPENAI_API_KEY=sk-...
BASE_URL=https://my-app.com
KPI_BASE_URL=https://metrics.my-app.com
KPI_ENDPOINT=/stats
KPI_TOLERANCE_PERCENT=10
```

## How the AI Uses KPIs

During a test, the AI can:

1. **Check Current State**
   ```
   AI: "Let me check the current metrics"
   System: Fetches from your KPI endpoint
   AI: "Response time is 145ms, within acceptable range"
   ```

2. **Validate After Actions**
   ```
   AI: Performs bulk user action
   AI: Checks KPIs to see if system is still healthy
   AI: Reports if metrics degraded
   ```

3. **Compare Expectations**
   ```
   AI: "Expected error rate < 1%, actual is 0.2%"
   AI: "✓ Error rate is acceptable"
   ```

## Troubleshooting

### "KPI oracle request failed"

Your endpoint returned non-200 status. Check:
- Endpoint exists and is accessible
- No authentication required (or add auth to storage state)
- Returns proper HTTP status codes

### "KPI oracle response was not valid JSON"

Your endpoint returned non-JSON. Ensure:
- Content-Type header is `application/json`
- Response body is valid JSON
- No HTML error pages

### "Cannot read KPI_ENDPOINT"

It's undefined in `.env`. Either:
- Set it to a valid endpoint
- Or remove/comment it out (not required)

## Quick Start Without KPIs

Just use this minimal configuration:

```env
OPENAI_API_KEY=your_key_here
CLAUDE_API_KEY=your_key_here
BASE_URL=https://your-app-to-test.com
```

Remove or comment out:
```env
# KPI_ENDPOINT=/api/kpi
# KPI_TOLERANCE_PERCENT=1
```

The system works perfectly without KPI monitoring!

## Summary

- **KPI_ENDPOINT is optional** - only use if your app has metrics API
- **Not needed for basic testing** - skip it when getting started
- **Points to your app's metrics** - like `/api/stats` or `/health`
- **Must return JSON** - with numeric/string metrics
- **Used by AI for validation** - to check performance and health
- **Can be added later** - start simple, add monitoring as needed

**Recommendation for beginners:** Leave it out or comment it out. Focus on basic QA testing first. Add KPI monitoring later if needed.