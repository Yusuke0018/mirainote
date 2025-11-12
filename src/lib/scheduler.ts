import { Block, Intermission } from "@/lib/schemas";

export type Interval = { start: number; end: number };
export type FixedBlock = Interval & { id: string };

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
    if (cur.end >= n.start) {
      cur.end = Math.max(cur.end, n.end);
    } else {
      merged.push(cur);
      cur = { ...n };
    }
  }
  merged.push(cur);
  return merged;
}

function subtractIntervals(window: Interval, occupied: Interval[]): Interval[] {
  // return list of free sub-intervals within window not overlapped by occupied
  const mergedOcc = mergeIntervals(
    occupied
      .filter((o) => overlaps(window, o))
      .map((o) => ({
        start: Math.max(o.start, window.start),
        end: Math.min(o.end, window.end),
      })),
  );
  if (!mergedOcc.length) return [window];
  const free: Interval[] = [];
  let cursor = window.start;
  for (const occ of mergedOcc) {
    if (cursor < occ.start) free.push({ start: cursor, end: occ.start });
    cursor = Math.max(cursor, occ.end);
  }
  if (cursor < window.end) free.push({ start: cursor, end: window.end });
  return free;
}

export type MoveResult = {
  moved: { id: string; from: Interval; to: Interval }[];
  unplaced: { id: string; duration: number }[];
  candidates: {
    label: "today_end" | "tomorrow_morning" | "tomorrow_evening";
    start: number;
    end: number;
  }[];
};

export function planInterrupt(
  allBlocks: (Block & { id: string })[],
  intermissions: (Intermission & { id: string })[],
  params: { start: number; end?: number; duration?: number },
  dayEndMs: number,
  tomorrowStartMs: number,
  tomorrowEveningMs: number,
): MoveResult {
  const duration = params.duration ?? params.end! - params.start;
  const cursorStart = params.start + duration;

  // movable targets: blocks whose end is after interrupt start and are movable+locked
  const movable = allBlocks
    .filter((b) => b.movable && b.lockedLength && b.end > params.start)
    .sort((a, b) => a.start - b.start);

  // fixed blocks are the remainder (including non-movable and those ending before interrupt)
  const movableIds = new Set(movable.map((m) => m.id));
  const fixed: FixedBlock[] = allBlocks
    .filter((b) => !movableIds.has(b.id))
    .map((b) => ({ id: b.id, start: b.start, end: b.end }));

  // allowed windows are intermissions
  const windows = intermissions
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((i) => ({ start: i.start, end: i.end }));

  const occupied: Interval[] = fixed.map((f) => ({
    start: f.start,
    end: f.end,
  }));
  const moved: MoveResult["moved"] = [];
  const unplaced: MoveResult["unplaced"] = [];

  for (const b of movable) {
    const d = b.end - b.start;
    let placed: Interval | null = null;

    // iterate windows from the one that contains/after cursorStart
    for (const w of windows) {
      const startCursor = Math.max(cursorStart, w.start);
      // free slices in this window considering occupied intervals
      const freeSlices = subtractIntervals(
        { start: startCursor, end: w.end },
        occupied,
      );
      for (const slice of freeSlices) {
        if (slice.end - slice.start >= d) {
          placed = { start: slice.start, end: slice.start + d };
          break;
        }
      }
      if (placed) break;
    }

    if (placed) {
      moved.push({
        id: b.id,
        from: { start: b.start, end: b.end },
        to: placed,
      });
      occupied.push(placed);
    } else {
      unplaced.push({ id: b.id, duration: d });
    }
  }

  const candidates: MoveResult["candidates"] = [];
  if (unplaced.length) {
    const totalDur = unplaced.reduce((acc, u) => acc + u.duration, 0);
    candidates.push(
      { label: "today_end", start: dayEndMs, end: dayEndMs + totalDur },
      {
        label: "tomorrow_morning",
        start: tomorrowStartMs,
        end: tomorrowStartMs + totalDur,
      },
      {
        label: "tomorrow_evening",
        start: tomorrowEveningMs,
        end: tomorrowEveningMs + totalDur,
      },
    );
  }

  return { moved, unplaced, candidates };
}
