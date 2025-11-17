import { useNavigate, useParams } from "react-router-dom";
import { useCollectionRun } from "../hooks/useApi";
import type { CollectionRunItem } from "../types";
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

  return (
    <S.Container>
      <S.Header>
        <S.HeaderContent>
          <S.BackButton onClick={handleBack}>← Back to Test Cases</S.BackButton>
          <S.TitleRow>
            <S.Title>Suite Run #{run.id.substring(0, 8)}</S.Title>
            <S.StatusBadge status={run.status}>
              {run.status === "running" ? "🔄 Running" : "✓ Completed"}
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

          {failedItems > 0 && (
            <S.MetaItem>
              <label>Failed</label>
              <span style={{ color: "#842029" }}>{failedItems}</span>
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
          {run.items.map((item: CollectionRunItem) => (
            <S.TaskRunCard
              key={item.runId || item.taskId}
              data-status={item.status}
              onClick={() => item.runId && handleViewTask(item.runId)}
            >
              <S.TaskRunHeader>
                <S.TaskRunTitle>
                  <S.TaskId>Task: {item.taskId}</S.TaskId>
                </S.TaskRunTitle>
                <S.TaskRunStatus status={item.status}>
                  {item.status === "completed" && "✓ Completed"}
                  {item.status === "failed" && "✗ Failed"}
                  {item.status === "running" && "🔄 Running"}
                </S.TaskRunStatus>
              </S.TaskRunHeader>

              <S.TaskRunMeta>
                {item.runId ? (
                  <span>Run ID: {item.runId.substring(0, 8)}</span>
                ) : (
                  <span>Not started yet</span>
                )}
                {item.error && (
                  <span style={{ color: "#842029" }}>Error: {item.error}</span>
                )}
              </S.TaskRunMeta>
            </S.TaskRunCard>
          ))}
        </S.TaskRunsList>
      )}
    </S.Container>
  );
}
