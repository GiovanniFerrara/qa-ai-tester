import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RunState, TaskSpec } from "../types";
import { api } from "../api";
import {
  Card,
  Button,
  Loading,
  EmptyState,
  ErrorMessage,
  StatusBadge,
} from "../styles/shared.styled";
import * as S from "./RunsList.styled";

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
    return <Loading>Loading runs...</Loading>;
  }

  if (error) {
    return (
      <Card>
        <ErrorMessage>Error: {error}</ErrorMessage>
        <Button onClick={loadData}>Retry</Button>
      </Card>
    );
  }

  if (runs.length === 0) {
    return (
      <Card>
        <EmptyState>
          <h3>No Runs Yet</h3>
          <p>Start your first QA run to see results here.</p>
        </EmptyState>
      </Card>
    );
  }

  return (
    <>
      <S.RunsDashboard>
        <S.SummaryGrid>
          <S.SummaryCard>
            <span>Total Runs</span>
            <strong>{derivedSummary.totals.total}</strong>
          </S.SummaryCard>
          <S.SummaryCard>
            <span>Completed</span>
            <strong>{derivedSummary.totals.completed}</strong>
          </S.SummaryCard>
          <S.SummaryCard>
            <span>Running</span>
            <strong>{derivedSummary.totals.running}</strong>
          </S.SummaryCard>
          <S.SummaryCard>
            <span>Failed</span>
            <strong>{derivedSummary.totals.failed}</strong>
          </S.SummaryCard>
          <S.SummaryCard>
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
          </S.SummaryCard>
          <S.SummaryCard>
            <span>Avg Duration</span>
            <strong>
              {formatDuration(derivedSummary.totals.avgDurationMs)}
            </strong>
          </S.SummaryCard>
          <S.SummaryCard>
            <span>Total Findings</span>
            <strong>{derivedSummary.totals.findings}</strong>
          </S.SummaryCard>
          <S.SummaryCard>
            <span>Provider Usage</span>
            {providerUsage.length === 0 ? (
              <p className="muted">No provider data yet.</p>
            ) : (
              <S.ProviderList>
                {providerUsage.map(([provider, count]) => (
                  <li key={provider}>
                    <strong>{provider}</strong>
                    <strong>{count}</strong>
                  </li>
                ))}
              </S.ProviderList>
            )}
          </S.SummaryCard>
        </S.SummaryGrid>

        <S.DashboardColumns>
          <Card>
            <h3>Severity Overview</h3>
            {derivedSummary.totals.findings === 0 ? (
              <S.Muted>No findings logged yet.</S.Muted>
            ) : (
              <S.SeverityList>
                {["blocker", "critical", "major", "minor", "info"].map(
                  (severity) => (
                    <S.SeverityRow key={severity}>
                      <S.SeverityBadge severity={severity}>
                        {severity}
                      </S.SeverityBadge>
                      <S.SeverityMeter>
                        <S.SeverityMeterFill
                          severity={severity}
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
                      </S.SeverityMeter>
                      <span>{severityTotals[severity] ?? 0}</span>
                    </S.SeverityRow>
                  )
                )}
              </S.SeverityList>
            )}
          </Card>

          <Card>
            <h3>KPI Alerts</h3>
            {kpiAlerts.length === 0 ? (
              <S.Muted>No KPI mismatches detected.</S.Muted>
            ) : (
              <S.KpiAlerts>
                {kpiAlerts.map((alert) => (
                  <li key={`${alert.runId}-${alert.label}`}>
                    <div>
                      <strong>{alert.label}</strong>
                      <br />
                      <span>
                        Expected: {alert.expected} • Observed: {alert.observed}
                      </span>
                    </div>
                    <S.LinkButton
                      type="button"
                      onClick={() => navigate(`/runs/${alert.runId}`)}
                    >
                      View
                    </S.LinkButton>
                  </li>
                ))}
              </S.KpiAlerts>
            )}
          </Card>

          <Card>
            <h3>Urgent Findings</h3>
            {urgentFindings.length === 0 ? (
              <S.Muted>No blocker or critical findings.</S.Muted>
            ) : (
              <S.UrgentList>
                {urgentFindings.map((item) => (
                  <li key={`${item.runId}-${item.assertion}`}>
                    <S.SeverityPill severity={item.severity}>
                      {item.severity}
                    </S.SeverityPill>
                    <div>
                      <strong>{item.assertion}</strong>
                      <p>{item.observed}</p>
                    </div>
                    <S.LinkButton
                      type="button"
                      onClick={() => navigate(`/runs/${item.runId}`)}
                    >
                      Open
                    </S.LinkButton>
                  </li>
                ))}
              </S.UrgentList>
            )}
          </Card>
        </S.DashboardColumns>
      </S.RunsDashboard>

      <Card>
        <h2>QA Run History</h2>
        <S.RunsListContainer>
          {runs.map((run) => {
            const task = tasks.get(run.taskId);
            const taskName = task?.name || run.taskId;
            return (
              <S.RunItem
                key={run.runId}
                onClick={() => navigate(`/runs/${run.runId}`)}
              >
                <S.RunHeader>
                  <S.RunId>{taskName}</S.RunId>
                  <StatusBadge status={run.status}>
                    {run.status.toUpperCase()}
                  </StatusBadge>
                </S.RunHeader>
                <S.RunInfo>
                  <span>Run ID: {run.runId.slice(0, 8)}</span>
                  <span>Provider: {run.provider}</span>
                  <span>Started: {formatDate(run.startedAt)}</span>
                </S.RunInfo>
                <S.RunInfo style={{ marginTop: "0.5rem" }}>
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
                </S.RunInfo>
              </S.RunItem>
            );
          })}
        </S.RunsListContainer>
      </Card>
    </>
  );
}
