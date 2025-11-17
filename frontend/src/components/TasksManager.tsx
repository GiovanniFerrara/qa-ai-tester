import { useMemo, useState } from "react";
import type { TaskInput, TaskSpec } from "../types";
import { QuickTaskPanel } from "./QuickTaskPanel";
import {
  Card,
  Button,
  ErrorMessage,
  SuccessBanner,
} from "../styles/shared.styled";
import * as S from "./TasksManager.styled";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "../hooks/useApi";

const defaultBudgets = {
  maxToolCalls: 200,
  maxTimeMs: 180_000,
  maxScreenshots: 50,
};

const emptyTask: TaskInput = {
  name: "",
  description: "",
  goal: "",
  instructions: "",
  route: "",
  role: "analyst",
  provider: "anthropic",
  model: "",
  requireFindings: true,
  autoAuthEnabled: false,
  budgets: { ...defaultBudgets },
};

export function TasksManager() {
  const [form, setForm] = useState<TaskInput>(emptyTask);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: tasks = [], error } = useTasks();
  const createTask = useCreateTask({
    onSuccess: () => {
      setSuccess("Task created successfully.");
      resetForm();
    },
  });
  const updateTask = useUpdateTask({
    onSuccess: () => {
      setSuccess("Task updated successfully.");
      resetForm();
    },
  });
  const deleteTask = useDeleteTask({
    onSuccess: () => {
      setSuccess("Task deleted.");
      resetForm();
    },
  });

  const toTaskInput = (task: TaskSpec): TaskInput => ({
    name: task.name,
    description: task.description ?? "",
    goal: task.goal,
    instructions: task.instructions ?? "",
    route: task.route,
    role: task.role,
    provider: task.provider ?? "anthropic",
    model: task.model ?? "",
    requireFindings: task.requireFindings ?? true,
    autoAuthEnabled: task.autoAuthEnabled ?? false,
    budgets: {
      maxToolCalls: task.budgets?.maxToolCalls ?? defaultBudgets.maxToolCalls,
      maxTimeMs: task.budgets?.maxTimeMs ?? defaultBudgets.maxTimeMs,
      maxScreenshots:
        task.budgets?.maxScreenshots ?? defaultBudgets.maxScreenshots,
    },
  });

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.name.localeCompare(b.name)),
    [tasks]
  );

  const resetForm = () => {
    setForm({
      ...emptyTask,
      budgets: { ...defaultBudgets },
    });
    setEditingTaskId(null);
  };

  const handleEdit = (task: TaskSpec) => {
    setEditingTaskId(task.id);
    setForm(toTaskInput(task));
    setSuccess(null);
  };

  const handleDelete = (taskId: string) => {
    if (!window.confirm("Delete this task? This action cannot be undone."))
      return;
    deleteTask.mutate(taskId);
  };

  const handleClone = (task: TaskSpec) => {
    const clonePayload: TaskInput = {
      ...toTaskInput(task),
      name: `${task.name} (copy)`,
    };
    createTask.mutate(clonePayload, {
      onSuccess: (created) => {
        setSuccess("Task cloned successfully.");
        setEditingTaskId(created.id);
        setForm(toTaskInput(created));
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);

    const payload: TaskInput = {
      ...form,
      budgets: {
        maxToolCalls: Number(
          form.budgets?.maxToolCalls ?? defaultBudgets.maxToolCalls
        ),
        maxTimeMs: Number(form.budgets?.maxTimeMs ?? defaultBudgets.maxTimeMs),
        maxScreenshots: Number(
          form.budgets?.maxScreenshots ?? defaultBudgets.maxScreenshots
        ),
      },
    };

    if (editingTaskId) {
      updateTask.mutate({ taskId: editingTaskId, data: payload });
    } else {
      createTask.mutate(payload);
    }
  };

  const handleInputChange = (
    field: keyof TaskInput,
    value: string | boolean | TaskInput["budgets"]
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBudgetChange = (
    field: keyof NonNullable<TaskInput["budgets"]>,
    value: number
  ) => {
    setForm((prev) => ({
      ...prev,
      budgets: {
        ...prev.budgets,
        [field]: value,
      },
    }));
  };

  const selectedTask = editingTaskId
    ? tasks.find((task) => task.id === editingTaskId)
    : undefined;

  const handleQuickPrefill = (draft: TaskInput) => {
    setEditingTaskId(null);
    setForm({
      ...emptyTask,
      ...draft,
      budgets: {
        maxToolCalls:
          draft.budgets?.maxToolCalls ?? defaultBudgets.maxToolCalls,
        maxTimeMs: draft.budgets?.maxTimeMs ?? defaultBudgets.maxTimeMs,
        maxScreenshots:
          draft.budgets?.maxScreenshots ?? defaultBudgets.maxScreenshots,
      },
    });
    setSuccess(
      "Task fields populated from quick task draft. Review and save when ready."
    );
  };

  const isActionLoading =
    createTask.isPending || updateTask.isPending || deleteTask.isPending;
  const actionError = createTask.error || updateTask.error || deleteTask.error;

  return (
    <S.TasksLayout>
      <Card as={S.TasksSidebar}>
        <S.TasksHeader>
          <h2>Test Cases</h2>
          <Button variant="secondary" onClick={resetForm}>
            + New Task
          </Button>
        </S.TasksHeader>
        {sortedTasks.length === 0 ? (
          <p>No tasks registered yet.</p>
        ) : (
          <S.TasksList>
            {sortedTasks.map((task) => (
              <S.TaskItem key={task.id} $isActive={task.id === editingTaskId}>
                <button type="button" onClick={() => handleEdit(task)}>
                  <S.TaskName>{task.name}</S.TaskName>
                  <S.TaskRoute>{task.route}</S.TaskRoute>
                </button>
                <S.TasksActions>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClone(task);
                    }}
                    disabled={isActionLoading}
                  >
                    Clone
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(task.id);
                    }}
                  >
                    Delete
                  </Button>
                </S.TasksActions>
              </S.TaskItem>
            ))}
          </S.TasksList>
        )}
      </Card>

      <Card as={S.TasksForm}>
        <QuickTaskPanel onPrefill={handleQuickPrefill} />
        <h2>{editingTaskId ? "Edit Task" : "Create Task"}</h2>

        {(error || actionError) && (
          <ErrorMessage>{error?.message || actionError?.message}</ErrorMessage>
        )}
        {success && <SuccessBanner>{success}</SuccessBanner>}

        <S.TaskFormGrid onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={2}
            />
          </label>

          <label>
            Goal / Prompt
            <textarea
              value={form.goal}
              onChange={(e) => handleInputChange("goal", e.target.value)}
              rows={3}
              required
            />
          </label>

          <label>
            Additional Instructions
            <textarea
              value={form.instructions}
              onChange={(e) =>
                handleInputChange("instructions", e.target.value)
              }
              rows={8}
            />
          </label>

          <S.FormGrid>
            <label>
              Start Route or URL
              <input
                type="text"
                value={form.route}
                onChange={(e) => handleInputChange("route", e.target.value)}
                required
              />
            </label>

            <label>
              Role
              <input
                type="text"
                value={form.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
              />
            </label>
          </S.FormGrid>

          <S.AdvancedSettingsSection>
            <S.AdvancedToggle
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? "▼" : "▶"} Advanced Settings
            </S.AdvancedToggle>

            {showAdvanced && (
              <S.AdvancedContent>
                <S.FormGrid>
                  <label>
                    Provider
                    <select
                      value={form.provider ?? ""}
                      onChange={(e) =>
                        handleInputChange("provider", e.target.value)
                      }
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                    </select>
                  </label>

                  <label>
                    Model (optional)
                    <input
                      type="text"
                      value={form.model ?? ""}
                      onChange={(e) =>
                        handleInputChange("model", e.target.value)
                      }
                      placeholder="e.g., computer-use-preview"
                    />
                  </label>
                </S.FormGrid>

                <S.Checkbox>
                  <input
                    type="checkbox"
                    checked={form.requireFindings}
                    onChange={(e) =>
                      handleInputChange("requireFindings", e.target.checked)
                    }
                  />
                  Require at least one finding in reports
                </S.Checkbox>
                <S.Checkbox>
                  <input
                    type="checkbox"
                    checked={form.autoAuthEnabled ?? false}
                    onChange={(e) =>
                      handleInputChange("autoAuthEnabled", e.target.checked)
                    }
                  />
                  Use automated login before each run
                </S.Checkbox>
                <S.FieldHint>
                  When enabled, the worker signs in with the stored credentials
                  before starting this task. Leave disabled if your auth state
                  is already persisted or login is unnecessary. More info here:
                  <code> backend/tests/auth.setup.ts </code>
                </S.FieldHint>

                <S.BudgetsFieldset>
                  <legend>Budgets</legend>
                  <S.FormGrid>
                    <label>
                      Max Tool Calls
                      <input
                        type="number"
                        min={1}
                        value={
                          form.budgets?.maxToolCalls ??
                          defaultBudgets.maxToolCalls
                        }
                        onChange={(e) =>
                          handleBudgetChange(
                            "maxToolCalls",
                            Number(e.target.value)
                          )
                        }
                      />
                    </label>
                    <label>
                      Max Time (ms)
                      <input
                        type="number"
                        min={1000}
                        value={
                          form.budgets?.maxTimeMs ?? defaultBudgets.maxTimeMs
                        }
                        onChange={(e) =>
                          handleBudgetChange(
                            "maxTimeMs",
                            Number(e.target.value)
                          )
                        }
                      />
                    </label>
                    <label>
                      Max Screenshots
                      <input
                        type="number"
                        min={1}
                        value={
                          form.budgets?.maxScreenshots ??
                          defaultBudgets.maxScreenshots
                        }
                        onChange={(e) =>
                          handleBudgetChange(
                            "maxScreenshots",
                            Number(e.target.value)
                          )
                        }
                      />
                    </label>
                  </S.FormGrid>
                </S.BudgetsFieldset>
              </S.AdvancedContent>
            )}
          </S.AdvancedSettingsSection>

          <S.FormActions>
            <Button type="submit" disabled={isActionLoading}>
              {isActionLoading
                ? "Saving..."
                : editingTaskId
                  ? "Update Task"
                  : "Create Task"}
            </Button>
            {editingTaskId && (
              <Button variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </S.FormActions>
        </S.TaskFormGrid>

        {selectedTask && (
          <S.TaskPreview>
            <h3>Current Task Preview</h3>
            <p>
              <strong>Name:</strong> {selectedTask.name}
            </p>
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
          </S.TaskPreview>
        )}
      </Card>
    </S.TasksLayout>
  );
}
