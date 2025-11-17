import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import type { QAReport, RunEvent, RunState, TaskSpec } from "../types";
import {
  Card,
  Button,
  Loading,
  ErrorMessage,
  StatusBadge,
} from "../styles/shared.styled";
import * as S from "./RunDetail.styled";

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
  const [task, setTask] = useState<TaskSpec | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const completionRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

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

          if (data.taskId && !task) {
            try {
              const tasks = await api.getTasks();
              const foundTask = tasks.find((t) => t.id === data.taskId);
              if (foundTask) {
                setTask(foundTask);
              }
            } catch {
              // Task fetch failed, continue without task details
            }
          }
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
      setEvents((prev) => [...prev.slice(-1000), incoming]);

      if (incoming.payload) {
        const payload = incoming.payload;
        setRun((prev) => {
          const payloadReport = payload.report as QAReport | undefined;
          const payloadStatus = payload.runStatus as
            | RunState["status"]
            | undefined;
          const payloadFinished = payload.finishedAt as string | undefined;

          if (!prev && !payloadReport) {
            return prev;
          }

          const placeholder: RunState = {
            runId,
            taskId: payloadReport?.taskId ?? "unknown",
            provider: "unknown",
            status: payloadStatus ?? "running",
            startedAt: payloadReport?.startedAt ?? incoming.timestamp,
          };

          const base = prev ?? placeholder;

          return {
            ...base,
            status: payloadStatus ?? base.status,
            finishedAt:
              payloadFinished ?? base.finishedAt ?? payloadReport?.finishedAt,
            taskId: payloadReport?.taskId ?? base.taskId,
            report: payloadReport ?? base.report,
          };
        });
      }

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
        const message = incoming.message?.toLowerCase() ?? "";
        if (message.includes("completed") || message.includes("error")) {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (completionRefreshTimer.current) {
            clearTimeout(completionRefreshTimer.current);
          }
          completionRefreshTimer.current = setTimeout(() => {
            void refreshRun(false);
          }, 750);
        }
      }
    });

    return () => {
      isMounted = false;
      if (completionRefreshTimer.current) {
        clearTimeout(completionRefreshTimer.current);
        completionRefreshTimer.current = null;
      }
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
    if (!fullPath) {
      return "";
    }
    const normalized = fullPath.replace(/\\/g, "/");
    if (normalized.startsWith("/api/artifacts/")) {
      return normalized;
    }
    const marker = "/artifacts/";
    const markerIndex = normalized.indexOf(marker);
    if (markerIndex !== -1) {
      const relative = normalized.slice(markerIndex + marker.length);
      return `/api/artifacts/${relative}`;
    }
    return `/api/artifacts/${normalized.replace(/^\/+/, "")}`;
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
    return run.artifacts.screenshots.map((path) => {
      return {
        path: toArtifactUrl(path),
        filename: extractFilename(path),
        originalPath: path,
        fallbackPath: undefined as string | undefined,
      };
    });
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
      <Card>
        <ErrorMessage>No run selected.</ErrorMessage>
        <Button onClick={() => navigate("/runs")}>Back to Runs</Button>
      </Card>
    );
  }

  if (loading && !run) {
    return <Loading>Loading run details...</Loading>;
  }

  if (error && !run) {
    return (
      <Card>
        <ErrorMessage>Error: {error}</ErrorMessage>
        <Button onClick={() => navigate("/runs")}>Back to Runs</Button>
      </Card>
    );
  }

  return (
    <S.RunDetailContainer>
      <Card>
        <S.RunDetailHeader>
          <div>
            <h2>{task?.name || run?.taskId || "Unknown Task"}</h2>
            <p>Run ID: {runId.slice(0, 8)}</p>
          </div>
          <S.RunDetailMeta>
            <StatusBadge status={run?.status ?? "running"}>
              {(run?.status ?? "running").toUpperCase()}
            </StatusBadge>
            <Button onClick={() => navigate("/runs")}>← Back to Runs</Button>
          </S.RunDetailMeta>
        </S.RunDetailHeader>
        <S.RunTimes>
          <span>
            Started: <strong>{formatDate(run?.startedAt)}</strong>
          </span>
          <span>
            Finished:{" "}
            <strong>
              {formatDate(run?.finishedAt ?? run?.report?.finishedAt)}
            </strong>
          </span>
          <span>
            Provider: <strong>{run?.provider ?? "N/A"}</strong>
          </span>
        </S.RunTimes>
        {error && run && (
          <ErrorMessage style={{ marginTop: "1rem" }}>{error}</ErrorMessage>
        )}
        {run?.error && (
          <ErrorMessage style={{ marginTop: "1rem" }}>{run.error}</ErrorMessage>
        )}
      </Card>

      <S.RunLiveGrid>
        <Card>
          <h2>Live Feed</h2>
          <S.EventsFeed>
            {events.length === 0 ? (
              <p>No events yet. Waiting for activity…</p>
            ) : (
              events
                .slice()
                .reverse()
                .map((event) => (
                  <S.EventItem key={`${event.timestamp}-${event.type}`}>
                    <S.EventMeta>
                      <S.EventTime>{formatTime(event.timestamp)}</S.EventTime>
                      <S.EventType type={event.type}>{event.type}</S.EventType>
                    </S.EventMeta>
                    {event.message && (
                      <S.EventMessage>{event.message}</S.EventMessage>
                    )}
                    {event.payload && event.type !== "screenshot" && (
                      <S.EventPayload>
                        {JSON.stringify(event.payload, null, 2)}
                      </S.EventPayload>
                    )}
                  </S.EventItem>
                ))
            )}
          </S.EventsFeed>
        </Card>

        <Card>
          <h2>Live Activity</h2>
          {screenshots.length === 0 ? (
            <p>No screenshots captured yet.</p>
          ) : (
            <>
              <S.ScreenshotFrame>
                <img src={screenshots[0].image} alt="Latest run screenshot" />
              </S.ScreenshotFrame>
              <S.ScreenshotMeta>
                <span>{formatTime(screenshots[0].timestamp)}</span>
                {screenshots[0].message && (
                  <span>{screenshots[0].message}</span>
                )}
              </S.ScreenshotMeta>
              {screenshots.length > 1 && (
                <S.ScreenshotStrip>
                  {screenshots.slice(1, 5).map((shot) => (
                    <img
                      key={shot.timestamp}
                      src={shot.image}
                      alt="Screenshot thumbnail"
                    />
                  ))}
                </S.ScreenshotStrip>
              )}
            </>
          )}
        </Card>
      </S.RunLiveGrid>

      {allScreenshots.length > 0 && (
        <Card>
          <h2>Screenshots Timeline ({allScreenshots.length} total)</h2>
          <S.SlideshowContainer>
            <S.SlideshowControls>
              <S.SlideshowBtn onClick={handlePrevSlide}>←</S.SlideshowBtn>
              <S.SlideshowBtn onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? "⏸" : "▶"}
              </S.SlideshowBtn>
              <S.SlideshowBtn onClick={handleNextSlide}>→</S.SlideshowBtn>
              <S.SlideshowCounter>
                {slideshowIndex + 1} / {allScreenshots.length}
              </S.SlideshowCounter>
            </S.SlideshowControls>
            <S.SlideshowFrame>
              <img
                src={allScreenshots[slideshowIndex].path}
                alt={`Screenshot ${slideshowIndex + 1}`}
              />
            </S.SlideshowFrame>
            <S.SlideshowThumbnails>
              {allScreenshots.map((screenshot, idx) => (
                <img
                  key={screenshot.filename}
                  src={screenshot.path}
                  alt={`Thumbnail ${idx + 1}`}
                  className={idx === slideshowIndex ? "active" : ""}
                  onClick={() => setSlideshowIndex(idx)}
                />
              ))}
            </S.SlideshowThumbnails>
          </S.SlideshowContainer>
        </Card>
      )}

      {run?.report && (
        <>
          <Card>
            <S.ReportSummary>
              <div>
                <h2>QA Report Summary</h2>
                <p>
                  <strong>Status:</strong>{" "}
                  <StatusBadge status={run.report.status}>
                    {run.report.status.toUpperCase()}
                  </StatusBadge>
                </p>
              </div>
              <div>
                <p>
                  <strong>Duration:</strong>{" "}
                  {(run.report.costs.durationMs / 1000).toFixed(2)}s
                </p>
                <p>
                  <strong>Tool Calls:</strong> {run.report.costs.toolCalls}
                </p>
              </div>
            </S.ReportSummary>

            <S.SummaryGrid>
              <S.SummaryCard>
                <S.SummaryValue>{run.report.findings.length}</S.SummaryValue>
                <S.SummaryLabel>Total Findings</S.SummaryLabel>
              </S.SummaryCard>
              <S.SummaryCard>
                <S.SummaryValue>
                  {
                    run.report.kpiTable.filter((item) => item.status === "ok")
                      .length
                  }
                </S.SummaryValue>
                <S.SummaryLabel>KPI Passed</S.SummaryLabel>
              </S.SummaryCard>
              <S.SummaryCard>
                <S.SummaryValue>
                  ${run.report.costs.priceUsd.toFixed(4)}
                </S.SummaryValue>
                <S.SummaryLabel>Cost (USD)</S.SummaryLabel>
              </S.SummaryCard>
            </S.SummaryGrid>

            <S.ReportSummaryText>
              <strong>Summary:</strong> {run.report.summary}
            </S.ReportSummaryText>

            {Object.keys(severityCounts).length > 0 && (
              <S.SeverityBreakdown>
                <h3>Findings by Severity</h3>
                <div>
                  {Object.entries(severityCounts).map(([severity, count]) => (
                    <S.SeverityItem key={severity}>
                      <S.SeverityBadge severity={severity}>
                        {severity}
                      </S.SeverityBadge>
                      <span>{count}</span>
                    </S.SeverityItem>
                  ))}
                </div>
              </S.SeverityBreakdown>
            )}
          </Card>

          {run.report.kpiTable.length > 0 && (
            <Card>
              <h2>KPI Assessment</h2>
              <S.KpiTable>
                <S.KpiTableHeader>
                  <div>Label</div>
                  <div>Expected</div>
                  <div>Observed</div>
                  <div>Status</div>
                </S.KpiTableHeader>
                {run.report.kpiTable.map((kpi, idx) => (
                  <S.KpiTableRow key={idx}>
                    <S.KpiLabel>{kpi.label}</S.KpiLabel>
                    <S.KpiExpected>{kpi.expected}</S.KpiExpected>
                    <S.KpiObserved>{kpi.observed}</S.KpiObserved>
                    <div>
                      <S.KpiStatus status={kpi.status}>
                        {kpi.status === "ok"
                          ? "✓ OK"
                          : kpi.status === "mismatch"
                            ? "✗ Mismatch"
                            : "? Missing"}
                      </S.KpiStatus>
                    </div>
                  </S.KpiTableRow>
                ))}
              </S.KpiTable>
            </Card>
          )}

          <Card>
            <h2>Findings</h2>
            {run.report.findings.length === 0 ? (
              <p>No findings reported.</p>
            ) : (
              run.report.findings.map((finding) => (
                <S.Finding key={finding.id} severity={finding.severity}>
                  <S.FindingHeader>
                    <S.FindingTitle>{finding.assertion}</S.FindingTitle>
                    <S.SeverityBadge severity={finding.severity}>
                      {finding.severity}
                    </S.SeverityBadge>
                  </S.FindingHeader>
                  <S.FindingBody>
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
                  </S.FindingBody>
                  {finding.evidence.length > 0 && (
                    <S.FindingEvidence>
                      <strong>Evidence:</strong>
                      <S.EvidenceGallery>
                        {finding.evidence.map((evidence, idx) => {
                          const evidenceFilename = extractFilename(
                            evidence.screenshotRef
                          );
                          const screenshot =
                            allScreenshots.find(
                              (s) =>
                                s.filename === evidenceFilename ||
                                evidence.screenshotRef.includes(s.filename)
                            ) ?? null;

                          if (!screenshot) {
                            return null;
                          }
                          return (
                            <S.EvidenceItem
                              key={idx}
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
                                data-debug-original={screenshot.originalPath}
                              />
                              <S.EvidenceInfo>
                                <span>{evidence.time}</span>
                              </S.EvidenceInfo>
                            </S.EvidenceItem>
                          );
                        })}
                      </S.EvidenceGallery>
                    </S.FindingEvidence>
                  )}
                  <S.FindingMeta>
                    <span>Category: {finding.category}</span>
                    <span>
                      Confidence: {(finding.confidence * 100).toFixed(0)}%
                    </span>
                    {finding.evidence.length > 0 && (
                      <span>📸 {finding.evidence.length} Evidence Item(s)</span>
                    )}
                  </S.FindingMeta>
                </S.Finding>
              ))
            )}
          </Card>
        </>
      )}

      {selectedEvidence && (
        <S.EvidenceModal onClick={() => setSelectedEvidence(null)}>
          <S.EvidenceModalContent>
            <S.EvidenceModalClose onClick={() => setSelectedEvidence(null)}>
              ×
            </S.EvidenceModalClose>
            <img src={selectedEvidence} alt="Evidence full size" />
          </S.EvidenceModalContent>
        </S.EvidenceModal>
      )}
    </S.RunDetailContainer>
  );
}
