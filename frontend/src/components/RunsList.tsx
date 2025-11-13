import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Run } from '../types';
import { api } from '../api';

export function RunsList() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadRuns();
    const interval = setInterval(loadRuns, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadRuns = async () => {
    try {
      setError(null);
      const data = await api.getRuns();
      setRuns(
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runs');
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
        <button onClick={loadRuns}>Retry</button>
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
        {runs.map((run) => (
          <div key={run.id} className="run-item" onClick={() => navigate(`/runs/${run.id}`)}>
            <div className="run-header">
              <span className="run-id">Run #{run.id}</span>
              <span className={getStatusClass(run.status)}>{run.status.toUpperCase()}</span>
            </div>
            <div className="run-info">
              <span>Task: {run.taskId}</span>
              <span>Started: {formatDate(run.createdAt)}</span>
              {run.completedAt && <span>Completed: {formatDate(run.completedAt)}</span>}
            </div>
            {run.report && (
              <div className="run-info" style={{ marginTop: '0.5rem' }}>
                <span>Findings: {run.report.summary.totalFindings}</span>
                <span>Passed: {run.report.summary.passedChecks}</span>
                <span>Failed: {run.report.summary.failedChecks}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
