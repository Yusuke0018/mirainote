import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Block, UpdateBlockInput } from "@/lib/schemas";
import { assertNoOverlap, col, getById, updateDoc, OverlapError } from "@/lib/firestore";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { uid } = await requireAuth(req);
    const body = await req.json();
    const patch = UpdateBlockInput.parse(body);

    const current = await getById<Block>(col.blocks, params.id);
    if (!current || current.userId !== uid)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const nextStart = patch.start ?? current.start;
    const nextEnd = patch.end ?? current.end;
    await assertNoOverlap(uid, current.planId, nextStart, nextEnd, params.id);

    const updated = await updateDoc(col.blocks, params.id, Block, {
      ...current,
      ...patch,
    });
    return NextResponse.json({ block: updated });
  } catch (e: unknown) {
    const isOverlap = e instanceof OverlapError;
    const err = e as { status?: number; message?: string };
    const status = isOverlap ? 409 : err?.status || 500;
    const message = isOverlap ? "Block overlaps existing block" : err?.message || "Unknown error";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { uid } = await requireAuth(req);
    const current = await getById<Block>(col.blocks, params.id);
    if (!current || current.userId !== uid)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    await col.blocks.doc(params.id).delete();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status });
  }
}
