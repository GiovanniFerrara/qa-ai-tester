import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RunState, TaskSpec } from "../types";
import { api } from "../api";

export function RunsList() {
  const [runs, setRuns] = useState<RunState[]>([]);
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
      const [runsData, tasksData] = await Promise.all([
        api.getRuns(),
        api.getTasks(),
      ]);

      const tasksMap = new Map(tasksData.map((task) => [task.id, task]));
      setTasks(tasksMap);

      setRuns(
        runsData.sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        )
      );
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
                      Duration:{" "}
                      {(run.report.costs.durationMs / 1000).toFixed(2)}s
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
  );
}
