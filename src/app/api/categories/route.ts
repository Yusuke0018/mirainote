import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Category, CreateCategoryInput } from "@/lib/schemas";
import { col, createDoc, ensureUser } from "@/lib/firestore";

export async function GET(req: NextRequest) {
  try {
    const { uid } = await requireAuth(req);
    const q = await col.categories
      .where("userId", "==", uid)
      .orderBy("order", "asc")
      .orderBy("createdAt", "asc")
      .get();
    const categories = q.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Category),
    }));
    return NextResponse.json({ categories });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: err?.status || 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireAuth(req);
    const body = await req.json();
    const input = CreateCategoryInput.parse(body);
    const created = await createDoc(
      col.categories,
      Category,
      ensureUser(uid, input as Category),
    );
    return NextResponse.json({ category: created }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: err?.status || 500 },
    );
  }
}
