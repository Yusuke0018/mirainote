import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { col, createDoc, ensureUser } from "@/lib/firestore";
import { CreateGoalInput, Goal } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const { uid } = await requireAuth(req);
    const q = await col.goals.where("userId", "==", uid).get();
    const goals = q.docs
      .map((d) => ({
        id: d.id,
        ...(d.data() as Goal),
      }))
      .sort((a, b) => {
        const orderA =
          typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
        const orderB =
          typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        const createdA = typeof a.createdAt === "number" ? a.createdAt : 0;
        const createdB = typeof b.createdAt === "number" ? b.createdAt : 0;
        return createdB - createdA;
      });
    return NextResponse.json({ goals });
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
    const input = CreateGoalInput.parse(body);
    const orderValue =
      typeof input.order === "number" ? input.order : Date.now();
    const created = await createDoc(
      col.goals,
      Goal,
      ensureUser(
        uid,
        {
          ...input,
          order: orderValue,
        } as Goal,
      ),
    );
    return NextResponse.json({ goal: created }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: err?.status || 500 },
    );
  }
}
