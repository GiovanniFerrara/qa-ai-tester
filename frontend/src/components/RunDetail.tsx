import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QAReport } from '../types';
import { api } from '../api';

export function RunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<QAReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (runId) {
      loadReport();
    }
  }, [runId]);

  const loadReport = async () => {
    if (!runId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await api.getRunReport(runId);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSeverityClass = (severity: string) => {
    return `severity-badge severity-${severity}`;
  };

  const getFindingClass = (severity: string) => {
    return `finding finding-${severity}`;
  };

  if (loading) {
    return <div className="loading">Loading report...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">Error: {error}</div>
        <button onClick={() => navigate('/runs')}>Back to Runs</button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>Report Not Found</h3>
          <button onClick={() => navigate('/runs')}>Back to Runs</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2>QA Report - Run #{report.runId}</h2>
          <button onClick={() => navigate('/runs')}>← Back to Runs</button>
        </div>

        <div style={{ marginBottom: '1rem', color: '#5a6c7d' }}>
          <div>Task: {report.taskId}</div>
          <div>
            Status:{' '}
            <span className={`status status-${report.status}`}>{report.status.toUpperCase()}</span>
          </div>
          <div>Started: {formatDate(report.startedAt)}</div>
          {report.completedAt && <div>Completed: {formatDate(report.completedAt)}</div>}
          {report.metadata?.provider && <div>Provider: {report.metadata.provider}</div>}
          {report.metadata?.model && <div>Model: {report.metadata.model}</div>}
          {report.metadata?.duration && <div>Duration: {report.metadata.duration}ms</div>}
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-value">{report.summary.totalFindings}</div>
            <div className="summary-label">Total Findings</div>
          </div>
          <div className="summary-card">
            <div className="summary-value" style={{ color: '#0f5132' }}>
              {report.summary.passedChecks}
            </div>
            <div className="summary-label">Passed Checks</div>
          </div>
          <div className="summary-card">
            <div className="summary-value" style={{ color: '#842029' }}>
              {report.summary.failedChecks}
            </div>
            <div className="summary-label">Failed Checks</div>
          </div>
        </div>

        {Object.keys(report.summary.bySeverity).length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h3>Findings by Severity</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {Object.entries(report.summary.bySeverity).map(([severity, count]) => (
                <div
                  key={severity}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <span className={getSeverityClass(severity)}>{severity}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {report.findings.length > 0 ? (
        <div className="card">
          <h2>Findings</h2>
          {report.findings.map((finding) => (
            <div key={finding.id} className={getFindingClass(finding.severity)}>
              <div className="finding-header">
                <div className="finding-title">{finding.title}</div>
                <span className={getSeverityClass(finding.severity)}>{finding.severity}</span>
              </div>
              <div className="finding-description">{finding.description}</div>
              {finding.impact && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Impact:</strong> {finding.impact}
                </div>
              )}
              {finding.recommendation && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Recommendation:</strong> {finding.recommendation}
                </div>
              )}
              <div className="finding-meta">
                <span>Category: {finding.category}</span>
                {finding.evidence?.screenshot && <span>📸 Screenshot Available</span>}
                {finding.evidence?.domSnapshot && <span>🌐 DOM Snapshot Available</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <h3>No Findings</h3>
            <p>This run completed without any findings.</p>
          </div>
        </div>
      )}
    </div>
  );
}
