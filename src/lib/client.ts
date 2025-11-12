import {
  CreateBlockInput,
  CreateTaskInput,
  UpdateBlockInput,
  UpdateTaskInput,
  Plan as PlanT,
  Task as TaskT,
  Block as BlockT,
  Intermission as IntermissionT,
  Checkin as CheckinT,
  Goal as GoalT,
  CreateGoalInput,
  UpdateGoalInput,
  Category as CategoryT,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/schemas";

type WithId<T> = T & { id: string };

export type PlanBundle = {
  plan: WithId<PlanT>;
  tasks: WithId<TaskT>[];
  blocks: WithId<BlockT>[];
  intermissions: WithId<IntermissionT>[];
};

import { getIdToken } from "@/lib/firebaseClient";

async function getAuthHeaders(): Promise<HeadersInit> {
  // ブラウザでFirebase AuthのIDトークンがあれば優先して付与
  try {
    const idToken = await getIdToken();
    if (idToken) return { Authorization: `Bearer ${idToken}` };
  } catch {}
  // 開発中は x-debug-user を優先（.envでAUTH_DEBUG_ENABLED=1時に機能）
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEBUG_UID) {
    return { "x-debug-user": process.env.NEXT_PUBLIC_DEBUG_UID };
  }
  return {};
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...authHeaders,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err?.error || `HTTP ${res.status}`), {
      status: res.status,
    });
  }
  return res.json() as Promise<T>;
}

// Plans
export async function getPlan(date: string): Promise<PlanBundle> {
  return api(`/api/plans?date=${encodeURIComponent(date)}`);
}
export async function ensurePlan(date?: string): Promise<PlanBundle> {
  return api("/api/plans", { method: "POST", body: JSON.stringify({ date }) });
}

// Tasks
export async function createTask(input: CreateTaskInput) {
  return api<{ task: WithId<TaskT> }>(`/api/tasks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export async function updateTask(id: string, patch: UpdateTaskInput) {
  return api<{ task: WithId<TaskT> }>(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
export async function deleteTask(id: string) {
  return api<{ ok: true }>(`/api/tasks/${id}`, { method: "DELETE" });
}

// Blocks
export async function createBlock(input: CreateBlockInput) {
  return api<{ block: WithId<BlockT> }>(`/api/blocks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export async function updateBlock(id: string, patch: UpdateBlockInput) {
  return api<{ block: WithId<BlockT> }>(`/api/blocks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
export async function deleteBlock(id: string) {
  return api<{ ok: true }>(`/api/blocks/${id}`, { method: "DELETE" });
}

// Scheduler
export async function interruptSchedule(input: {
  planId: string;
  start: number;
  duration?: number;
  end?: number;
}) {
  return api<{
    ok: true;
    moved: Array<{
      id: string;
      from: { start: number; end: number };
      to: { start: number; end: number };
    }>;
    unplaced: Array<{ id: string; duration: number }>;
    candidates: Array<{ label: string; start: number; end: number }>;
  }>(`/api/scheduler/interrupt`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Review
export async function closeDay(input?: { date?: string }) {
  return api<{ ok: true; checkin: WithId<CheckinT>; nextPlanId: string }>(
    `/api/review/close-day`,
    { method: "POST", body: JSON.stringify(input ?? {}) },
  );
}

// Scheduler adopt
export async function adoptCandidates(input: {
  planId: string;
  label: "today_end" | "tomorrow_morning" | "tomorrow_evening";
}) {
  return api<{
    ok: true;
    adopted: Array<{
      id: string;
      from: { start: number; end: number };
      to: { start: number; end: number };
    }>;
    targetPlanId: string;
  }>(`/api/scheduler/adopt`, { method: "POST", body: JSON.stringify(input) });
}

// Goals
export async function listGoals() {
  return api<{ goals: Array<WithId<GoalT>> }>(`/api/goals`);
}
export async function createGoal(input: CreateGoalInput) {
  return api<{ goal: WithId<GoalT> }>(`/api/goals`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export async function updateGoal(
  id: string,
  patch: {
    title?: string;
    period?: "year" | "quarter" | "month" | "custom";
    startDate?: string;
    endDate?: string;
    color?: string;
  },
) {
  return api<{ goal: WithId<GoalT> }>(`/api/goals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
export async function deleteGoal(id: string) {
  return api<{ ok: true }>(`/api/goals/${id}`, { method: "DELETE" });
}

// Categories
export async function listCategories() {
  return api<{ categories: Array<WithId<CategoryT>> }>(`/api/categories`);
}
export async function createCategory(input: CreateCategoryInput) {
  return api<{ category: WithId<CategoryT> }>(`/api/categories`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export async function updateCategory(id: string, patch: UpdateCategoryInput) {
  return api<{ category: WithId<CategoryT> }>(`/api/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
export async function deleteCategory(id: string) {
  return api<{ ok: true }>(`/api/categories/${id}`, { method: "DELETE" });
}
