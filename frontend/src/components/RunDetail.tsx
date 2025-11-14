import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QAReport } from "../types";
import { api } from "../api";

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
      setError(err instanceof Error ? err.message : "Failed to load report");
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
        <button onClick={() => navigate("/runs")}>Back to Runs</button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>Report Not Found</h3>
          <button onClick={() => navigate("/runs")}>Back to Runs</button>
        </div>
      </div>
    );
  }

  const severityCounts = report.findings.reduce(
    (acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div>
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2>QA Report - Run #{report.runId.slice(0, 8)}</h2>
          <button onClick={() => navigate("/runs")}>← Back to Runs</button>
        </div>

        <div style={{ marginBottom: "1rem", color: "#5a6c7d" }}>
          <div>Task: {report.taskId}</div>
          <div>
            Status:{" "}
            <span className={`status status-${report.status}`}>
              {report.status.toUpperCase()}
            </span>
          </div>
          <div>Started: {formatDate(report.startedAt)}</div>
          <div>Finished: {formatDate(report.finishedAt)}</div>
          <div>Duration: {report.costs.durationMs}ms</div>
        </div>

        <div
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "4px",
          }}
        >
          <strong>Summary:</strong> {report.summary}
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-value">{report.findings.length}</div>
            <div className="summary-label">Total Findings</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {report.kpiTable.filter((k) => k.status === "pass").length}
            </div>
            <div className="summary-label">KPI Passed</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{report.costs.toolCalls}</div>
            <div className="summary-label">Tool Calls</div>
          </div>
        </div>

        {Object.keys(severityCounts).length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <h3>Findings by Severity</h3>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                marginTop: "0.5rem",
              }}
            >
              {Object.entries(severityCounts).map(([severity, count]) => (
                <div
                  key={severity}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
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
                <div className="finding-title">{finding.assertion}</div>
                <span className={getSeverityClass(finding.severity)}>
                  {finding.severity}
                </span>
              </div>
              <div style={{ marginTop: "0.5rem" }}>
                <strong>Expected:</strong> {finding.expected}
              </div>
              <div style={{ marginTop: "0.5rem" }}>
                <strong>Observed:</strong> {finding.observed}
              </div>
              {finding.suggestedFix && (
                <div style={{ marginTop: "0.5rem" }}>
                  <strong>Suggested Fix:</strong> {finding.suggestedFix}
                </div>
              )}
              <div className="finding-meta">
                <span>Category: {finding.category}</span>
                <span>
                  Confidence: {(finding.confidence * 100).toFixed(0)}%
                </span>
                {finding.evidence.length > 0 && (
                  <span>📸 {finding.evidence.length} Evidence Item(s)</span>
                )}
              </div>

              {finding.evidence.length > 0 && (
                <div
                  style={{
                    marginTop: "1rem",
                    borderTop: "1px solid #dee2e6",
                    paddingTop: "1rem",
                  }}
                >
                  <h4
                    style={{
                      marginBottom: "0.75rem",
                      fontSize: "0.95rem",
                      color: "#495057",
                    }}
                  >
                    Evidence
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    {finding.evidence.map((evidence, idx) => (
                      <div
                        key={idx}
                        style={{
                          border: "1px solid #e9ecef",
                          borderRadius: "6px",
                          padding: "1rem",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "#6c757d",
                                marginBottom: "0.25rem",
                              }}
                            >
                              {formatDate(evidence.time)}
                            </div>
                            {evidence.selector && (
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  fontFamily: "monospace",
                                  color: "#495057",
                                }}
                              >
                                <strong>Selector:</strong> {evidence.selector}
                              </div>
                            )}
                            {evidence.networkRequestId && (
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#6c757d",
                                }}
                              >
                                <strong>Network:</strong>{" "}
                                {evidence.networkRequestId}
                              </div>
                            )}
                          </div>
                        </div>
                        {evidence.screenshotRef && (
                          <div>
                            <img
                              src={`/api/artifacts/${evidence.screenshotRef.split("artifacts/")[1]}`}
                              alt={`Evidence screenshot ${idx + 1}`}
                              style={{
                                width: "100%",
                                maxWidth: "800px",
                                border: "1px solid #dee2e6",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                              onClick={(e) => {
                                const img = e.currentTarget;
                                if (img.style.maxWidth === "800px") {
                                  img.style.maxWidth = "none";
                                  img.style.cursor = "zoom-out";
                                } else {
                                  img.style.maxWidth = "800px";
                                  img.style.cursor = "zoom-in";
                                }
                              }}
                            />
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "#6c757d",
                                marginTop: "0.5rem",
                              }}
                            >
                              Click image to zoom
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
