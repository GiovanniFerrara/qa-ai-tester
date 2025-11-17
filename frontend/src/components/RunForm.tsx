import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TaskSpec } from "../types";
import { api } from "../api";
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

export function RunForm() {
  const [tasks, setTasks] = useState<TaskSpec[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return localStorage.getItem("qa-tester-base-url") ?? "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
      if (data.length > 0) {
        setSelectedTaskId(data[0].id);
        setProvider(data[0].provider ?? "");
        setModel(data[0].model ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    }
  };

  const handleTaskChange = (taskId: string) => {
    setSelectedTaskId(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setProvider(task.provider ?? "");
      setModel(task.model ?? "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const run = await api.createRun({
        taskId: selectedTaskId,
        provider: provider || undefined,
        model: model || undefined,
        baseUrl: baseUrl || undefined,
      });
      setSuccess(`Run ${run.runId} started.`);
      navigate(`/runs/${run.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create run");
    } finally {
      setLoading(false);
    }
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <EmptyState>
          <h3>No Tasks Available</h3>
          <p>Please register tasks before creating runs.</p>
        </EmptyState>
      </Card>
    );
  }

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  return (
    <Card>
      <h2>Start New QA Run</h2>

      {error && <ErrorMessage>{error}</ErrorMessage>}
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

        <Button type="submit" disabled={loading}>
          {loading ? "Starting Run..." : "Start Run"}
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
