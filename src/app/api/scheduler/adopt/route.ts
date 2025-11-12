import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  col,
  listPlanBlocks,
  listPlanIntermissions,
  getPlanByDate,
} from "@/lib/firestore";
import { Id } from "@/lib/schemas";
import { z } from "zod";
import { getDb } from "@/lib/firebaseAdmin";
import { ymdToDayStartEndMs } from "@/lib/time";

const AdoptInput = z.object({
  planId: Id,
  label: z.enum(["today_end", "tomorrow_morning", "tomorrow_evening"]),
});

type Interval = { start: number; end: number };

function overlaps(a: Interval, b: Interval) {
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  let cur = { ...sorted[0] };
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (cur.end >= n.start) cur.end = Math.max(cur.end, n.end);
    else {
      merged.push(cur);
      cur = { ...n };
    }
  }
  merged.push(cur);
  return merged;
}

function subtract(window: Interval, occupied: Interval[]): Interval[] {
  const occ = mergeIntervals(
    occupied
      .filter((o) => overlaps(window, o))
      .map((o) => ({
        start: Math.max(o.start, window.start),
        end: Math.min(o.end, window.end),
      })),
  );
  if (!occ.length) return [window];
  const free: Interval[] = [];
  let cur = window.start;
  for (const o of occ) {
    if (cur < o.start) free.push({ start: cur, end: o.start });
    cur = Math.max(cur, o.end);
  }
  if (cur < window.end) free.push({ start: cur, end: window.end });
  return free;
}

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireAuth(req);
    const body = await req.json();
    const input = AdoptInput.parse(body);

    const planSnap = await col.plans.doc(input.planId).get();
    if (!planSnap.exists)
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    const plan = planSnap.data() as {
      userId: string;
      date: string;
      timezone?: string;
    };
    if (plan.userId !== uid)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const tz = plan.timezone || "Asia/Tokyo";
    const { endMs } = ymdToDayStartEndMs(plan.date, tz);

    const [todayBlocks, todayIntermissions] = await Promise.all([
      listPlanBlocks(uid, input.planId),
      listPlanIntermissions(uid, input.planId),
    ]);

    // Determine unplaced: movable blocks after now that we will relocate
    const now = Date.now();
    const movable = todayBlocks.filter((b) => b.movable && b.end > now);
    // heuristic: treat those overlapping after now as remaining to place
    const unplaced = movable;

    let targetPlanId = input.planId;
    let startSeed = endMs;
    let targetBlocks = todayBlocks;
    let targetIntermissions = todayIntermissions;

    if (
      input.label === "tomorrow_morning" ||
      input.label === "tomorrow_evening"
    ) {
      const [y, m, d] = plan.date.split("-").map((n) => parseInt(n, 10));
      const nd = new Date(Date.UTC(y, m - 1, d));
      nd.setUTCDate(nd.getUTCDate() + 1);
      const nextStr = `${nd.getUTCFullYear()}-${String(nd.getUTCMonth() + 1).padStart(2, "0")}-${String(nd.getUTCDate()).padStart(2, "0")}`;
      // next day's plan document (loose typing for creation path)
      const nextPlanRaw = (await getPlanByDate(uid, nextStr)) as unknown;
      let nextPlan: { id: string } | null = nextPlanRaw
        ? { id: (nextPlanRaw as { id: string }).id }
        : null;
      if (!nextPlan) {
        const created = await col.plans.add({
          userId: uid,
          date: nextStr,
          timezone: tz,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        const doc = await created.get();
        nextPlan = { id: doc.id };
        // init intermission 06-23
        const { startMs } = ymdToDayStartEndMs(nextStr, tz);
        await col.intermissions.add({
          userId: uid,
          planId: nextPlan.id,
          start: startMs + 6 * 60 * 60 * 1000,
          end: startMs + 23 * 60 * 60 * 1000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      targetPlanId = nextPlan!.id;
      const [b2, i2] = await Promise.all([
        listPlanBlocks(uid, nextPlan!.id),
        listPlanIntermissions(uid, nextPlan!.id),
      ]);
      targetBlocks = b2;
      targetIntermissions = i2;
      const { startMs: nextStart, endMs: nextEnd } = ymdToDayStartEndMs(
        nextStr,
        tz,
      );
      startSeed =
        input.label === "tomorrow_morning"
          ? nextStart + 6 * 60 * 60 * 1000
          : nextStart + 20 * 60 * 60 * 1000;
    }

    // Build occupied intervals for target
    const occupied: Interval[] = targetBlocks.map((b) => ({
      start: b.start,
      end: b.end,
    }));
    const windows = targetIntermissions
      .slice()
      .sort((a, b) => a.start - b.start)
      .map((w) => ({ start: Math.max(w.start, startSeed), end: w.end }))
      .filter((w) => w.end > w.start);

    const placements: { id: string; from: Interval; to: Interval }[] = [];
    let cursor = startSeed;

    for (const b of unplaced) {
      const d = b.end - b.start;
      let placed: Interval | null = null;
      // try within windows first
      for (const w of windows) {
        const start = Math.max(cursor, w.start);
        const free = subtract({ start, end: w.end }, occupied);
        for (const f of free) {
          if (f.end - f.start >= d) {
            placed = { start: f.start, end: f.start + d };
            break;
          }
        }
        if (placed) break;
      }
      // fallback: append after last occupied
      if (!placed) {
        const lastEnd = occupied.reduce(
          (acc, o) => Math.max(acc, o.end),
          cursor,
        );
        placed = { start: lastEnd, end: lastEnd + d };
      }
      placements.push({
        id: b.id,
        from: { start: b.start, end: b.end },
        to: placed,
      });
      occupied.push(placed);
      cursor = placed.end;
    }

    const db = getDb();
    await db.runTransaction(async (tx) => {
      for (const m of placements) {
        const ref = col.blocks.doc(m.id);
        tx.update(ref, {
          planId: targetPlanId,
          start: m.to.start,
          end: m.to.end,
          updatedAt: Date.now(),
        });
      }
    });

    return NextResponse.json({ ok: true, adopted: placements, targetPlanId });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    const status = err?.status || 500;
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status },
    );
  }
}
