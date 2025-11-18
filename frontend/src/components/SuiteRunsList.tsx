import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCollection,
  useCollectionRuns,
  useRuns,
  useStartCollectionRun,
  useDeleteCollection,
} from "../hooks/useApi";
import {
  getCollectionRunError,
  getCollectionRunResult,
} from "../utils/collectionRunResults";
import * as S from "./SuiteRunsList.styled";

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

export function SuiteRunsList() {
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId: string }>();
  const [isStarting, setIsStarting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: collection, isLoading: collectionLoading } = useCollection(
    collectionId || ""
  );
  const {
    data: runs,
    isLoading: runsLoading,
    error,
  } = useCollectionRuns(collectionId || "");
  const { data: allRuns = [], isLoading: suiteRunsLoading } = useRuns({
    refetchInterval: 5000,
  });
  const startRun = useStartCollectionRun();
  const deleteCollection = useDeleteCollection();

  const runMap = useMemo(
    () => new Map(allRuns.map((run) => [run.runId, run])),
    [allRuns]
  );

  const handleViewRun = (runId: string) => {
    navigate(`/test-suites/${collectionId}/runs/${runId}`);
  };

  const handleBack = () => {
    navigate("/test-suites");
  };

  const handleStartRun = async () => {
    if (!collectionId) return;

    try {
      setIsStarting(true);
      const run = await startRun.mutateAsync({
        collectionId,
        executionMode: collection?.executionMode,
      });
      navigate(`/test-suites/${collectionId}/runs/${run.id}`);
    } catch (err) {
      alert(
        `Failed to start test suite: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleEdit = () => {
    navigate(`/test-suites/${collectionId}/edit`);
  };

  const handleDelete = async () => {
    if (!collectionId) return;

    if (
      !confirm(
        `Are you sure you want to delete "${collection?.name}"? This will not delete existing run history.`
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteCollection.mutateAsync(collectionId);
      navigate("/test-suites");
    } catch (err) {
      alert(
        `Failed to delete test suite: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setIsDeleting(false);
    }
  };

  if (collectionLoading || runsLoading || suiteRunsLoading) {
    return <S.LoadingState>Loading suite runs...</S.LoadingState>;
  }

  if (error) {
    return (
      <S.Container>
        <S.ErrorState>
          <p>Error loading runs: {error.message}</p>
          <button onClick={handleBack}>Back to Test Suites</button>
        </S.ErrorState>
      </S.Container>
    );
  }

  if (!collection) {
    return (
      <S.Container>
        <S.ErrorState>
          <p>Test suite not found</p>
          <button onClick={handleBack}>Back to Test Suites</button>
        </S.ErrorState>
      </S.Container>
    );
  }

  return (
    <S.Container>
      <S.Header>
        <S.HeaderContent>
          <S.BackButton onClick={handleBack}>
            ← Back to Test Suites
          </S.BackButton>
          <S.TitleRow>
            <div>
              <S.Title>{collection.name} - Runs</S.Title>
              {collection.description && (
                <S.Subtitle>{collection.description}</S.Subtitle>
              )}
            </div>
            <S.ActionButtons>
              <S.ActionButton onClick={handleEdit}>✏️ Edit</S.ActionButton>
              <S.ActionButton onClick={handleStartRun} disabled={isStarting}>
                {isStarting ? "Starting..." : "▶ Run"}
              </S.ActionButton>
              <S.ActionButton
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "🗑️ Delete"}
              </S.ActionButton>
            </S.ActionButtons>
          </S.TitleRow>
          <S.HeaderMeta>
            <S.EnvTag muted={!collection.baseUrl}>
              <span>Base URL:</span>
              <code>{formatBaseUrl(collection.baseUrl)}</code>
            </S.EnvTag>
          </S.HeaderMeta>
        </S.HeaderContent>
      </S.Header>

      {!runs || runs.length === 0 ? (
        <S.Card>
          <S.EmptyState>
            <h3>No Runs Yet</h3>
            <p>This test suite hasn't been executed yet.</p>
            <S.RunButton onClick={handleStartRun} disabled={isStarting}>
              {isStarting ? "Starting..." : "▶ Run This Test Suite"}
            </S.RunButton>
          </S.EmptyState>
        </S.Card>
      ) : (
        <S.RunsListContainer>
          {runs.map((run) => {
            const suiteResult = getCollectionRunResult(run, runMap);
            const suiteError = getCollectionRunError(run, runMap);
            const completedItems = run.items.filter(
              (item) => item.status === "completed"
            ).length;
            const failedItems = run.items.filter(
              (item) => item.status === "failed"
            ).length;
            const totalItems = run.items.length;
            const progress =
              totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

            return (
              <S.RunCard key={run.id} onClick={() => handleViewRun(run.id)}>
                <S.RunHeader>
                  <S.RunInfo>
                    <S.RunId>
                      Started {new Date(run.startedAt).toLocaleString()}
                    </S.RunId>
                    {run.finishedAt && (
                      <S.RunTimestamp>
                        Finished: {new Date(run.finishedAt).toLocaleString()}
                      </S.RunTimestamp>
                    )}
                  </S.RunInfo>
                  <S.StatusBadge status={suiteResult.status}>
                    {suiteResult.label}
                  </S.StatusBadge>
                </S.RunHeader>

                <S.RunMeta>
                  <S.MetaItem>
                    <strong>Mode:</strong>{" "}
                    {run.executionMode === "parallel"
                      ? "⚡ Parallel"
                      : "➡️ Sequential"}
                  </S.MetaItem>
                  <S.MetaItem>
                    <strong>Base URL:</strong> {formatBaseUrl(run.baseUrl)}
                  </S.MetaItem>
                  <S.MetaItem>
                    <strong>Progress:</strong> {completedItems}/{totalItems}{" "}
                    tasks
                  </S.MetaItem>
                  <S.MetaItem>
                    <strong>Result:</strong> {suiteResult.label}
                  </S.MetaItem>
                  {failedItems > 0 && (
                    <S.MetaItem>
                      <S.ErrorText>{failedItems} failed</S.ErrorText>
                    </S.MetaItem>
                  )}
                  {suiteError && suiteResult.status === "failed" && (
                    <S.MetaItem>
                      <S.ErrorText title={suiteError}>
                        Error: {suiteError}
                      </S.ErrorText>
                    </S.MetaItem>
                  )}
                </S.RunMeta>

                {run.status === "running" && (
                  <S.ProgressBarContainer>
                    <S.ProgressBar progress={progress} />
                  </S.ProgressBarContainer>
                )}
              </S.RunCard>
            );
          })}
        </S.RunsListContainer>
      )}
    </S.Container>
  );
}
