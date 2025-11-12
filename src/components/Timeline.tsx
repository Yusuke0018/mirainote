"use client";

import { DateTime } from "luxon";

type TimelineTask = {
  id: string;
  title: string;
  estimateMinutes?: number;
  state: "todo" | "doing" | "done";
  order?: number;
};

interface TimelineProps {
  tasks: TimelineTask[];
  planDate: string;
}

export default function Timeline({ tasks, planDate }: TimelineProps) {
  const parsedPlanDate = DateTime.fromISO(planDate);
  const base = (parsedPlanDate.isValid
    ? parsedPlanDate.startOf("day")
    : DateTime.now().startOf("day")
  ).plus({ hours: 6 });

  const sorted = tasks.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const segments: Array<{
    task: TimelineTask;
    start: DateTime;
    end: DateTime;
    minutes: number;
    visualMinutes: number;
  }> = [];
  let cursor = base;
  for (const task of sorted) {
    const minutes = Math.max(0, task.estimateMinutes ?? 0);
    const visualMinutes = minutes || 30; // 未入力時は仮30分で並べる
    const start = cursor;
    const end = cursor.plus({ minutes: visualMinutes });
    cursor = end;
    segments.push({ task, start, end, minutes, visualMinutes });
  }

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-md border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-ink via-charcoal to-pastel-blue"></div>
        <h2 className="text-2xl font-bold text-ink tracking-tight">
          タイムライン
        </h2>
        <div className="ml-auto px-3 py-1 rounded-full bg-charcoal text-white text-sm font-semibold shadow-sm">
          {sorted.length} タスク
        </div>
      </div>

      {segments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-pastel-lavender"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-lg font-medium">まだタスクがありません</p>
          <p className="text-sm mt-1">
            明日の自分との約束を追加すると時間枠が並びます
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {segments.map((segment, index) => {
            const isDone = segment.task.state === "done";
            return (
              <div
                key={segment.task.id}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-gray-50/60"
              >
                <div className="flex flex-col items-center text-xs text-gray-500 w-16">
                  <span>{segment.start.toFormat("HH:mm")}</span>
                  <span className="text-gray-400">↓</span>
                  <span>{segment.end.toFormat("HH:mm")}</span>
                </div>
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      isDone ? "line-through text-gray-400" : "text-ink"
                    }`}
                  >
                    {index + 1}. {segment.task.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {segment.minutes
                      ? `${segment.minutes}分`
                      : "時間未設定（仮30分で配置）"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
