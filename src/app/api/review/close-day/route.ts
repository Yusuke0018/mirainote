import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  col,
  listPlanTasks,
  createDoc,
  getPlanByDate,
  ensureUser,
} from "@/lib/firestore";
import { Checkin, Plan, Task } from "@/lib/schemas";
import { todayYmd } from "@/lib/time";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const date = (body?.date as string) || todayYmd();

    // find today plan
    const plan = await getPlanByDate(uid, date);
    if (!plan)
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    // compute KPIs (simple MVP): adherenceRate = done tasks / total, carry over undone tasks
    const tasks = await listPlanTasks(uid, plan.id);
    const total = tasks.length;
    const done = tasks.filter((t) => t.state === "done").length;
    const adherenceRate = total ? done / total : 0;
    const undone = tasks.filter((t) => t.state !== "done");

    // ensure tomorrow draft plan
    const [y, m, d] = date.split("-").map((n) => parseInt(n, 10));
    const nextDate = new Date(Date.UTC(y, m - 1, d));
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const nextStr = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDate.getUTCDate()).padStart(2, "0")}`;
    let nextPlan = await getPlanByDate(uid, nextStr);
    if (!nextPlan) {
      const created = await createDoc(
        col.plans,
        Plan,
        ensureUser(uid, { date: nextStr, timezone: "Asia/Tokyo" } as Plan),
      );
      nextPlan = created as unknown as typeof nextPlan;
    }

    // carry over undone tasks
    if (undone.length) {
      const currentNextTasks = await listPlanTasks(uid, nextPlan!.id);
      let orderBase = currentNextTasks.length
        ? Math.max(...currentNextTasks.map((t) => t.order)) + 1
        : 0;
      for (const t of undone) {
        const data: Task = ensureUser(uid, {
          planId: nextPlan!.id,
          title: t.title,
          estimateMinutes: t.estimateMinutes,
          order: orderBase++,
          state: "todo",
          goalId: (t as unknown as { goalId?: string }).goalId,
        } as Task);
        await createDoc(col.tasks, Task, data);
      }
    }

    // write checkin
    const checkin = await createDoc(col.checkins, Checkin, {
      userId: uid,
      planId: plan.id,
      adherenceRate,
      carryOverCount: undone.length,
      checked: true,
    } as Checkin);

    return NextResponse.json({ ok: true, checkin, nextPlanId: nextPlan!.id });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    const status = err?.status || 500;
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status },
    );
  }
}
