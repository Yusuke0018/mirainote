import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { CreatePlanInput, Plan, Intermission } from "@/lib/schemas";
import {
  col,
  createDoc,
  getPlanByDate,
  listPlanBlocks,
  listPlanIntermissions,
  listPlanTasks,
  ensureUser,
} from "@/lib/firestore";
import { todayYmd, ymdToDayStartEndMs, ms } from "@/lib/time";

export async function GET(req: NextRequest) {
  try {
    const { uid } = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || todayYmd();
    const plan = await getPlanByDate(uid, date);
    if (!plan)
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    const [tasks, blocks, intermissions] = await Promise.all([
      listPlanTasks(uid, plan.id),
      listPlanBlocks(uid, plan.id),
      listPlanIntermissions(uid, plan.id),
    ]);
    return NextResponse.json({ plan, tasks, blocks, intermissions });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireAuth(req);
    const body = await req.json();
    const input = CreatePlanInput.parse(body ?? {});
    const date = input.date || todayYmd();
    const existing = await getPlanByDate(uid, date);
    if (existing) {
      // idempotent: return existing with aggregates
      const [tasks, blocks, intermissions] = await Promise.all([
        listPlanTasks(uid, existing.id),
        listPlanBlocks(uid, existing.id),
        listPlanIntermissions(uid, existing.id),
      ]);
      return NextResponse.json(
        { plan: existing, tasks, blocks, intermissions },
        { status: 200 },
      );
    }
    const planData: Plan = ensureUser(uid, {
      date,
      timezone: "Asia/Tokyo",
    } as Plan);
    const plan = await createDoc(col.plans, Plan, planData);

    // initial intermission: 06:00-23:00 local time
    const { startMs } = ymdToDayStartEndMs(date);
    const interStart = startMs + ms(6 * 60);
    const interEnd = startMs + ms(23 * 60);
    await createDoc(col.intermissions, Intermission, {
      userId: uid,
      planId: plan.id,
      start: interStart,
      end: interEnd,
    });

    const [tasks, blocks, intermissions] = await Promise.all([
      listPlanTasks(uid, plan.id),
      listPlanBlocks(uid, plan.id),
      listPlanIntermissions(uid, plan.id),
    ]);
    return NextResponse.json(
      { plan, tasks, blocks, intermissions },
      { status: 201 },
    );
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status });
  }
}
