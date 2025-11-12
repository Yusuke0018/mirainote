"use client";

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
  onBlockAdd: (start: number, end: number, title?: string) => void;
}

export default function Timeline({
  blocks,
  intermissions,
  onBlockAdd,
}: TimelineProps) {
  const formatTime = (timestamp: number) => {
    return DateTime.fromMillis(timestamp).toFormat("HH:mm");
  };

  const getDuration = (start: number, end: number) => {
    const minutes = Math.floor((end - start) / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0
      ? `${hours}時間${remainingMinutes}分`
      : `${remainingMinutes}分`;
  };

  // 時間軸の時刻ラベル（6:00〜23:00）
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-mint-green to-mint-light"></div>
        <h2 className="text-2xl font-bold text-foreground">タイムライン</h2>
        <div className="ml-auto px-3 py-1 rounded-full bg-mint-lighter text-sm font-medium text-mint-green">
          {blocks.length} ブロック
        </div>
      </div>

      {/* タイムライン表示 */}
      <div className="relative">
        {/* 時刻軸 */}
        <div className="flex flex-col gap-2 mb-4">
          {hours.map((hour) => (
            <div key={hour} className="flex items-center gap-3 h-12">
              <div className="w-12 text-sm font-medium text-gray-500 text-right">
                {hour}:00
              </div>
              <div className="flex-1 border-t border-dashed border-gray-200"></div>
            </div>
          ))}
        </div>

        {/* ブロック表示エリア */}
        <div className="space-y-3">
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
                時間ブロックを追加して予定を管理しましょう
              </p>
            </div>
          ) : (
            <>
              {/* Intermissions */}
              {intermissions.map((intermission) => (
                <div
                  key={intermission.id}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50"
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
                  "bg-mint-green/10 border-mint-green",
                  "bg-pastel-pink/10 border-pastel-pink",
                  "bg-pastel-blue/10 border-pastel-blue",
                  "bg-pastel-lavender/10 border-pastel-lavender",
                  "bg-pastel-peach/10 border-pastel-peach",
                ];
                const colorClass = colors[index % colors.length];

                return (
                  <div
                    key={block.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 ${colorClass} hover:scale-[1.02] transition-all duration-200 cursor-move`}
                  >
                    <div
                      className={`flex-shrink-0 w-2 h-12 rounded-full ${colorClass.split(" ")[1].replace("border-", "bg-")}`}
                    ></div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {block.title || "無題のブロック"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(block.start)} - {formatTime(block.end)} (
                        {getDuration(block.start, block.end)})
                      </p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* 追加ボタン */}
        <button
          onClick={() => {
            // デモ用: 現在時刻から1時間のブロックを追加
            const now = DateTime.now();
            const start = now.startOf("hour").toMillis();
            const end = now.startOf("hour").plus({ hours: 1 }).toMillis();
            onBlockAdd(start, end, "新しいブロック");
          }}
          className="mt-6 w-full py-4 rounded-xl border-2 border-dashed border-mint-green hover:bg-mint-lighter/20 text-mint-green font-medium transition-all duration-200 flex items-center justify-center gap-2"
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
          新しいブロックを追加
        </button>
      </div>
    </div>
  );
}
