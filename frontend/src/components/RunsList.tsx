import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRuns, useTasks, useRunSummary } from "../hooks/useApi";
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
  const navigate = useNavigate();
  const formatBaseUrl = useCallback((value?: string | null) => {
    if (!value) {
      return "Default BASE_URL";
    }
    try {
      return new URL(value).origin;
    } catch {
      return value;
    }
  }, []);

  const {
    data: runs = [],
    isLoading: runsLoading,
    error: runsError,
    refetch: refetchRuns,
  } = useRuns({
    refetchInterval: 5000,
  });

  const { data: tasksData = [], isLoading: tasksLoading } = useTasks({
    refetchInterval: 5000,
  });

  const { data: summary, isLoading: summaryLoading } = useRunSummary({
    refetchInterval: 5000,
  });

  const tasks = useMemo(
    () => new Map(tasksData.map((task) => [task.id, task])),
    [tasksData]
  );

  const sortedRuns = useMemo(
    () =>
      [...runs].sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      ),
    [runs]
  );

  const loading = runsLoading || tasksLoading || summaryLoading;
  const error = runsError;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const runMap = useMemo(
    () => new Map(sortedRuns.map((run) => [run.runId, run])),
    [sortedRuns]
  );

  const getRunDisplayName = useCallback(
    (runId: string) => {
      const run = runMap.get(runId);
      if (!run) {
        return "QA Test Case";
      }
      const task = tasks.get(run.taskId);
      return task?.name ?? run.taskId;
    },
    [runMap, tasks]
  );

  const derivedSummary = useMemo(() => {
    if (summary) {
      return summary;
    }
    const total = sortedRuns.length;
    const running = sortedRuns.filter((run) => run.status === "running").length;
    const failed = sortedRuns.filter((run) => run.status === "failed").length;
    const completed = sortedRuns.filter(
      (run) => run.status === "completed"
    ).length;
    const passed = sortedRuns.filter(
      (run) => run.report?.status === "passed"
    ).length;
    const findings = sortedRuns.reduce(
      (acc, run) =>
        acc + (run.report?.findings.filter((f) => !f.dismissal).length ?? 0),
      0
    );
    const durations = sortedRuns
      .map((run) => run.report?.costs.durationMs)
      .filter((value): value is number => typeof value === "number");
    const avgDurationMs =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    const totalCostUsd = sortedRuns.reduce(
      (acc, run) => acc + (run.report?.costs.priceUsd ?? 0),
      0
    );

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthCostUsd = sortedRuns
      .filter((run) => {
        const runDate = new Date(run.startedAt);
        return (
          runDate.getMonth() === currentMonth &&
          runDate.getFullYear() === currentYear
        );
      })
      .reduce((acc, run) => acc + (run.report?.costs.priceUsd ?? 0), 0);

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

    sortedRuns.forEach((run) => {
      run.report?.findings.forEach((finding) => {
        if (!finding.dismissal) {
          severity[finding.severity] = (severity[finding.severity] ?? 0) + 1;
        }
        if (
          !finding.dismissal &&
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
        if (!kpi.dismissal && kpi.status !== "ok" && kpiAlerts.length < 30) {
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
        totalCostUsd,
        monthCostUsd,
      },
      severity,
      urgentFindings: urgent,
      kpiAlerts,
      providerUsage: sortedRuns.reduce<Record<string, number>>((acc, run) => {
        acc[run.provider] = (acc[run.provider] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }, [summary, sortedRuns]);

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
        <ErrorMessage>Error: {error.message}</ErrorMessage>
        <Button onClick={() => refetchRuns()}>Retry</Button>
      </Card>
    );
  }

  if (sortedRuns.length === 0) {
    return (
      <Card>
        <EmptyState>
          <h3>No Test Cases Yet</h3>
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
            <span>Total Test Cases</span>
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
            <span>System Errors</span>
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
            <span>This Month Cost</span>
            <strong>${derivedSummary.totals.monthCostUsd.toFixed(2)}</strong>
          </S.SummaryCard>
          <S.SummaryCard>
            <span>Total Cost</span>
            <strong>${derivedSummary.totals.totalCostUsd.toFixed(2)}</strong>
          </S.SummaryCard>
          <S.SummaryCard>
            <span>Provider Usage</span>
            {providerUsage.length === 0 ? (
              <S.Muted>No provider data yet.</S.Muted>
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
                {kpiAlerts.map((alert) => {
                  const runName = getRunDisplayName(alert.runId);
                  return (
                    <li key={`${alert.runId}-${alert.label}`}>
                      <div>
                        <strong>{alert.label}</strong>
                        <br />
                        <span>Test: {runName}</span>
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
                  );
                })}
              </S.KpiAlerts>
            )}
          </Card>

          <Card>
            <h3>Urgent Findings</h3>
            {urgentFindings.length === 0 ? (
              <S.Muted>No blocker or critical findings.</S.Muted>
            ) : (
              <S.UrgentList>
                {urgentFindings.map((item) => {
                  const runName = getRunDisplayName(item.runId);
                  return (
                    <li key={`${item.runId}-${item.assertion}`}>
                      <S.SeverityPill severity={item.severity}>
                        {item.severity}
                      </S.SeverityPill>
                      <div>
                        <strong>{item.assertion}</strong>
                        <p>{item.observed}</p>
                        <S.UrgentContext>Test: {runName}</S.UrgentContext>
                      </div>
                      <S.LinkButton
                        type="button"
                        onClick={() => navigate(`/runs/${item.runId}`)}
                      >
                        Open
                      </S.LinkButton>
                    </li>
                  );
                })}
              </S.UrgentList>
            )}
          </Card>
        </S.DashboardColumns>
      </S.RunsDashboard>

      <Card>
        <h2>QA Test Reports</h2>
        <S.RunsListContainer>
          {sortedRuns.map((run) => {
            const task = tasks.get(run.taskId);
            const taskName = task?.name || run.taskId;
            return (
              <S.RunItem
                key={run.runId}
                onClick={() => navigate(`/runs/${run.runId}`)}
              >
                <S.RunHeader>
                  <S.RunId>{taskName}</S.RunId>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    {run.status === "completed" && run.report ? (
                      <S.PassFailBadge passed={run.report.status === "passed"}>
                        {run.report.status === "passed" ? "PASSED" : "FAILED"}
                      </S.PassFailBadge>
                    ) : run.status === "failed" ? (
                      <StatusBadge status="failed">ERROR</StatusBadge>
                    ) : (
                      <StatusBadge status={run.status}>
                        {run.status === "running"
                          ? "RUNNING"
                          : run.status.toUpperCase()}
                      </StatusBadge>
                    )}
                  </div>
                </S.RunHeader>
                <S.RunInfo>
                  <span>Route: {task?.route ?? "—"}</span>
                  <span>
                    Environment: {formatBaseUrl(run.baseUrlOverride ?? null)}
                  </span>
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
                    <S.ErrorText>
                      Failed{run.error ? `: ${run.error}` : ""}
                    </S.ErrorText>
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
