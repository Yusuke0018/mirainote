"use client";

import React from "react";
import { DateTime } from "luxon";

interface Block {
  id: string;
  title?: string;
  start: number;
  end: number;
  taskId?: string;
}

interface Intermission {
  id: string;
  start: number;
  end: number;
}

interface TimelineProps {
  blocks: Block[];
  intermissions: Intermission[];
  onBlockShift?: (id: string, deltaMs: number) => void;
  onBlockDelete?: (id: string) => void;
  onBlockMoveTo?: (id: string, start: number, end: number) => void;
  planDate: string;
  tasks?: { id: string; title: string }[];
  onBlockAdd?: (start: number, end: number, title?: string) => void;
}

export default function Timeline({
  blocks,
  intermissions,
  onBlockShift,
  onBlockDelete,
  onBlockMoveTo,
  planDate,
  tasks = [],
  onBlockAdd,
}: TimelineProps) {
  const formatTime = (timestamp: number) => {
    return DateTime.fromMillis(timestamp).toFormat("HH:mm");
  };

  const getDuration = (start: number, end: number) => {
    const minutes = Math.max(1, Math.floor((end - start) / 1000 / 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0
      ? `${hours}時間${remainingMinutes}分`
      : `${remainingMinutes}分`;
  };

  // 0:00〜24:00 まで 24 本のグリッドを表示
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const ROW_PX = 48; // h-12 ≒ 48px
  const totalMinutes = hours.length * 60;
  const parsedPlanDate = DateTime.fromISO(planDate);
  const dayStart = parsedPlanDate.isValid
    ? parsedPlanDate.startOf("day")
    : DateTime.now().startOf("day");

  const taskMap = React.useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((task) => map.set(task.id, task.title));
    return map;
  }, [tasks]);

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-md border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-ink via-charcoal to-pastel-blue"></div>
        <h2 className="text-2xl font-bold text-ink tracking-tight">タイムライン</h2>
        <div className="ml-auto px-3 py-1 rounded-full bg-charcoal text-white text-sm font-semibold shadow-sm">
          {blocks.length} ブロック
        </div>
      </div>

      {/* タイムライン表示 */}
      <div
        className="relative max-h-[1152px] overflow-y-auto touch-pan-y"
        onDragOver={(e) => {
          if (!onBlockMoveTo) return;
          e.preventDefault();
        }}
        onDrop={(e) => {
          if (!onBlockMoveTo) return;
          const data = e.dataTransfer?.getData("text/plain");
          if (!data) return;
          try {
            const { id, duration } = JSON.parse(data) as {
              id: string;
              duration: number;
            };
            const timeline = e.currentTarget as HTMLDivElement;
            const rect = timeline.getBoundingClientRect();
            const y = e.clientY - rect.top + timeline.scrollTop;
            const minutesFromStart = Math.max(
              0,
              Math.min(Math.round((y / ROW_PX) * 60), totalMinutes - 1),
            );
            const start = dayStart.plus({ minutes: minutesFromStart }).toMillis();
            onBlockMoveTo(id, start, start + duration);
          } catch {}
        }}
      >
        {/* 時刻軸 */}
        <div className="flex flex-col gap-2 mb-4">
          {hours.map((hour) => (
            <div key={hour} className="flex items-center gap-3 h-12">
              <div className="w-12 text-sm font-medium text-gray-500 text-right">
                {hour.toString().padStart(2, "0")}:00
              </div>
              <div className="flex-1 border-t border-dashed border-gray-200"></div>
            </div>
          ))}
        </div>

        {/* ブロック表示エリア */}
        <div className="space-y-3 pb-4">
          {blocks.length === 0 && intermissions.length === 0 ? (
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
              <p className="text-lg font-medium">ブロックがありません</p>
              <p className="text-sm mt-1">
                タスクリストに追加するとここにタイムラインが生成されます
              </p>
            </div>
          ) : (
            <>
              {/* Intermissions */}
              {intermissions.map((intermission) => (
                <div
                  key={intermission.id}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-300 bg-pastel-mist/60"
                >
                  <div className="flex-shrink-0 w-2 h-12 rounded-full bg-gray-400"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">
                      休憩時間
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(intermission.start)} -{" "}
                      {formatTime(intermission.end)} (
                      {getDuration(intermission.start, intermission.end)})
                    </p>
                  </div>
                </div>
              ))}

              {/* Blocks */}
              {blocks.map((block, index) => {
                const colors = [
                  "bg-ink/10 border-ink",
                  "bg-charcoal/10 border-charcoal",
                  "bg-pastel-blue/30 border-pastel-blue",
                  "bg-pastel-pink/30 border-pastel-pink",
                  "bg-pastel-lavender/30 border-pastel-lavender",
                  "bg-pastel-peach/30 border-pastel-peach",
                ];
                const colorClass = colors[index % colors.length];
                const duration = block.end - block.start;
                const linkedTitle =
                  (block.taskId && taskMap.get(block.taskId)) || block.title;

                return (
                  <div
                    key={block.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 ${colorClass} hover:scale-[1.02] transition-all duration-200 cursor-move`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({ id: block.id, duration }),
                      );
                      e.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <div
                      className={`flex-shrink-0 w-2 h-12 rounded-full ${colorClass
                        .split(" ")[1]
                        .replace("border-", "bg-")}`}
                    ></div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {linkedTitle || "無題のブロック"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(block.start)} - {formatTime(block.end)} (
                        {getDuration(block.start, block.end)})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {onBlockShift && (
                        <>
                          <button
                            title="-1分"
                            onClick={() => onBlockShift(block.id, -60 * 1000)}
                            className="px-2 py-1 rounded border border-border text-sm hover:bg-white"
                          >
                            -1m
                          </button>
                          <button
                            title="+1分"
                            onClick={() => onBlockShift(block.id, 60 * 1000)}
                            className="px-2 py-1 rounded border border-border text-sm hover:bg-white"
                          >
                            +1m
                          </button>
                        </>
                      )}
                      {onBlockDelete && (
                        <button
                          title="削除"
                          onClick={() => onBlockDelete(block.id)}
                          className="px-2 py-1 rounded bg-error/10 hover:bg-error/20 text-error text-sm"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
      {onBlockAdd && (
        <button
          onClick={() => {
            const defaultStart = dayStart.toMillis();
            const defaultEnd = defaultStart + 60 * 60 * 1000;
            onBlockAdd(defaultStart, defaultEnd, "新しいブロック");
          }}
          className="mt-4 w-full py-4 rounded-xl border-2 border-dashed border-ink hover:bg-gray-50 text-ink font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          ブロックを追加
        </button>
      )}
    </div>
  );
}
