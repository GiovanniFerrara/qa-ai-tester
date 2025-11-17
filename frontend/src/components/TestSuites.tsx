import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useCollections,
  useDeleteCollection,
  useStartCollectionRun,
} from "../hooks/useApi";
import { ExecutionMode } from "../types";
import * as S from "./TestSuites.styled";

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

export function TestSuites() {
  const navigate = useNavigate();
  const { data: collections, isLoading, error, refetch } = useCollections();
  const deleteCollection = useDeleteCollection();
  const startRun = useStartCollectionRun();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const handleCreate = () => {
    navigate("/test-suites/new");
  };

  const handleEdit = (collectionId: string) => {
    navigate(`/test-suites/${collectionId}/edit`);
  };

  const handleView = (collectionId: string) => {
    navigate(`/test-suites/${collectionId}/runs`);
  };

  const handleDelete = async (collectionId: string) => {
    if (!confirm("Are you sure you want to delete this test suite?")) {
      return;
    }

    try {
      setDeletingId(collectionId);
      await deleteCollection.mutateAsync(collectionId);
    } catch (err) {
      alert(
        `Failed to delete test suite: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleRun = async (
    collectionId: string,
    executionMode?: ExecutionMode
  ) => {
    try {
      setRunningId(collectionId);
      const run = await startRun.mutateAsync({ collectionId, executionMode });
      navigate(`/test-suites/${collectionId}/runs/${run.id}`);
    } catch (err) {
      alert(
        `Failed to start test suite: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setRunningId(null);
    }
  };

  if (isLoading) {
    return <S.Loading>Loading test suites...</S.Loading>;
  }

  if (error) {
    return (
      <S.ErrorContainer>
        <p>Error: {error.message}</p>
        <S.ActionButton variant="primary" onClick={() => refetch()}>
          Retry
        </S.ActionButton>
      </S.ErrorContainer>
    );
  }

  if (!collections || collections.length === 0) {
    return (
      <S.Container>
        <S.Header>
          <S.Title>Test Suites</S.Title>
          <S.CreateButton onClick={handleCreate}>
            + Create Test Suite
          </S.CreateButton>
        </S.Header>
        <S.EmptyState>
          <h3>No Test Suites Yet</h3>
          <p>
            Test suites allow you to group multiple tasks and run them together
            in parallel or sequentially.
          </p>
          <S.CreateButton onClick={handleCreate}>
            + Create Your First Test Suite
          </S.CreateButton>
        </S.EmptyState>
      </S.Container>
    );
  }

  return (
    <S.Container>
      <S.Header>
        <S.Title>Test Suites</S.Title>
        <S.CreateButton onClick={handleCreate}>
          + Create Test Suite
        </S.CreateButton>
      </S.Header>

      <S.SuitesGrid>
        {collections.map((collection) => (
          <S.SuiteCard
            key={collection.id}
            onClick={() => handleView(collection.id)}
          >
            <S.SuiteHeader>
              <div>
                <S.SuiteName>{collection.name}</S.SuiteName>
                {collection.description && (
                  <S.SuiteDescription>
                    {collection.description}
                  </S.SuiteDescription>
                )}
              </div>
            </S.SuiteHeader>

            <S.SuiteMeta>
              <S.Badge variant="count">
                <S.IconWrapper>📋</S.IconWrapper>
                {collection.taskIds.length}{" "}
                {collection.taskIds.length === 1 ? "task" : "tasks"}
              </S.Badge>
              <S.Badge variant="mode">
                <S.IconWrapper>
                  {collection.executionMode === "parallel" ? "⚡" : "➡️"}
                </S.IconWrapper>
                {collection.executionMode === "parallel"
                  ? "Parallel"
                  : "Sequential"}
              </S.Badge>
              <S.Badge variant="env">
                <S.IconWrapper>🌐</S.IconWrapper>
                {formatBaseUrl(collection.baseUrl)}
              </S.Badge>
              <S.Badge variant="date">
                <S.IconWrapper>📅</S.IconWrapper>
                {new Date(collection.createdAt).toLocaleDateString()}
              </S.Badge>
              {collection.updatedAt !== collection.createdAt && (
                <S.Badge variant="date">
                  <S.IconWrapper>🔄</S.IconWrapper>
                  Updated {new Date(collection.updatedAt).toLocaleDateString()}
                </S.Badge>
              )}
            </S.SuiteMeta>

            <S.ActionButtons onClick={(e) => e.stopPropagation()}>
              <S.ActionButton
                variant="primary"
                disabled={
                  runningId === collection.id || collection.taskIds.length === 0
                }
                onClick={() =>
                  handleRun(collection.id, collection.executionMode)
                }
              >
                {runningId === collection.id ? "Starting..." : "Run"}
              </S.ActionButton>
              <S.ActionButton
                variant="secondary"
                onClick={() => handleEdit(collection.id)}
              >
                Edit
              </S.ActionButton>
              <S.ActionButton
                variant="danger"
                disabled={deletingId === collection.id}
                onClick={() => handleDelete(collection.id)}
              >
                {deletingId === collection.id ? "..." : "Delete"}
              </S.ActionButton>
            </S.ActionButtons>
          </S.SuiteCard>
        ))}
      </S.SuitesGrid>
    </S.Container>
  );
}
