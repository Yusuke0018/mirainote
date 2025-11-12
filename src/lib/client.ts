import {
  CreateBlockInput,
  CreateTaskInput,
  UpdateBlockInput,
  UpdateTaskInput,
  Plan as PlanT,
  Task as TaskT,
  Block as BlockT,
  Intermission as IntermissionT,
} from "@/lib/schemas";

type WithId<T> = T & { id: string };

export type PlanBundle = {
  plan: WithId<PlanT>;
  tasks: WithId<TaskT>[];
  blocks: WithId<BlockT>[];
  intermissions: WithId<IntermissionT>[];
};

function getAuthHeaders(): HeadersInit {
  // 開発中は x-debug-user を優先（.envでAUTH_DEBUG_ENABLED=1時に機能）
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEBUG_UID) {
    return { "x-debug-user": process.env.NEXT_PUBLIC_DEBUG_UID };
  }
  // ブラウザ側でFirebase AuthからidTokenを取得し、呼び出し前に注入する想定
  return {};
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...getAuthHeaders(),
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
