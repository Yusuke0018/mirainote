import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Category, UpdateCategoryInput } from "@/lib/schemas";
import { col, getById, updateDoc } from "@/lib/firestore";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { uid } = await requireAuth(req);
    const { id } = await ctx.params;
    const current = await getById<Category>(col.categories, id);
    if (!current || current.userId !== uid)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();
    const patch = UpdateCategoryInput.parse(body);
    const updated = await updateDoc(col.categories, id, Category, {
      ...current,
      ...patch,
    });
    return NextResponse.json({ category: updated });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: err?.status || 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { uid } = await requireAuth(req);
    const { id } = await ctx.params;
    const current = await getById<Category>(col.categories, id);
    if (!current || current.userId !== uid)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    await col.categories.doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: err?.status || 500 },
    );
  }
}
