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
  const ROW_PX = 48; // 1時間あたりの高さ
  const PX_PER_MIN = ROW_PX / 60;
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
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-md border border-border p-4 sm:p-6 mobile-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-ink via-charcoal to-pastel-blue"></div>
        <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">タイムライン</h2>
        <div className="ml-auto px-3 py-1 rounded-full bg-charcoal text-white text-sm font-semibold shadow-sm">
          {blocks.length} ブロック
        </div>
      </div>

      {/* タイムライン表示 */}
      <div
        ref={scrollRef}
        className="relative max-h-[70vh] overflow-y-auto touch-pan-y"
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
            const track = trackRef.current;
            const scroller = scrollRef.current;
            if (!track || !scroller) return;
            const rect = track.getBoundingClientRect();
            const y = e.clientY - rect.top + scroller.scrollTop;
            const minutesFromStart = Math.max(
              0,
              Math.min(Math.round((y / ROW_PX) * 60), totalMinutes - 1),
            );
            const start = dayStart.plus({ minutes: minutesFromStart }).toMillis();
            onBlockMoveTo(id, start, start + duration);
          } catch {}
        }}
      >
        <div className="relative ml-14" style={{ height: ROW_PX * 24 }}>
          <div
            ref={trackRef}
            className="absolute inset-0 border-l border-gray-200"
          >
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0"
                style={{ top: hour * ROW_PX }}
              >
                <div className="absolute -left-14 w-12 text-sm font-medium text-gray-500 text-right pr-2">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                <div className="border-t border-dashed border-gray-200"></div>
              </div>
            ))}
            {blocks.map((block, index) => {
              const colorClasses = [
                "bg-ink/10 border-ink",
                "bg-charcoal/10 border-charcoal",
                "bg-pastel-blue/40 border-pastel-blue",
                "bg-pastel-pink/40 border-pastel-pink",
                "bg-pastel-lavender/40 border-pastel-lavender",
                "bg-pastel-peach/40 border-pastel-peach",
              ];
              const colorClass = colorClasses[index % colorClasses.length];
              const top =
                ((block.start - dayStart.toMillis()) / 60000) * PX_PER_MIN;
              const height = Math.max(
                24,
                ((block.end - block.start) / 60000) * PX_PER_MIN,
              );
              const linkedTitle =
                (block.taskId && taskMap.get(block.taskId)) || block.title;
              return (
                <div
                  key={block.id}
                  className={`absolute left-3 right-3 rounded-xl border-2 p-3 shadow-sm cursor-move ${colorClass}`}
                  style={{ top, height }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "text/plain",
                      JSON.stringify({
                        id: block.id,
                        duration: block.end - block.start,
                      }),
                    );
                    e.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <div className="flex justify-between items-center gap-2">
                    <p className="font-semibold text-ink text-sm line-clamp-2">
                      {linkedTitle || "無題のブロック"}
                    </p>
                    {onBlockDelete && (
                      <button
                        title="削除"
                        onClick={() => onBlockDelete(block.id)}
                        className="px-2 py-1 rounded bg-error/10 hover:bg-error/20 text-error text-xs"
                      >
                        削除
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {formatTime(block.start)} - {formatTime(block.end)} (
                    {getDuration(block.start, block.end)})
                  </p>
                  <div className="mt-2 flex gap-2">
                    {onBlockShift && (
                      <>
                        <button
                          title="-1分"
                          onClick={() => onBlockShift(block.id, -60 * 1000)}
                          className="px-2 py-1 rounded border border-border text-xs hover:bg-white"
                        >
                          -1m
                        </button>
                        <button
                          title="+1分"
                          onClick={() => onBlockShift(block.id, 60 * 1000)}
                          className="px-2 py-1 rounded border border-border text-xs hover:bg-white"
                        >
                          +1m
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ブロック以外（休憩等） */}
        <div className="mt-6 space-y-3">
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
