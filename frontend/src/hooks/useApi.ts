import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { api } from '../api';
import type { TaskSpec, RunState, CreateRunRequest, TaskInput, ApiException } from '../types';

export const QUERY_KEYS = {
  tasks: ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
  runs: ['runs'] as const,
  run: (id: string) => ['runs', id] as const,
  runSummary: ['runs', 'summary'] as const,
};

export const useTasks = (options?: Omit<UseQueryOptions<TaskSpec[], ApiException>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: QUERY_KEYS.tasks,
    queryFn: api.getTasks,
    ...options,
  });
};

export const useCreateTask = (options?: UseMutationOptions<TaskSpec, ApiException, TaskInput>) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: api.createTask,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      options?.onSuccess?.(...args);
    },
  });
};

export const useUpdateTask = (options?: UseMutationOptions<TaskSpec, ApiException, { taskId: string; data: Partial<TaskInput> }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: ({ taskId, data }) => api.updateTask(taskId, data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      options?.onSuccess?.(...args);
    },
  });
};

export const useDeleteTask = (options?: UseMutationOptions<{ success: boolean }, ApiException, string>) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: api.deleteTask,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      options?.onSuccess?.(...args);
    },
  });
};

export const useContextualizeTask = (options?: UseMutationOptions<TaskInput, ApiException, { prompt: string }>) => {
  return useMutation({
    mutationFn: api.contextualizeTask,
    ...options,
  });
};

export const useTranscribeAudio = (options?: UseMutationOptions<{ text: string }, ApiException, Blob>) => {
  return useMutation({
    mutationFn: api.transcribeAudio,
    ...options,
  });
};

export const useRuns = (options?: Omit<UseQueryOptions<RunState[], ApiException>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: QUERY_KEYS.runs,
    queryFn: api.getRuns,
    refetchInterval: 5000,
    ...options,
  });
};

export const useRunSummary = (options?: Omit<UseQueryOptions<Awaited<ReturnType<typeof api.getRunSummary>>, ApiException>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: QUERY_KEYS.runSummary,
    queryFn: api.getRunSummary,
    refetchInterval: 5000,
    ...options,
  });
};

export const useCreateRun = (options?: UseMutationOptions<RunState, ApiException, CreateRunRequest>) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: api.createRun,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.runs });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.runSummary });
      options?.onSuccess?.(...args);
    },
  });
};

export const useRun = (runId: string, options?: Omit<UseQueryOptions<RunState, ApiException>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: QUERY_KEYS.run(runId),
    queryFn: () => api.getRun(runId),
    enabled: !!runId,
    ...options,
  });
};