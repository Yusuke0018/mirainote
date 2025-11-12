import { DateTime } from "luxon";

export const DEFAULT_TZ = process.env.APP_TIMEZONE || "Asia/Tokyo";

export function todayYmd(tz = DEFAULT_TZ) {
  return DateTime.now().setZone(tz).toFormat("yyyy-LL-dd");
}

export function ymdToDayStartEndMs(ymd: string, tz = DEFAULT_TZ) {
  const start = DateTime.fromFormat(ymd, "yyyy-LL-dd", { zone: tz }).startOf(
    "day",
  );
  const end = start.endOf("day");
  return { startMs: start.toMillis(), endMs: end.toMillis() };
}

export function isoMs(ms: number) {
  return DateTime.fromMillis(ms).toISO();
}

export function ms(durationMinutes: number) {
  return durationMinutes * 60 * 1000;
}
