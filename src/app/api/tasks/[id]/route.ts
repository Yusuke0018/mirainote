import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { UpdateTaskInput, Task } from "@/lib/schemas";
import { col, getById, updateDoc } from "@/lib/firestore";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { uid } = await requireAuth(req);
    const body = await req.json();
    const patch = UpdateTaskInput.parse(body);

    const current = await getById<Task>(col.tasks, params.id);
    if (!current || current.userId !== uid)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await updateDoc(col.tasks, params.id, Task, {
      ...current,
      ...patch,
    });
    return NextResponse.json({ task: updated });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { uid } = await requireAuth(req);
    const current = await getById<Task>(col.tasks, params.id);
    if (!current || current.userId !== uid)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    await col.tasks.doc(params.id).delete();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status });
  }
}
