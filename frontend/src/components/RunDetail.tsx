import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useRun, useTasks } from "../hooks/useApi";
import type { RunEvent, DismissReason } from "../types";
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

  const {
    data: run,
    isLoading: runLoading,
    error: runError,
    refetch: refetchRun,
  } = useRun(runId ?? "", {
    enabled: !!runId,
  });

  const { data: tasks = [] } = useTasks({
    enabled: !!run?.taskId,
  });

  const task = useMemo(
    () => tasks.find((t) => t.id === run?.taskId) ?? null,
    [tasks, run?.taskId]
  );

  const [events, setEvents] = useState<RunEvent[]>([]);
  const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([]);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [openDismissMenu, setOpenDismissMenu] = useState<string | null>(null);
  const [dismissingItem, setDismissingItem] = useState<string | null>(null);
  const completionRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    if (!runId) {
      return;
    }

    let eventSource: EventSource | null = null;

    eventSource = api.subscribeToRunEvents(runId, (incoming) => {
      setEvents((prev) => [...prev.slice(-1000), incoming]);

      if (incoming.payload) {
        void refetchRun();
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
            void refetchRun();
          }, 750);
        }
      }
    });

    return () => {
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

  const handleDismissFinding = useCallback(
    async (findingId: string, reason: DismissReason) => {
      if (!runId) return;
      setDismissingItem(findingId);
      setOpenDismissMenu(null);

      try {
        await api.dismissFinding(runId, findingId, reason);
        await refetchRun();
      } catch (error) {
        console.error("Failed to dismiss finding:", error);
      } finally {
        setDismissingItem(null);
      }
    },
    [runId, refetchRun]
  );

  const handleRestoreFinding = useCallback(
    async (findingId: string) => {
      if (!runId) return;
      setDismissingItem(findingId);

      try {
        await api.restoreFinding(runId, findingId);
        await refetchRun();
      } catch (error) {
        console.error("Failed to restore finding:", error);
      } finally {
        setDismissingItem(null);
      }
    },
    [runId, refetchRun]
  );

  const handleDismissKpi = useCallback(
    async (kpiLabel: string, reason: DismissReason) => {
      if (!runId) return;
      setDismissingItem(kpiLabel);
      setOpenDismissMenu(null);

      try {
        await api.dismissKpi(runId, kpiLabel, reason);
        await refetchRun();
      } catch (error) {
        console.error("Failed to dismiss KPI:", error);
      } finally {
        setDismissingItem(null);
      }
    },
    [runId, refetchRun]
  );

  const handleRestoreKpi = useCallback(
    async (kpiLabel: string) => {
      if (!runId) return;
      setDismissingItem(kpiLabel);

      try {
        await api.restoreKpi(runId, kpiLabel);
        await refetchRun();
      } catch (error) {
        console.error("Failed to restore KPI:", error);
      } finally {
        setDismissingItem(null);
      }
    },
    [runId, refetchRun]
  );

  const loading = runLoading;
  const error = runError;

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
        <Button onClick={() => navigate("/runs")}>Back to Test Cases</Button>
      </Card>
    );
  }

  if (loading && !run) {
    return <Loading>Loading run details...</Loading>;
  }

  if (error && !run) {
    return (
      <Card>
        <ErrorMessage>Error: {error.message}</ErrorMessage>
        <Button onClick={() => navigate("/runs")}>Back to Test Cases</Button>
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
            <Button onClick={() => navigate("/runs")}>
              ← Back to Test Cases
            </Button>
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
          <ErrorMessage style={{ marginTop: "1rem" }}>
            {error.message}
          </ErrorMessage>
        )}
        {run?.error && (
          <ErrorMessage style={{ marginTop: "1rem" }}>{run.error}</ErrorMessage>
        )}
      </Card>

      {(events.length > 0 || screenshots.length > 0) && (
        <S.RunLiveGrid>
          {events.length > 0 && (
            <Card>
              <h2>Live Feed</h2>
              <S.EventsFeed>
                {events
                  .slice()
                  .reverse()
                  .map((event) => (
                    <S.EventItem key={`${event.timestamp}-${event.type}`}>
                      <S.EventMeta>
                        <S.EventTime>{formatTime(event.timestamp)}</S.EventTime>
                        <S.EventType type={event.type}>
                          {event.type}
                        </S.EventType>
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
                  ))}
              </S.EventsFeed>
            </Card>
          )}

          {screenshots.length > 0 && (
            <Card>
              <h2>Live Activity</h2>
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
            </Card>
          )}
        </S.RunLiveGrid>
      )}

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
                <S.ThumbnailImage
                  key={screenshot.filename}
                  src={screenshot.path}
                  alt={`Thumbnail ${idx + 1}`}
                  active={idx === slideshowIndex}
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
                  <div>Actions</div>
                </S.KpiTableHeader>
                {run.report.kpiTable.map((kpi, idx) => {
                  const RowComponent = kpi.dismissal
                    ? S.DismissedKpiRow
                    : S.KpiTableRow;
                  return (
                    <RowComponent key={idx}>
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
                      <S.DismissActions>
                        {kpi.dismissal ? (
                          <>
                            <S.DismissedBadge reason={kpi.dismissal.reason}>
                              {kpi.dismissal.reason === "fixed"
                                ? "✓ Fixed"
                                : "⚠ False Positive"}
                            </S.DismissedBadge>
                            <S.RestoreButton
                              onClick={() => handleRestoreKpi(kpi.label)}
                              disabled={dismissingItem === kpi.label}
                            >
                              {dismissingItem === kpi.label ? "..." : "Restore"}
                            </S.RestoreButton>
                          </>
                        ) : kpi.status !== "ok" ? (
                          <S.DismissMenu>
                            <S.DismissButton
                              onClick={() =>
                                setOpenDismissMenu(
                                  openDismissMenu === kpi.label
                                    ? null
                                    : kpi.label
                                )
                              }
                              disabled={dismissingItem === kpi.label}
                            >
                              {dismissingItem === kpi.label
                                ? "Dismissing..."
                                : "Dismiss"}
                            </S.DismissButton>
                            {openDismissMenu === kpi.label && (
                              <S.DismissDropdown>
                                <S.DismissOption
                                  onClick={() =>
                                    handleDismissKpi(
                                      kpi.label,
                                      "false_positive"
                                    )
                                  }
                                >
                                  <strong>False Positive</strong>
                                  <span>
                                    This alert is incorrect or not applicable
                                  </span>
                                </S.DismissOption>
                                <S.DismissOption
                                  onClick={() =>
                                    handleDismissKpi(kpi.label, "fixed")
                                  }
                                >
                                  <strong>Fixed</strong>
                                  <span>This issue has been resolved</span>
                                </S.DismissOption>
                              </S.DismissDropdown>
                            )}
                          </S.DismissMenu>
                        ) : null}
                      </S.DismissActions>
                    </RowComponent>
                  );
                })}
              </S.KpiTable>
            </Card>
          )}

          <Card>
            <h2>Findings</h2>
            {run.report.findings.length === 0 ? (
              <p>No findings reported.</p>
            ) : (
              run.report.findings.map((finding) => {
                const FindingComponent = finding.dismissal
                  ? S.DismissedFinding
                  : S.Finding;
                return (
                  <FindingComponent
                    key={finding.id}
                    severity={finding.severity}
                  >
                    <S.FindingHeader>
                      <S.FindingTitle>{finding.assertion}</S.FindingTitle>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          alignItems: "center",
                        }}
                      >
                        <S.SeverityBadge severity={finding.severity}>
                          {finding.severity}
                        </S.SeverityBadge>
                        {finding.dismissal ? (
                          <>
                            <S.DismissedBadge reason={finding.dismissal.reason}>
                              {finding.dismissal.reason === "fixed"
                                ? "✓ Fixed"
                                : "⚠ False Positive"}
                            </S.DismissedBadge>
                            <S.RestoreButton
                              onClick={() => handleRestoreFinding(finding.id)}
                              disabled={dismissingItem === finding.id}
                            >
                              {dismissingItem === finding.id
                                ? "..."
                                : "Restore"}
                            </S.RestoreButton>
                          </>
                        ) : finding.severity !== "info" ? (
                          <S.DismissMenu>
                            <S.DismissButton
                              onClick={() =>
                                setOpenDismissMenu(
                                  openDismissMenu === finding.id
                                    ? null
                                    : finding.id
                                )
                              }
                              disabled={dismissingItem === finding.id}
                            >
                              {dismissingItem === finding.id
                                ? "Dismissing..."
                                : "Dismiss"}
                            </S.DismissButton>
                            {openDismissMenu === finding.id && (
                              <S.DismissDropdown>
                                <S.DismissOption
                                  onClick={() =>
                                    handleDismissFinding(
                                      finding.id,
                                      "false_positive"
                                    )
                                  }
                                >
                                  <strong>False Positive</strong>
                                  <span>
                                    This finding is incorrect or not applicable
                                  </span>
                                </S.DismissOption>
                                <S.DismissOption
                                  onClick={() =>
                                    handleDismissFinding(finding.id, "fixed")
                                  }
                                >
                                  <strong>Fixed</strong>
                                  <span>This issue has been resolved</span>
                                </S.DismissOption>
                              </S.DismissDropdown>
                            )}
                          </S.DismissMenu>
                        ) : null}
                      </div>
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
                        <span>
                          📸 {finding.evidence.length} Evidence Item(s)
                        </span>
                      )}
                    </S.FindingMeta>
                  </FindingComponent>
                );
              })
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
