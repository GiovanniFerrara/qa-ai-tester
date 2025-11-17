import { useState, useEffect } from "react";
import { TaskSpec } from "../types";
import { api } from "../api";
import * as S from "./TaskList.styled";

interface TaskListProps {
  onSelectTask: (taskId: string) => void;
}

export function TaskList({ onSelectTask }: TaskListProps) {
  const [tasks, setTasks] = useState<TaskSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    onSelectTask(taskId);
  };

  if (loading) {
    return <S.Loading>Loading tasks...</S.Loading>;
  }

  if (error) {
    return (
      <S.ErrorContainer>
        <S.ErrorMessage>Error: {error}</S.ErrorMessage>
        <S.RetryButton onClick={loadTasks}>Retry</S.RetryButton>
      </S.ErrorContainer>
    );
  }

  if (tasks.length === 0) {
    return (
      <S.Container>
        <S.EmptyState>
          <h3>No Test Cases Available</h3>
          <p>No QA tasks have been registered yet.</p>
        </S.EmptyState>
      </S.Container>
    );
  }

  return (
    <S.Container>
      <S.Header>Available QA Test Cases</S.Header>
      <S.TaskGrid>
        {tasks.map((task) => (
          <S.TaskCard
            key={task.id}
            selected={selectedTaskId === task.id}
            onClick={() => handleSelectTask(task.id)}
          >
            <h3>{task.name}</h3>
            <p>{task.description}</p>
            <S.TaskMeta>
              {task.provider && (
                <S.Badge variant="provider">{task.provider}</S.Badge>
              )}
              {task.model && <S.Badge variant="model">{task.model}</S.Badge>}
              {task.autoAuthEnabled && (
                <S.Badge variant="auth" title="Automated login enabled">
                  Auto Auth
                </S.Badge>
              )}
            </S.TaskMeta>
          </S.TaskCard>
        ))}
      </S.TaskGrid>
    </S.Container>
  );
}
