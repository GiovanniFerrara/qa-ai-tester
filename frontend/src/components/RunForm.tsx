import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTasks, useCreateRun } from "../hooks/useApi";
import type { Provider } from "../types";
import {
  Card,
  FormGroup,
  Label,
  Select,
  Input,
  Button,
  ErrorMessage,
  SuccessBanner,
  EmptyState,
} from "../styles/shared.styled";
import { TaskPreview, Hint } from "./RunForm.styled";
import { theme } from "../styles/theme";

export function RunForm() {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();

  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [provider, setProvider] = useState<Provider | "">("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return localStorage.getItem("qa-tester-base-url") ?? "";
  });
  const [success, setSuccess] = useState<string | null>(null);

  const createRunMutation = useCreateRun({
    onSuccess: (run) => {
      const taskName =
        tasks.find((task) => task.id === run.taskId)?.name ?? run.taskId;
      setSuccess(`Run "${taskName}" started.`);
      navigate(`/runs/${run.runId}`);
    },
  });

  useEffect(() => {
    if (tasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(tasks[0].id);
      setProvider(tasks[0].provider ?? "");
      setModel(tasks[0].model ?? "");
    }
  }, [tasks, selectedTaskId]);

  const handleTaskChange = (taskId: string) => {
    setSelectedTaskId(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setProvider(task.provider ?? "");
      setModel(task.model ?? "");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);

    createRunMutation.mutate({
      taskId: selectedTaskId,
      provider: provider || undefined,
      model: model || undefined,
      baseUrl: baseUrl || undefined,
    });
  };

  if (tasksLoading) {
    return <Card>Loading tasks...</Card>;
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <EmptyState>
          <h3>No Test Cases Available</h3>
          <p>Please register tasks before creating runs.</p>
        </EmptyState>
      </Card>
    );
  }

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  return (
    <Card>
      <h2>Start Individual Test Case</h2>
      <Hint style={{ marginTop: "8px", marginBottom: "16px" }}>
        Running a single test case, or want to run multiple tests?{" "}
        <Link
          to="/test-suites"
          style={{
            color: theme.colors.primary,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Create a Test Suite →
        </Link>
      </Hint>

      {createRunMutation.isError && (
        <ErrorMessage>{createRunMutation.error.message}</ErrorMessage>
      )}
      {success && <SuccessBanner>{success}</SuccessBanner>}

      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="task">Select Task</Label>
          <Select
            id="task"
            value={selectedTaskId}
            onChange={(e) => handleTaskChange(e.target.value)}
            required
          >
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="base-url">Application Base URL</Label>
          <Input
            id="base-url"
            type="url"
            placeholder="http://localhost:3000"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              localStorage.setItem("qa-tester-base-url", e.target.value);
            }}
          />
          <Hint>
            This value overrides the server BASE_URL for this run and is stored
            locally for convenience.
          </Hint>
        </FormGroup>

        <Button type="submit" disabled={createRunMutation.isPending}>
          {createRunMutation.isPending
            ? "Starting Test Case..."
            : "Start Test Case"}
        </Button>
      </form>

      {selectedTask && (
        <TaskPreview>
          <h3>{selectedTask.name}</h3>
          {selectedTask.description && <p>{selectedTask.description}</p>}
          <p>
            <strong>Route:</strong> {selectedTask.route}
          </p>
          <p>
            <strong>Goal:</strong> {selectedTask.goal}
          </p>
          <p>
            <strong>Automated login:</strong>{" "}
            {selectedTask.autoAuthEnabled ? "Enabled" : "Disabled"}
          </p>
          {selectedTask.instructions && (
            <p>
              <strong>Instructions:</strong> {selectedTask.instructions}
            </p>
          )}
        </TaskPreview>
      )}
    </Card>
  );
}
