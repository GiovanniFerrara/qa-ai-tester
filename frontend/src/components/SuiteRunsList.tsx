import { useNavigate, useParams } from "react-router-dom";
import { useCollection, useCollectionRuns } from "../hooks/useApi";
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

  const { data: collection, isLoading: collectionLoading } = useCollection(
    collectionId || ""
  );
  const {
    data: runs,
    isLoading: runsLoading,
    error,
  } = useCollectionRuns(collectionId || "");

  const handleViewRun = (runId: string) => {
    navigate(`/test-suites/${collectionId}/runs/${runId}`);
  };

  const handleBack = () => {
    navigate("/test-suites");
  };

  if (collectionLoading || runsLoading) {
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
          <S.Title>{collection.name} - Runs</S.Title>
          {collection.description && (
            <S.Subtitle>{collection.description}</S.Subtitle>
          )}
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
          </S.EmptyState>
        </S.Card>
      ) : (
        <S.RunsListContainer>
          {runs.map((run) => {
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
                    <S.RunId>Run #{run.id.substring(0, 8)}</S.RunId>
                    <S.RunTimestamp>
                      Started: {new Date(run.startedAt).toLocaleString()}
                    </S.RunTimestamp>
                    {run.finishedAt && (
                      <S.RunTimestamp>
                        Finished: {new Date(run.finishedAt).toLocaleString()}
                      </S.RunTimestamp>
                    )}
                  </S.RunInfo>
                  <S.StatusBadge status={run.status}>
                    {run.status === "running" ? "🔄 Running" : "✓ Completed"}
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
                  {failedItems > 0 && (
                    <S.MetaItem>
                      <S.ErrorText>{failedItems} failed</S.ErrorText>
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
