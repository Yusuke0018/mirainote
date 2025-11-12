import { getDb } from "./firebaseAdmin";
import { Block, Intermission, Plan, Task } from "./schemas";
import { z } from "zod";

const db = getDb();

export const col = {
  plans: db.collection("plans"),
  tasks: db.collection("tasks"),
  blocks: db.collection("blocks"),
  intermissions: db.collection("intermissions"),
  checkins: db.collection("checkins"),
  goals: db.collection("goals"),
};

export type WithId<T> = T & { id: string };

type DocData = FirebaseFirestore.DocumentData;

export class OverlapError extends Error {
  code = "OVERLAP" as const;
}

export function withTimestamps<
  T extends { createdAt?: number; updatedAt?: number },
>(data: T, isCreate = true): T {
  const now = Date.now();
  return {
    ...data,
    createdAt: isCreate ? now : (data.createdAt ?? now),
    updatedAt: now,
  };
}

export function ensureUser<T extends { userId: string }>(
  uid: string,
  data: T,
): T {
  return { ...data, userId: uid };
}

export async function createDoc<
  T extends { createdAt?: number; updatedAt?: number },
>(
  collection: FirebaseFirestore.CollectionReference,
  schema: z.ZodSchema<T>,
  data: T,
) {
  const parsed = schema.parse(data);
  const toSave = withTimestamps(parsed, true);
  const ref = await collection.add(toSave as DocData);
  return { id: ref.id, ...toSave } as WithId<T>;
}

export async function updateDoc<
  T extends { createdAt?: number; updatedAt?: number },
>(
  collection: FirebaseFirestore.CollectionReference,
  id: string,
  schema: z.ZodSchema<T>,
  patch: Partial<T>,
) {
  const ref = collection.doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const current = snap.data() as T;
  const merged = { ...current, ...patch };
  const parsed = schema.parse(merged);
  const toSave = withTimestamps(parsed, false);
  await ref.set(toSave as DocData);
  return { id, ...toSave } as WithId<T>;
}

export async function getById<T>(
  collection: FirebaseFirestore.CollectionReference,
  id: string,
) {
  const ref = collection.doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as T;
  return { id: snap.id, ...data } as WithId<T>;
}

export async function getPlanByDate(userId: string, date: string) {
  const q = await col.plans
    .where("userId", "==", userId)
    .where("date", "==", date)
    .limit(1)
    .get();
  if (q.empty) return null;
  const d = q.docs[0];
  const data = d.data() as Plan;
  return { id: d.id, ...data } as WithId<Plan>;
}

export async function listPlanTasks(userId: string, planId: string) {
  const q = await col.tasks
    .where("userId", "==", userId)
    .where("planId", "==", planId)
    .orderBy("order", "asc")
    .get();
  return q.docs.map((d) => ({ id: d.id, ...(d.data() as Task) }));
}

export async function listPlanBlocks(userId: string, planId: string) {
  const q = await col.blocks
    .where("userId", "==", userId)
    .where("planId", "==", planId)
    .orderBy("start", "asc")
    .get();
  return q.docs.map((d) => ({ id: d.id, ...(d.data() as Block) }));
}

export async function listPlanIntermissions(userId: string, planId: string) {
  const q = await col.intermissions
    .where("userId", "==", userId)
    .where("planId", "==", planId)
    .orderBy("start", "asc")
    .get();
  return q.docs.map((d) => ({ id: d.id, ...(d.data() as Intermission) }));
}

export function overlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

export async function assertNoOverlap(
  userId: string,
  planId: string,
  start: number,
  end: number,
  excludeId?: string,
) {
  const blocks = await listPlanBlocks(userId, planId);
  const conflict = blocks.find(
    (b) => b.id !== excludeId && overlap(start, end, b.start, b.end),
  );
  if (conflict) throw new OverlapError(`Block overlaps with ${conflict.id}`);
}
