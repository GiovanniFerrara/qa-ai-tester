import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RunState, TaskSpec } from "../types";
import { api } from "../api";

export function RunsList() {
  const [runs, setRuns] = useState<RunState[]>([]);
  const [summary, setSummary] = useState<{
    totals: {
      total: number;
      completed: number;
      running: number;
      failed: number;
      passed: number;
      avgDurationMs: number;
      findings: number;
    };
    severity: Record<string, number>;
    urgentFindings: Array<{
      runId: string;
      assertion: string;
      severity: string;
      observed: string;
    }>;
    kpiAlerts: Array<{
      runId: string;
      label: string;
      expected: string;
      observed: string;
    }>;
    providerUsage: Record<string, number>;
  } | null>(null);
  const [tasks, setTasks] = useState<Map<string, TaskSpec>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [runsData, tasksData, summaryData] = await Promise.all([
        api.getRuns(),
        api.getTasks(),
        api.getRunSummary(),
      ]);

      const tasksMap = new Map(tasksData.map((task) => [task.id, task]));
      setTasks(tasksMap);

      setRuns(
        runsData.sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        )
      );
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusClass = (status: string) => {
    return `status status-${status}`;
  };

  const derivedSummary = useMemo(() => {
    if (summary) {
      return summary;
    }
    const total = runs.length;
    const running = runs.filter((run) => run.status === "running").length;
    const failed = runs.filter((run) => run.status === "failed").length;
    const completed = runs.filter((run) => run.status === "completed").length;
    const passed = runs.filter((run) => run.report?.status === "passed").length;
    const findings = runs.reduce(
      (acc, run) => acc + (run.report?.findings.length ?? 0),
      0
    );
    const durations = runs
      .map((run) => run.report?.costs.durationMs)
      .filter((value): value is number => typeof value === "number");
    const avgDurationMs =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
    const severity: Record<string, number> = {
      blocker: 0,
      critical: 0,
      major: 0,
      minor: 0,
      info: 0,
    };
    const urgent: Array<{
      runId: string;
      assertion: string;
      severity: string;
      observed: string;
    }> = [];
    const kpiAlerts: Array<{
      runId: string;
      label: string;
      expected: string;
      observed: string;
    }> = [];

    runs.forEach((run) => {
      run.report?.findings.forEach((finding) => {
        severity[finding.severity] = (severity[finding.severity] ?? 0) + 1;
        if (
          ["blocker", "critical"].includes(finding.severity) &&
          urgent.length < 10
        ) {
          urgent.push({
            runId: run.runId,
            assertion: finding.assertion,
            severity: finding.severity,
            observed: finding.observed,
          });
        }
      });
      (run.report?.kpiTable ?? []).forEach((kpi) => {
        if (kpi.status !== "ok" && kpiAlerts.length < 10) {
          kpiAlerts.push({
            runId: run.runId,
            label: kpi.label,
            expected: kpi.expected,
            observed: kpi.observed,
          });
        }
      });
    });
    return {
      totals: {
        total,
        running,
        failed,
        completed,
        passed,
        findings,
        avgDurationMs,
      },
      severity,
      urgentFindings: urgent,
      kpiAlerts,
      providerUsage: runs.reduce<Record<string, number>>((acc, run) => {
        acc[run.provider] = (acc[run.provider] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }, [summary, runs]);

  const severityTotals = derivedSummary.severity;
  const urgentFindings = derivedSummary.urgentFindings ?? [];
  const kpiAlerts = derivedSummary.kpiAlerts ?? [];
  const providerUsage = Object.entries(derivedSummary.providerUsage ?? {});

  const formatDuration = (ms: number) => {
    if (!ms || Number.isNaN(ms)) return "—";
    if (ms < 1000) return `${ms} ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
    return `${(ms / 60000).toFixed(1)} min`;
  };

  if (loading) {
    return <div className="loading">Loading runs...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">Error: {error}</div>
        <button onClick={loadData}>Retry</button>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>No Runs Yet</h3>
          <p>Start your first QA run to see results here.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="runs-dashboard">
        <div className="summary-grid">
          <div className="summary-card">
            <span>Total Runs</span>
            <strong>{derivedSummary.totals.total}</strong>
          </div>
          <div className="summary-card">
            <span>Completed</span>
            <strong>{derivedSummary.totals.completed}</strong>
          </div>
          <div className="summary-card">
            <span>Running</span>
            <strong>{derivedSummary.totals.running}</strong>
          </div>
          <div className="summary-card">
            <span>Failed</span>
            <strong>{derivedSummary.totals.failed}</strong>
          </div>
          <div className="summary-card">
            <span>Pass Rate</span>
            <strong>
              {derivedSummary.totals.completed
                ? `${Math.round(
                    (derivedSummary.totals.passed /
                      Math.max(derivedSummary.totals.completed, 1)) *
                      100
                  )}%`
                : "—"}
            </strong>
          </div>
          <div className="summary-card">
            <span>Avg Duration</span>
            <strong>
              {formatDuration(derivedSummary.totals.avgDurationMs)}
            </strong>
          </div>
          <div className="summary-card">
            <span>Total Findings</span>
            <strong>{derivedSummary.totals.findings}</strong>
          </div>
          <div className="summary-card">
            <span>Provider Usage</span>
            {providerUsage.length === 0 ? (
              <p className="muted">No provider data yet.</p>
            ) : (
              <ul className="provider-list">
                {providerUsage.map(([provider, count]) => (
                  <li key={provider}>
                    <strong>{provider}</strong>
                    <strong>{count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="dashboard-columns">
          <div className="card">
            <h3>Severity Overview</h3>
            {derivedSummary.totals.findings === 0 ? (
              <p className="muted">No findings logged yet.</p>
            ) : (
              <div className="severity-list">
                {["blocker", "critical", "major", "minor", "info"].map(
                  (severity) => (
                    <div className="severity-row" key={severity}>
                      <span className={`severity-badge severity-${severity}`}>
                        {severity}
                      </span>
                      <div className="severity-meter">
                        <div
                          className={`severity-meter-fill severity-${severity}`}
                          style={{
                            width: `${
                              Math.round(
                                ((severityTotals[severity] ?? 0) /
                                  derivedSummary.totals.findings) *
                                  100
                              ) || 4
                            }%`,
                          }}
                        />
                      </div>
                      <span>{severityTotals[severity] ?? 0}</span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h3>KPI Alerts</h3>
            {kpiAlerts.length === 0 ? (
              <p className="muted">No KPI mismatches detected.</p>
            ) : (
              <ul className="kpi-alerts">
                {kpiAlerts.map((alert) => (
                  <li key={`${alert.runId}-${alert.label}`}>
                    <div>
                      <strong>{alert.label}</strong>
                      <br />
                      <span>
                        Expected: {alert.expected} • Observed: {alert.observed}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => navigate(`/runs/${alert.runId}`)}
                    >
                      View
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h3>Urgent Findings</h3>
            {urgentFindings.length === 0 ? (
              <p className="muted">No blocker or critical findings.</p>
            ) : (
              <ul className="urgent-list">
                {urgentFindings.map((item) => (
                  <li key={`${item.runId}-${item.assertion}`}>
                    <span className={`severity-pill severity-${item.severity}`}>
                      {item.severity}
                    </span>
                    <div>
                      <strong>{item.assertion}</strong>
                      <p>{item.observed}</p>
                    </div>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => navigate(`/runs/${item.runId}`)}
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>QA Run History</h2>
        <div className="runs-list">
          {runs.map((run) => {
            const task = tasks.get(run.taskId);
            const taskName = task?.name || run.taskId;
            return (
              <div
                key={run.runId}
                className="run-item"
                onClick={() => navigate(`/runs/${run.runId}`)}
              >
                <div className="run-header">
                  <span className="run-id">{taskName}</span>
                  <span className={getStatusClass(run.status)}>
                    {run.status.toUpperCase()}
                  </span>
                </div>
                <div className="run-info">
                  <span>Run ID: {run.runId.slice(0, 8)}</span>
                  <span>Provider: {run.provider}</span>
                  <span>Started: {formatDate(run.startedAt)}</span>
                </div>
                <div className="run-info" style={{ marginTop: "0.5rem" }}>
                  {run.status === "completed" && run.report ? (
                    <>
                      <span>Findings: {run.report.findings.length}</span>
                      <span>
                        Duration: {formatDuration(run.report.costs.durationMs)}
                      </span>
                    </>
                  ) : run.status === "failed" ? (
                    <span className="error-text">
                      Failed{run.error ? `: ${run.error}` : ""}
                    </span>
                  ) : (
                    <span>In progress…</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
