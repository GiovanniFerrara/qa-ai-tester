import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCollection,
  useCollectionRun,
  useRuns,
  useTasks,
} from "../hooks/useApi";
import type { CollectionRunItem } from "../types";
import {
  getCollectionItemResult,
  getCollectionRunError,
  getCollectionRunResult,
} from "../utils/collectionRunResults";
import * as S from "./SuiteRunDetail.styled";

const formatBaseUrl = (value?: string | null) => {
  if (!value) {
    return "Default BASE_URL";
  }
  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return value;
  }
};

const formatDuration = (ms?: number) => {
  if (!ms || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60000).toFixed(1)} min`;
};

export function SuiteRunDetail() {
  const navigate = useNavigate();
  const { collectionId, runId } = useParams<{
    collectionId: string;
    runId: string;
  }>();

  const {
    data: run,
    isLoading,
    error,
  } = useCollectionRun(collectionId || "", runId || "");
  const { data: collection } = useCollection(collectionId || "", {
    enabled: !!collectionId,
  });
  const { data: tasks = [] } = useTasks();
  const { data: allRuns = [] } = useRuns({
    refetchInterval: 5000,
  });

  const taskMap = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks]
  );
  const runMap = useMemo(
    () => new Map(allRuns.map((item) => [item.runId, item])),
    [allRuns]
  );

  const getTaskName = (taskId: string) =>
    taskMap.get(taskId)?.name ?? taskId;

  const handleBack = () => {
    navigate(`/test-suites/${collectionId}/runs`);
  };

  const handleViewTask = (taskRunId: string) => {
    navigate(`/runs/${taskRunId}`);
  };

  if (isLoading) {
    return <S.LoadingState>Loading run details...</S.LoadingState>;
  }

  if (error) {
    return (
      <S.Container>
        <S.ErrorState>
          <p>Error loading run: {error.message}</p>
          <button onClick={handleBack}>Back to Test Cases</button>
        </S.ErrorState>
      </S.Container>
    );
  }

  if (!run) {
    return (
      <S.Container>
        <S.ErrorState>
          <p>Run not found</p>
          <button onClick={handleBack}>Back to Test Cases</button>
        </S.ErrorState>
      </S.Container>
    );
  }

  const completedItems = run.items.filter(
    (item) => item.status === "completed"
  ).length;
  const failedItems = run.items.filter(
    (item) => item.status === "failed"
  ).length;
  const totalItems = run.items.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const suiteResult = getCollectionRunResult(run, runMap);
  const suiteError = getCollectionRunError(run, runMap);

  return (
    <S.Container>
      <S.Header>
        <S.HeaderContent>
          <S.BackButton onClick={handleBack}>← Back to Test Suites</S.BackButton>
          <S.TitleRow>
            <div>
              <S.Title>{collection?.name ?? "Suite Run"}</S.Title>
              <S.RunSubtitle>
                Started {new Date(run.startedAt).toLocaleString()}
              </S.RunSubtitle>
            </div>
            <S.StatusBadge status={suiteResult.status}>
              {suiteResult.label}
            </S.StatusBadge>
          </S.TitleRow>
        </S.HeaderContent>
      </S.Header>

      <S.MetaCard>
        <S.MetaGrid>
          <S.MetaItem>
            <label>Execution Mode</label>
            <span>
              {run.executionMode === "parallel"
                ? "⚡ Parallel"
                : "➡️ Sequential"}
            </span>
          </S.MetaItem>

          <S.MetaItem>
            <label>Base URL</label>
            <span>{formatBaseUrl(run.baseUrl)}</span>
          </S.MetaItem>

          <S.MetaItem>
            <label>Started At</label>
            <span>{new Date(run.startedAt).toLocaleString()}</span>
          </S.MetaItem>

          {run.finishedAt && (
            <S.MetaItem>
              <label>Finished At</label>
              <span>{new Date(run.finishedAt).toLocaleString()}</span>
            </S.MetaItem>
          )}

          <S.MetaItem>
            <label>Total Test Cases</label>
            <span>{totalItems}</span>
          </S.MetaItem>

          <S.MetaItem>
            <label>Completed</label>
            <span>{completedItems}</span>
          </S.MetaItem>

          <S.MetaItem>
            <label>Suite Result</label>
            <span>{suiteResult.label}</span>
          </S.MetaItem>

          {failedItems > 0 && (
            <S.MetaItem>
              <label>Failed</label>
              <span style={{ color: "#842029" }}>{failedItems}</span>
            </S.MetaItem>
          )}

          {suiteError && (
            <S.MetaItem>
              <label>Last Error</label>
              <S.ErrorText title={suiteError}>{suiteError}</S.ErrorText>
            </S.MetaItem>
          )}
        </S.MetaGrid>

        {run.status === "running" && (
          <S.ProgressSection>
            <S.ProgressLabel>
              <span>Progress</span>
              <strong>
                {completedItems} / {totalItems} tasks
              </strong>
            </S.ProgressLabel>
            <S.ProgressBarContainer>
              <S.ProgressBar progress={progress} />
            </S.ProgressBarContainer>
          </S.ProgressSection>
        )}
      </S.MetaCard>

      <S.SectionTitle>Test Cases</S.SectionTitle>

      {run.items.length === 0 ? (
        <S.EmptyState>
          <h3>No Test Cases</h3>
          <p>This run has no task executions.</p>
        </S.EmptyState>
      ) : (
        <S.TaskRunsList>
          {run.items.map((item: CollectionRunItem) => {
            const itemResult = getCollectionItemResult(item, runMap);
            const relatedRun = itemResult.run;
            const canOpen = Boolean(item.runId);
            const onCardClick = () => {
              if (item.runId) {
                handleViewTask(item.runId);
              }
            };

            return (
              <S.TaskRunCard
                key={item.runId || item.taskId}
                data-status={itemResult.status}
                onClick={onCardClick}
              >
                <S.TaskRunHeader>
                  <S.TaskRunTitle>
                    <S.TaskId>
                      {item.taskName ?? getTaskName(item.taskId)}
                    </S.TaskId>
                  </S.TaskRunTitle>
                  <S.TaskRunStatus status={itemResult.status}>
                    {itemResult.label}
                  </S.TaskRunStatus>
                </S.TaskRunHeader>

                <S.TaskRunMeta>
                  {canOpen ? (
                    <>
                      {relatedRun?.status === "completed" &&
                      relatedRun.report ? (
                        <>
                          <span>
                            Findings: {relatedRun.report.findings.length}
                          </span>
                          <span>
                            Duration:{" "}
                            {formatDuration(
                              relatedRun.report.costs.durationMs
                            )}
                          </span>
                        </>
                      ) : relatedRun?.status === "failed" ? (
                        <S.ErrorText>
                          Failed
                          {relatedRun.error ? `: ${relatedRun.error}` : ""}
                        </S.ErrorText>
                      ) : itemResult.status === "failed" &&
                        itemResult.error ? (
                        <S.ErrorText>
                          Failed: {itemResult.error}
                        </S.ErrorText>
                      ) : itemResult.status === "running" ? (
                        <span>In progress…</span>
                      ) : (
                        <span>Awaiting result…</span>
                      )}
                      <span>Tap to open detailed report</span>
                    </>
                  ) : (
                    <span>Not started yet</span>
                  )}
                </S.TaskRunMeta>
              </S.TaskRunCard>
            );
          })}
        </S.TaskRunsList>
      )}
    </S.Container>
  );
}
