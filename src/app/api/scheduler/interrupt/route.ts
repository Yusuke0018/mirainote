import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { col, listPlanBlocks, listPlanIntermissions } from "@/lib/firestore";
import { Id } from "@/lib/schemas";
import { z } from "zod";
import { planInterrupt } from "@/lib/scheduler";
import { getDb } from "@/lib/firebaseAdmin";
import { ymdToDayStartEndMs } from "@/lib/time";

const InterruptInput = z.object({
  planId: Id,
  start: z.number().int().min(0),
  duration: z.number().int().min(1).optional(),
  end: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireAuth(req);
    const body = await req.json();
    const input = InterruptInput.parse(body);

    // Load plan to get date boundaries
    const planRef = col.plans.doc(input.planId);
    const planSnap = await planRef.get();
    if (!planSnap.exists)
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    const plan = planSnap.data() as {
      userId: string;
      date: string;
      timezone?: string;
    };
    if (plan.userId !== uid)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { endMs } = ymdToDayStartEndMs(
      plan.date,
      plan.timezone || "Asia/Tokyo",
    );

    const [blocks, intermissions] = await Promise.all([
      listPlanBlocks(uid, input.planId),
      listPlanIntermissions(uid, input.planId),
    ]);

    const result = planInterrupt(
      blocks,
      intermissions,
      { start: input.start, end: input.end, duration: input.duration },
      endMs,
      // Tomorrow morning (06:00), evening (20:00) as candidates
      endMs + 6 * 60 * 60 * 1000,
      endMs + 20 * 60 * 60 * 1000,
    );

    // Persist moved blocks via transaction
    const db = getDb();
    await db.runTransaction(async (tx) => {
      for (const m of result.moved) {
        tx.update(col.blocks.doc(m.id), {
          start: m.to.start,
          end: m.to.end,
          updatedAt: Date.now(),
        });
      }
    });

    return NextResponse.json({
      ok: true,
      moved: result.moved,
      unplaced: result.unplaced,
      candidates: result.candidates,
    });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    const status = err?.status || 500;
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status },
    );
  }
}
