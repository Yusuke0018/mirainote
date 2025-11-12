import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { CreateTaskInput, Task } from "@/lib/schemas";
import { col, createDoc, listPlanTasks, ensureUser } from "@/lib/firestore";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireAuth(req);
    const body = await req.json();
    const input = CreateTaskInput.parse(body);

    // auto order if not provided
    const current = await listPlanTasks(uid, input.planId);
    const order =
      input.order ??
      (current.length ? Math.max(...current.map((t) => t.order)) + 1 : 0);
    const taskData: Task = ensureUser(uid, {
      ...input,
      order,
      state: "todo",
    } as Task);
    const created = await createDoc(col.tasks, Task, taskData);
    return NextResponse.json({ task: created }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status });
  }
}
