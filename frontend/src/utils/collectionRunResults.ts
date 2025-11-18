import type {
  CollectionRunItem,
  CollectionRunRecord,
  RunState,
} from "../types";

export type ResultStatus =
  | "running"
  | "passed"
  | "failed"
  | "inconclusive"
  | "cancelled";

export interface ItemResult {
  status: ResultStatus;
  label: string;
  error?: string;
  run?: RunState;
}

export interface SuiteResult {
  status: ResultStatus;
  label: string;
}

type RunLookup = Map<string, RunState>;

export const getCollectionItemResult = (
  item: CollectionRunItem,
  runMap: RunLookup
): ItemResult => {
  const run = item.runId ? runMap.get(item.runId) : undefined;

  if (item.status === "cancelled" || run?.status === "cancelled") {
    return {
      status: "cancelled",
      label: "CANCELLED",
      error: run?.error ?? item.error,
      run,
    };
  }

  if (item.status === "failed" || run?.status === "failed") {
    return {
      status: "failed",
      label: "FAILED",
      error: run?.error ?? item.error,
      run,
    };
  }

  if (!run) {
    if (item.status === "running") {
      return { status: "running", label: "RUNNING" };
    }
    if (item.status === "completed") {
      return { status: "inconclusive", label: "INCONCLUSIVE" };
    }
    return {
      status: "inconclusive",
      label: "PENDING",
    };
  }

  if (run.status === "running") {
    return { status: "running", label: "RUNNING", run };
  }

  if (run.status === "completed" && run.report) {
    return {
      status: run.report.status,
      label: run.report.status.toUpperCase(),
      run,
    };
  }

  if (run.status === "completed") {
    return { status: "inconclusive", label: "INCONCLUSIVE", run };
  }

  return { status: "running", label: "RUNNING", run };
};

export const getCollectionRunResult = (
  record: CollectionRunRecord,
  runMap: RunLookup
): SuiteResult => {
  if (record.status === "running") {
    return { status: "running", label: "RUNNING" };
  }
  if (record.status === "cancelled") {
    return { status: "cancelled", label: "CANCELLED" };
  }

  let hasFailed = false;
  let hasInconclusive = false;

  for (const item of record.items) {
    const result = getCollectionItemResult(item, runMap);
    if (result.status === "failed") {
      hasFailed = true;
      break;
    }
    if (
      result.status === "inconclusive" ||
      result.status === "running" ||
      result.status === "cancelled"
    ) {
      hasInconclusive = true;
    }
  }

  if (hasFailed) {
    return { status: "failed", label: "FAILED" };
  }
  if (hasInconclusive) {
    return { status: "inconclusive", label: "INCONCLUSIVE" };
  }

  return { status: "passed", label: "PASSED" };
};

export const getCollectionRunError = (
  record: CollectionRunRecord,
  runMap: RunLookup
): string | undefined => {
  for (const item of record.items) {
    const run = item.runId ? runMap.get(item.runId) : undefined;
    if (run?.error) {
      return run.error;
    }
    if (item.error) {
      return item.error;
    }
  }
  return undefined;
};
