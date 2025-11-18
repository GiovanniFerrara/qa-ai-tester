import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { api } from '../api';
import type { TaskSpec, RunState, CreateRunRequest, TaskInput, ApiException, TaskCollection, TaskCollectionInput, CollectionRunRecord, ExecutionMode } from '../types';

export const QUERY_KEYS = {
  tasks: ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
  runs: ['runs'] as const,
  run: (id: string) => ['runs', id] as const,
  runSummary: ['runs', 'summary'] as const,
  collections: ['collections'] as const,
  collection: (id: string) => ['collections', id] as const,
  collectionRuns: (collectionId: string) => ['collections', collectionId, 'runs'] as const,
  collectionRun: (collectionId: string, runId: string) => ['collections', collectionId, 'runs', runId] as const,
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

export const useCancelRun = (
  options?: UseMutationOptions<{ success: boolean; run: RunState }, ApiException, string>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: api.cancelRun,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.runs });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.runSummary });
      if (args[1]) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.run(args[1]) });
      }
      options?.onSuccess?.(...args);
    },
  });
};

export const useCollections = (options?: Omit<UseQueryOptions<TaskCollection[], ApiException>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: QUERY_KEYS.collections,
    queryFn: api.getCollections,
    ...options,
  });
};

export const useCollection = (collectionId: string, options?: Omit<UseQueryOptions<TaskCollection, ApiException>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: QUERY_KEYS.collection(collectionId),
    queryFn: () => api.getCollection(collectionId),
    enabled: !!collectionId,
    ...options,
  });
};

export const useCreateCollection = (options?: UseMutationOptions<TaskCollection, ApiException, TaskCollectionInput>) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: api.createCollection,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.collections });
      options?.onSuccess?.(...args);
    },
  });
};

export const useUpdateCollection = (options?: UseMutationOptions<TaskCollection, ApiException, { collectionId: string; data: Partial<TaskCollectionInput> }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: ({ collectionId, data }) => api.updateCollection(collectionId, data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.collections });
      options?.onSuccess?.(...args);
    },
  });
};

export const useDeleteCollection = (options?: UseMutationOptions<{ success: boolean }, ApiException, string>) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: api.deleteCollection,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.collections });
      options?.onSuccess?.(...args);
    },
  });
};

export const useStartCollectionRun = (
  options?: UseMutationOptions<
    CollectionRunRecord,
    ApiException,
    { collectionId: string; executionMode?: ExecutionMode; baseUrl?: string | null }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: ({ collectionId, executionMode, baseUrl }) =>
      api.startCollectionRun(collectionId, { executionMode, baseUrl }),
    onSuccess: (...args) => {
      const collectionId = args[1].collectionId;
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.collectionRuns(collectionId) });
      options?.onSuccess?.(...args);
    },
  });
};

export const useCollectionRuns = (collectionId: string, options?: Omit<UseQueryOptions<CollectionRunRecord[], ApiException>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: QUERY_KEYS.collectionRuns(collectionId),
    queryFn: () => api.getCollectionRuns(collectionId),
    enabled: !!collectionId,
    refetchInterval: 5000,
    ...options,
  });
};

export const useCollectionRun = (collectionId: string, runId: string, options?: Omit<UseQueryOptions<CollectionRunRecord, ApiException>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: QUERY_KEYS.collectionRun(collectionId, runId),
    queryFn: () => api.getCollectionRun(collectionId, runId),
    enabled: !!collectionId && !!runId,
    refetchInterval: 5000,
    ...options,
  });
};

export const useCancelCollectionRun = (
  options?: UseMutationOptions<{ success: boolean; run: CollectionRunRecord }, ApiException, string>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: api.cancelCollectionRun,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.runs });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.runSummary });
      if (data?.run?.collectionId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.collectionRuns(data.run.collectionId),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.collectionRun(data.run.collectionId, data.run.id),
        });
      }
      options?.onSuccess?.(data, variables, context);
    },
  });
};
