import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Block, CreateBlockInput } from "@/lib/schemas";
import { assertNoOverlap, col, createDoc, ensureUser, OverlapError } from "@/lib/firestore";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireAuth(req);
    const body = await req.json();
    const input = CreateBlockInput.parse(body);

    await assertNoOverlap(uid, input.planId, input.start, input.end);
    const blockData: Block = ensureUser(uid, {
      ...input,
      lockedLength: input.lockedLength ?? true,
      movable: input.movable ?? true,
    } as Block);
    const created = await createDoc(col.blocks, Block, blockData);
    return NextResponse.json({ block: created }, { status: 201 });
  } catch (e: unknown) {
    const isOverlap = e instanceof OverlapError;
    const err = e as { status?: number; message?: string };
    const status = isOverlap ? 409 : err?.status || 500;
    const message = isOverlap ? "Block overlaps existing block" : err?.message || "Unknown error";
    return NextResponse.json({ error: message }, { status });
  }
}
