import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import type { QAReport, RunEvent, RunState } from "../types";

interface ScreenshotEntry {
  image: string;
  timestamp: string;
  callId?: string;
  message?: string;
}

export function RunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<RunState | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) {
      return;
    }

    let isMounted = true;
    let eventSource: EventSource | null = null;

    const refreshRun = async (showLoading: boolean) => {
      if (showLoading) {
        setLoading(true);
      }
      try {
        const data = await api.getRun(runId);
        if (isMounted) {
          setRun(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load run");
        }
      } finally {
        if (isMounted && showLoading) {
          setLoading(false);
        }
      }
    };

    void refreshRun(true);

    eventSource = api.subscribeToRunEvents(runId, (incoming) => {
      setEvents((prev) => [...prev.slice(-199), incoming]);

      if (
        incoming.type === "screenshot" &&
        typeof incoming.payload?.image === "string"
      ) {
        setScreenshots((prev) => {
          const entry: ScreenshotEntry = {
            image: incoming.payload!.image as string,
            timestamp: incoming.timestamp,
            callId:
              typeof incoming.payload?.callId === "string"
                ? incoming.payload.callId
                : undefined,
            message: incoming.message,
          };
          const next = [entry, ...prev];
          return next.slice(0, 12);
        });
      }

      if (incoming.type === "status") {
        if (incoming.payload?.report) {
          const report = incoming.payload.report as QAReport;
          setRun((prev) =>
            prev
              ? {
                  ...prev,
                  status: "completed",
                  finishedAt: prev.finishedAt ?? report.finishedAt,
                  report,
                }
              : prev
          );
        }

        const message = incoming.message?.toLowerCase() ?? "";
        if (message.includes("completed") || message.includes("error")) {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          void refreshRun(false);
        }
      }
    });

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [runId]);

  const severityCounts = useMemo(() => {
    if (!run?.report) {
      return {};
    }
    return run.report.findings.reduce(
      (acc, finding) => {
        acc[finding.severity] = (acc[finding.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [run]);

  const formatDate = (value?: string) => {
    if (!value) {
      return "—";
    }
    return new Date(value).toLocaleString();
  };

  const formatTime = (value: string) => {
    return new Date(value).toLocaleTimeString();
  };

  const getSeverityClass = (severity: string) => {
    return `severity-badge severity-${severity}`;
  };

  const getFindingClass = (severity: string) => {
    return `finding finding-${severity}`;
  };

  const getStatusClass = (status: string) => {
    return `status status-${status}`;
  };

  const getKpiStatusClass = (status: string) => {
    return `kpi-status kpi-status-${status}`;
  };

  const toArtifactUrl = useCallback((fullPath: string) => {
    const normalized = fullPath.replace(/\\/g, "/");
    const marker = "/artifacts/";
    const markerIndex = normalized.indexOf(marker);
    if (markerIndex === -1) {
      return normalized;
    }
    const relative = normalized.slice(markerIndex + marker.length);
    return `/api/artifacts/${relative}`;
  }, []);

  const extractFilename = useCallback((fullPath: string) => {
    const normalized = fullPath.replace(/\\/g, "/");
    const segments = normalized.split("/");
    return segments[segments.length - 1] || normalized;
  }, []);

  const allScreenshots = useMemo(() => {
    if (!run?.artifacts?.screenshots) {
      return [];
    }
    return run.artifacts.screenshots.map((path) => ({
      path: toArtifactUrl(path),
      filename: extractFilename(path),
    }));
  }, [run, toArtifactUrl, extractFilename]);

  const handlePrevSlide = useCallback(() => {
    setSlideshowIndex((prev) =>
      prev > 0 ? prev - 1 : allScreenshots.length - 1
    );
  }, [allScreenshots.length]);

  const handleNextSlide = useCallback(() => {
    setSlideshowIndex((prev) =>
      prev < allScreenshots.length - 1 ? prev + 1 : 0
    );
  }, [allScreenshots.length]);

  useEffect(() => {
    if (!isPlaying || allScreenshots.length === 0) {
      return;
    }
    const interval = setInterval(() => {
      handleNextSlide();
    }, 1500);
    return () => clearInterval(interval);
  }, [isPlaying, allScreenshots.length, handleNextSlide]);

  if (!runId) {
    return (
      <div className="card">
        <div className="error">No run selected.</div>
        <button onClick={() => navigate("/runs")}>Back to Runs</button>
      </div>
    );
  }

  if (loading && !run) {
    return <div className="loading">Loading run details...</div>;
  }

  if (error && !run) {
    return (
      <div className="card">
        <div className="error">Error: {error}</div>
        <button onClick={() => navigate("/runs")}>Back to Runs</button>
      </div>
    );
  }

  return (
    <div className="run-detail">
      <div className="card">
        <div className="run-detail-header">
          <div>
            <h2>Run {runId.slice(0, 8)}</h2>
            <p>Task: {run?.taskId ?? "unknown"}</p>
          </div>
          <div className="run-detail-meta">
            <span className={getStatusClass(run?.status ?? "running")}>
              {(run?.status ?? "running").toUpperCase()}
            </span>
            <button onClick={() => navigate("/runs")}>← Back to Runs</button>
          </div>
        </div>
        <div className="run-times">
          <span>
            Started: <strong>{formatDate(run?.startedAt)}</strong>
          </span>
          <span>
            Finished: <strong>{formatDate(run?.finishedAt)}</strong>
          </span>
          <span>
            Provider: <strong>{run?.provider ?? "N/A"}</strong>
          </span>
        </div>
        {error && run && (
          <div className="error" style={{ marginTop: "1rem" }}>
            {error}
          </div>
        )}
        {run?.error && (
          <div className="error" style={{ marginTop: "1rem" }}>
            {run.error}
          </div>
        )}
      </div>

      <div className="run-live-grid">
        <div className="card">
          <h2>Live Feed</h2>
          <div className="events-feed">
            {events.length === 0 ? (
              <p>No events yet. Waiting for activity…</p>
            ) : (
              events
                .slice()
                .reverse()
                .map((event) => (
                  <div
                    key={`${event.timestamp}-${event.type}`}
                    className="event-item"
                  >
                    <div className="event-meta">
                      <span className="event-time">
                        {formatTime(event.timestamp)}
                      </span>
                      <span className={`event-type event-${event.type}`}>
                        {event.type}
                      </span>
                    </div>
                    {event.message && (
                      <div className="event-message">{event.message}</div>
                    )}
                    {event.payload && event.type !== "screenshot" && (
                      <pre className="event-payload">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="card">
          <h2>Live Activity</h2>
          {screenshots.length === 0 ? (
            <p>No screenshots captured yet.</p>
          ) : (
            <>
              <div className="screenshot-frame">
                {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                <img src={screenshots[0].image} alt="Latest run screenshot" />
              </div>
              <div className="screenshot-meta">
                <span>{formatTime(screenshots[0].timestamp)}</span>
                {screenshots[0].message && (
                  <span>{screenshots[0].message}</span>
                )}
              </div>
              {screenshots.length > 1 && (
                <div className="screenshot-strip">
                  {screenshots.slice(1, 5).map((shot) => (
                    <img
                      key={shot.timestamp}
                      src={shot.image}
                      alt="Screenshot thumbnail"
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {allScreenshots.length > 0 && (
        <div className="card">
          <h2>Screenshots Timeline ({allScreenshots.length} total)</h2>
          <div className="slideshow-container">
            <div className="slideshow-controls">
              <button onClick={handlePrevSlide} className="slideshow-btn">
                ←
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="slideshow-btn"
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
              <button onClick={handleNextSlide} className="slideshow-btn">
                →
              </button>
              <span className="slideshow-counter">
                {slideshowIndex + 1} / {allScreenshots.length}
              </span>
            </div>
            <div className="slideshow-frame">
              <img
                src={allScreenshots[slideshowIndex].path}
                alt={`Screenshot ${slideshowIndex + 1}`}
              />
            </div>
            <div className="slideshow-thumbnails">
              {allScreenshots.map((screenshot, idx) => (
                <img
                  key={screenshot.filename}
                  src={screenshot.path}
                  alt={`Thumbnail ${idx + 1}`}
                  className={idx === slideshowIndex ? "active" : ""}
                  onClick={() => setSlideshowIndex(idx)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {run?.report && (
        <>
          <div className="card">
            <div className="report-summary">
              <div>
                <h2>QA Report Summary</h2>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={getStatusClass(run.report.status)}>
                    {run.report.status.toUpperCase()}
                  </span>
                </p>
              </div>
              <div>
                <p>
                  <strong>Duration:</strong> {run.report.costs.durationMs}ms
                </p>
                <p>
                  <strong>Tool Calls:</strong> {run.report.costs.toolCalls}
                </p>
              </div>
            </div>

            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-value">
                  {run.report.findings.length}
                </div>
                <div className="summary-label">Total Findings</div>
              </div>
              <div className="summary-card">
                <div className="summary-value">
                  {
                    run.report.kpiTable.filter((item) => item.status === "ok")
                      .length
                  }
                </div>
                <div className="summary-label">KPI Passed</div>
              </div>
              <div className="summary-card">
                <div className="summary-value">
                  {run.report.costs.tokensInput}
                </div>
                <div className="summary-label">Input Tokens</div>
              </div>
              <div className="summary-card">
                <div className="summary-value">
                  {run.report.costs.tokensOutput}
                </div>
                <div className="summary-label">Output Tokens</div>
              </div>
            </div>

            <div className="report-summary-text">
              <strong>Summary:</strong> {run.report.summary}
            </div>

            {Object.keys(severityCounts).length > 0 && (
              <div className="severity-breakdown">
                <h3>Findings by Severity</h3>
                <div className="severity-list">
                  {Object.entries(severityCounts).map(([severity, count]) => (
                    <div key={severity} className="severity-item">
                      <span className={getSeverityClass(severity)}>
                        {severity}
                      </span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {run.report.kpiTable.length > 0 && (
            <div className="card">
              <h2>KPI Assessment</h2>
              <div className="kpi-table">
                <div className="kpi-table-header">
                  <div>Label</div>
                  <div>Expected</div>
                  <div>Observed</div>
                  <div>Status</div>
                </div>
                {run.report.kpiTable.map((kpi, idx) => (
                  <div key={idx} className="kpi-table-row">
                    <div className="kpi-label">{kpi.label}</div>
                    <div className="kpi-expected">{kpi.expected}</div>
                    <div className="kpi-observed">{kpi.observed}</div>
                    <div>
                      <span className={getKpiStatusClass(kpi.status)}>
                        {kpi.status === "ok"
                          ? "✓ OK"
                          : kpi.status === "mismatch"
                            ? "✗ Mismatch"
                            : "? Missing"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h2>Findings</h2>
            {run.report.findings.length === 0 ? (
              <p>No findings reported.</p>
            ) : (
              run.report.findings.map((finding) => (
                <div
                  key={finding.id}
                  className={getFindingClass(finding.severity)}
                >
                  <div className="finding-header">
                    <div className="finding-title">{finding.assertion}</div>
                    <span className={getSeverityClass(finding.severity)}>
                      {finding.severity}
                    </span>
                  </div>
                  <div className="finding-body">
                    <p>
                      <strong>Expected:</strong> {finding.expected}
                    </p>
                    <p>
                      <strong>Observed:</strong> {finding.observed}
                    </p>
                    {finding.suggestedFix && (
                      <p>
                        <strong>Suggested Fix:</strong> {finding.suggestedFix}
                      </p>
                    )}
                  </div>
                  {finding.evidence.length > 0 && (
                    <div className="finding-evidence">
                      <strong>Evidence:</strong>
                      <div className="evidence-gallery">
                        {finding.evidence.map((evidence, idx) => {
                          const evidenceFilename = extractFilename(
                            evidence.screenshotRef
                          );
                          const screenshot = allScreenshots.find(
                            (s) =>
                              s.filename === evidenceFilename ||
                              evidence.screenshotRef.includes(s.filename)
                          );
                          if (!screenshot) {
                            return null;
                          }
                          return (
                            <div
                              key={idx}
                              className="evidence-item"
                              onClick={() =>
                                setSelectedEvidence(
                                  selectedEvidence === screenshot.path
                                    ? null
                                    : screenshot.path
                                )
                              }
                            >
                              <img
                                src={screenshot.path}
                                alt={`Evidence ${idx + 1}`}
                              />
                              <div className="evidence-info">
                                <span>{evidence.time}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                </div>
              ))
            )}
          </div>
        </>
      )}

      {selectedEvidence && (
        <div
          className="evidence-modal"
          onClick={() => setSelectedEvidence(null)}
        >
          <div className="evidence-modal-content">
            <button
              className="evidence-modal-close"
              onClick={() => setSelectedEvidence(null)}
            >
              ×
            </button>
            <img src={selectedEvidence} alt="Evidence full size" />
          </div>
        </div>
      )}
    </div>
  );
}
