import { useState, useEffect, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useTasks,
  useCollection,
  useCreateCollection,
  useUpdateCollection,
} from "../hooks/useApi";
import { ExecutionMode, TaskCollectionInput, TaskSpec } from "../types";
import * as S from "./TestSuiteForm.styled";

export function TestSuiteForm() {
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId: string }>();
  const isEditMode = !!collectionId;

  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: collection, isLoading: collectionLoading } = useCollection(
    collectionId || "",
    { enabled: isEditMode }
  );

  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();

  const [formData, setFormData] = useState<TaskCollectionInput>({
    name: "",
    description: "",
    taskIds: [],
    executionMode: "parallel",
    baseUrl: "",
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskFilter, setTaskFilter] = useState("");

  useEffect(() => {
    if (collection && isEditMode) {
      setFormData({
        name: collection.name,
        description: collection.description || "",
        taskIds: collection.taskIds,
        executionMode: collection.executionMode,
        baseUrl: collection.baseUrl ?? "",
      });
    }
  }, [collection, isEditMode]);

  useEffect(() => {
    if (!isEditMode) {
      const savedBaseUrl = localStorage.getItem("qa-tester-base-url");
      if (savedBaseUrl) {
        setFormData((prev) => ({
          ...prev,
          baseUrl: savedBaseUrl,
        }));
      }
    }
  }, [isEditMode]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
    setValidationError(null);
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, description: e.target.value });
  };

  const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, baseUrl: e.target.value });
  };

  const handleExecutionModeChange = (mode: ExecutionMode) => {
    setFormData({ ...formData, executionMode: mode });
  };

  const handleTaskToggle = (taskId: string) => {
    const newTaskIds = formData.taskIds.includes(taskId)
      ? formData.taskIds.filter((id) => id !== taskId)
      : [...formData.taskIds, taskId];

    setFormData({ ...formData, taskIds: newTaskIds });
    setValidationError(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = formData.taskIds.indexOf(active.id as string);
      const newIndex = formData.taskIds.indexOf(over.id as string);

      const newTaskIds = arrayMove(formData.taskIds, oldIndex, newIndex);
      setFormData({ ...formData, taskIds: newTaskIds });
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setValidationError("Test suite name is required");
      return false;
    }

    if (formData.taskIds.length === 0) {
      setValidationError("Please select at least one task");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setValidationError(null);

      const normalizedBaseUrl =
        formData.baseUrl === undefined || formData.baseUrl === null
          ? null
          : formData.baseUrl.trim() || null;

      const payload: TaskCollectionInput = {
        ...formData,
        baseUrl: normalizedBaseUrl,
      };

      if (isEditMode && collectionId) {
        await updateCollection.mutateAsync({
          collectionId,
          data: payload,
        });
      } else {
        await createCollection.mutateAsync(payload);
      }

      navigate("/test-suites");
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : "Failed to save test suite"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/test-suites");
  };

  if (tasksLoading || (isEditMode && collectionLoading)) {
    return <S.LoadingMessage>Loading...</S.LoadingMessage>;
  }

  return (
    <S.Container>
      <S.Header>
        <S.Title>
          {isEditMode ? "Edit Test Suite" : "Create Test Suite"}
        </S.Title>
        <S.Subtitle>
          {isEditMode
            ? "Update your test suite configuration"
            : "Group multiple tasks to run together"}
        </S.Subtitle>
      </S.Header>

      <S.Form onSubmit={handleSubmit}>
        {validationError && <S.ErrorMessage>{validationError}</S.ErrorMessage>}

        <S.FormSection>
          <S.Label htmlFor="name">Test Suite Name *</S.Label>
          <S.Input
            id="name"
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="e.g., E2E Shopping Flow"
            required
          />
        </S.FormSection>

        <S.FormSection>
          <S.Label htmlFor="description">Description</S.Label>
          <S.TextArea
            id="description"
            value={formData.description}
            onChange={handleDescriptionChange}
            placeholder="Describe what this test suite covers..."
          />
          <S.HelpText>
            Optional: Add a description to help identify this test suite
          </S.HelpText>
        </S.FormSection>

        <S.FormSection>
          <S.Label htmlFor="baseUrl">Base URL</S.Label>
          <S.Input
            id="baseUrl"
            type="url"
            value={formData.baseUrl ?? ""}
            onChange={handleBaseUrlChange}
            placeholder="e.g., https://staging.example.com"
          />
          <S.HelpText>
            Optional: Override the default BASE_URL when this suite runs. Leave
            blank to use the server-wide configuration.
          </S.HelpText>
        </S.FormSection>

        <S.FormSection>
          <S.Label>Execution Mode *</S.Label>
          <S.ExecutionModeSelector>
            <S.ExecutionModeOption
              selected={formData.executionMode === "parallel"}
            >
              <input
                type="radio"
                name="executionMode"
                value="parallel"
                checked={formData.executionMode === "parallel"}
                onChange={() => handleExecutionModeChange("parallel")}
              />
              <S.ModeIcon>⚡</S.ModeIcon>
              <S.ModeName>Parallel</S.ModeName>
              <S.ModeDescription>
                Run all tasks simultaneously for faster execution
              </S.ModeDescription>
            </S.ExecutionModeOption>

            <S.ExecutionModeOption
              selected={formData.executionMode === "sequential"}
            >
              <input
                type="radio"
                name="executionMode"
                value="sequential"
                checked={formData.executionMode === "sequential"}
                onChange={() => handleExecutionModeChange("sequential")}
              />
              <S.ModeIcon>➡️</S.ModeIcon>
              <S.ModeName>Sequential</S.ModeName>
              <S.ModeDescription>
                Run tasks one after another in order
              </S.ModeDescription>
            </S.ExecutionModeOption>
          </S.ExecutionModeSelector>
        </S.FormSection>

        <S.FormSection>
          <S.Label>Select Test Cases *</S.Label>
          {!tasks || tasks.length === 0 ? (
            <S.TaskSelector>
              <S.EmptyTaskList>
                No tasks available. Create some tasks first.
              </S.EmptyTaskList>
            </S.TaskSelector>
          ) : (
            <>
              <S.Input
                type="text"
                placeholder="Filter tasks by name..."
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                style={{ marginBottom: "12px" }}
              />
              <S.TaskSelector>
                {tasks
                  .filter((task) =>
                    task.name.toLowerCase().includes(taskFilter.toLowerCase())
                  )
                  .map((task) => (
                    <S.TaskOption
                      key={task.id}
                      selected={formData.taskIds.includes(task.id)}
                    >
                      <input
                        type="checkbox"
                        checked={formData.taskIds.includes(task.id)}
                        onChange={() => handleTaskToggle(task.id)}
                      />
                      <S.TaskInfo>
                        <S.TaskName>{task.name}</S.TaskName>
                        {task.description && (
                          <S.TaskDescription>
                            {task.description}
                          </S.TaskDescription>
                        )}
                      </S.TaskInfo>
                    </S.TaskOption>
                  ))}
              </S.TaskSelector>

              {formData.executionMode === "sequential" &&
                formData.taskIds.length > 0 && (
                  <>
                    <S.Label
                      style={{
                        fontSize: "14px",
                        marginTop: "16px",
                        marginBottom: "8px",
                      }}
                    >
                      Execution Order (Drag to reorder)
                    </S.Label>
                    <S.TaskSelector>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={formData.taskIds}
                          strategy={verticalListSortingStrategy}
                        >
                          {formData.taskIds.map((taskId, index) => {
                            const task = tasks.find((t) => t.id === taskId);
                            return task ? (
                              <SortableTaskItem
                                key={task.id}
                                task={task}
                                index={index}
                                onRemove={handleTaskToggle}
                              />
                            ) : null;
                          })}
                        </SortableContext>
                      </DndContext>
                    </S.TaskSelector>
                  </>
                )}
            </>
          )}
          <S.SelectedCount>
            {formData.taskIds.length} task
            {formData.taskIds.length !== 1 ? "s" : ""} selected
          </S.SelectedCount>
        </S.FormSection>

        <S.ButtonGroup>
          <S.Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </S.Button>
          <S.Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !tasks || tasks.length === 0}
          >
            {isSubmitting
              ? "Saving..."
              : isEditMode
                ? "Update Test Suite"
                : "Create Test Suite"}
          </S.Button>
        </S.ButtonGroup>
      </S.Form>
    </S.Container>
  );

  interface SortableTaskItemProps {
    task: TaskSpec;
    index: number;
    onRemove: (taskId: string) => void;
  }

  function SortableTaskItem({ task, index, onRemove }: SortableTaskItemProps) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: task.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      cursor: "move",
    };

    return (
      <S.TaskOption ref={setNodeRef} style={style} selected={true}>
        <div
          style={{ flex: 1, display: "flex", alignItems: "center" }}
          {...attributes}
          {...listeners}
        >
          <S.TaskInfo style={{ flex: 1 }}>
            <S.TaskName>
              {index + 1}. {task.name}
            </S.TaskName>
            {task.description && (
              <S.TaskDescription>{task.description}</S.TaskDescription>
            )}
          </S.TaskInfo>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(task.id);
          }}
          style={{
            background: "none",
            border: "none",
            color: "#999",
            cursor: "pointer",
            fontSize: "20px",
            padding: "4px 8px",
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#f44336";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#999";
          }}
        >
          ×
        </button>
      </S.TaskOption>
    );
  }
}
