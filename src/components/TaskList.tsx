"use client";

import React from "react";

interface Task {
  id: string;
  title: string;
  state: "todo" | "doing" | "done";
  estimateMinutes?: number;
  goalId?: string;
  order?: number;
}

const PLEDGES = [
  {
    id: "focus15",
    label: "全集中15分",
    detail: "最初の15分は神速モード",
    prompt: "最初の15分で終わらせたいこと",
  },
  {
    id: "noCarry",
    label: "持ち越しゼロ宣言",
    detail: "今日決めたことは今日中に片付ける",
    prompt: "今日を終えるための最後の1歩",
  },
  {
    id: "tinyWin",
    label: "小さな勝利を積む",
    detail: "完了で自分を褒める",
    prompt: "すぐ勝ち取れる具体的な勝利",
  },
] as const;

interface TaskListProps {
  tasks: Task[];
  goals?: { id: string; title: string }[];
  onTaskAdd: (title: string) => void;
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  onTaskDelete: (id: string) => void;
  onTaskReorder?: (id: string, direction: "up" | "down") => void;
  onTaskReorderIndex?: (id: string, toIndex: number) => void;
}

export default function TaskList({
  tasks,
  goals = [],
  onTaskAdd,
  onTaskUpdate,
  onTaskDelete,
  onTaskReorder,
  onTaskReorderIndex,
}: TaskListProps) {
  const [selectedPledge, setSelectedPledge] = React.useState(PLEDGES[0].id);
  const [pledgeLocked, setPledgeLocked] = React.useState(false);

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    if (title.trim()) {
      onTaskAdd(title.trim());
      e.currentTarget.reset();
    }
  };

  const getStateColor = (state: Task["state"]) => {
    switch (state) {
      case "todo":
        return "bg-pastel-blue/20 border-pastel-blue text-pastel-blue";
      case "doing":
        return "bg-pastel-yellow/20 border-pastel-yellow text-warning";
      case "done":
        return "bg-mint-light/20 border-mint-green text-success";
    }
  };

  const getStateLabel = (state: Task["state"]) => {
    switch (state) {
      case "todo":
        return "未着手";
      case "doing":
        return "作業中";
      case "done":
        return "完了";
    }
  };

  const sorted = tasks.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const unfinished = tasks.filter((t) => t.state !== "done").length;
  const finished = tasks.filter((t) => t.state === "done").length;
  const completionRate =
    tasks.length > 0 ? Math.round((finished / tasks.length) * 100) : 0;
  const activePledge =
    PLEDGES.find((pledge) => pledge.id === selectedPledge) || PLEDGES[0];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-mint-green to-pastel-blue"></div>
        <h2 className="text-2xl font-bold text-foreground">タスクリスト</h2>
        <div className="ml-auto px-3 py-1 rounded-full bg-mint-lighter text-sm font-medium text-mint-green">
          {tasks.filter((t) => t.state !== "done").length} 件
        </div>
      </div>

      {/* 約束モジュール */}
      <div className="mb-6 rounded-2xl border border-mint-green/50 bg-gradient-to-r from-mint-lighter via-white to-pastel-blue/20 p-4 shadow-[0_10px_40px_rgba(36,180,150,0.08)]">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-mint-green">今日の自分との約束</span>
          <span className="text-xs text-gray-500">
            {pledgeLocked
              ? "ロック中。宣言どおりにタスクを書き出そう。"
              : "気分に合う宣言をタップしてロックすると集中しやすくなります。"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {PLEDGES.map((pledge) => {
            const active = pledge.id === selectedPledge;
            return (
              <button
                key={pledge.id}
                type="button"
                onClick={() => {
                  setSelectedPledge(pledge.id);
                  setPledgeLocked(false);
                }}
                className={`flex flex-col items-start gap-1 rounded-2xl border px-3 py-2 text-left transition-all duration-200 ${
                  active
                    ? "border-mint-green bg-white shadow-lg"
                    : "border-transparent bg-white/70 hover:border-mint-green/40"
                }`}
              >
                <span className="text-sm font-semibold text-foreground">
                  {pledge.label}
                </span>
                <span className="text-[11px] text-gray-500">{pledge.detail}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setPledgeLocked((prev) => !prev)}
            className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              pledgeLocked
                ? "border-transparent bg-mint-green text-white shadow-lg"
                : "border-border text-mint-green hover:border-mint-green"
            }`}
          >
            {pledgeLocked ? "約束ロック解除" : "この約束をロック"}
          </button>
          <div className="flex-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-mint-green to-mint-light transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              約束達成率 {completionRate}%（残り {unfinished} 件 / 完了 {finished} 件）
            </p>
          </div>
        </div>
      </div>

      {/* タスク追加フォーム */}
      <form onSubmit={handleAddTask} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            name="title"
            placeholder={
              pledgeLocked
                ? `宣言: ${activePledge.prompt}`
                : "新しいタスクを追加..."
            }
            className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-gray-50 focus:border-mint-green focus:bg-white outline-none transition-all duration-200 placeholder:text-gray-400"
          />
          <button
            type="submit"
            className={`px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-200 ${
              pledgeLocked
                ? "bg-gradient-to-r from-mint-green to-mint-light text-white"
                : "bg-white text-mint-green border-2 border-mint-green"
            }`}
          >
            {pledgeLocked ? "約束に追加" : "追加"}
          </button>
        </div>
        {!pledgeLocked && (
          <p className="mt-2 text-xs text-gray-500">
            宣言をロックするとプレッシャーとワクワクを少しだけプラスします。
          </p>
        )}
      </form>

      {/* タスクリスト */}
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-mint-light"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-lg font-medium">タスクがありません</p>
            <p className="text-sm mt-1">
              上のフォームから新しいタスクを追加しましょう
            </p>
          </div>
        ) : (
          sorted.map((task, idx) => (
            <div
              key={task.id}
              className="group relative flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-mint-green bg-gray-50/50 hover:bg-white transition-all duration-200"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", task.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (!onTaskReorderIndex) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                if (!onTaskReorderIndex) return;
                e.preventDefault();
                const draggedId = e.dataTransfer.getData("text/plain");
                if (draggedId && draggedId !== task.id)
                  onTaskReorderIndex(draggedId, idx);
              }}
            >
              {/* 状態ボタン */}
              <button
                onClick={() => {
                  const nextState =
                    task.state === "todo"
                      ? "doing"
                      : task.state === "doing"
                        ? "done"
                        : "todo";
                  onTaskUpdate(task.id, { state: nextState });
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all duration-200 hover:scale-105 ${getStateColor(task.state)}`}
              >
                {getStateLabel(task.state)}
              </button>

              {/* タイトル・サブ情報 */}
              <div className="flex-1">
                <p
                  className={`font-medium ${task.state === "done" ? "line-through text-gray-400" : "text-foreground"}`}
                >
                  {task.title}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <span>見積:</span>
                    <button
                      title="-5m"
                      className="px-2 py-0.5 rounded border border-border hover:bg-white"
                      onClick={() =>
                        onTaskUpdate(task.id, {
                          estimateMinutes: Math.max(
                            0,
                            (task.estimateMinutes ?? 0) - 5,
                          ),
                        })
                      }
                    >
                      -5
                    </button>
                    <span className="px-2">{task.estimateMinutes ?? 0}分</span>
                    <button
                      title="+5m"
                      className="px-2 py-0.5 rounded border border-border hover:bg-white"
                      onClick={() =>
                        onTaskUpdate(task.id, {
                          estimateMinutes: (task.estimateMinutes ?? 0) + 5,
                        })
                      }
                    >
                      +5
                    </button>
                  </div>
                  {goals.length > 0 && (
                    <div className="flex items-center gap-1">
                      <label htmlFor={`goal-${task.id}`}>目標:</label>
                      <select
                        id={`goal-${task.id}`}
                        className="px-2 py-1 rounded border border-border bg-white"
                        value={task.goalId || ""}
                        onChange={(e) =>
                          onTaskUpdate(task.id, {
                            goalId: e.target.value || undefined,
                          })
                        }
                      >
                        <option value="">未選択</option>
                        {goals.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* 削除ボタン */}
              <button
                onClick={() => onTaskDelete(task.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-error/10 hover:bg-error/20 text-error transition-all duration-200 flex items-center justify-center"
                aria-label="削除"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* 並べ替え */}
              {onTaskReorder && (
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    title="上へ"
                    disabled={idx === 0}
                    onClick={() => onTaskReorder(task.id, "up")}
                    className="w-8 h-6 rounded border border-border text-xs disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    title="下へ"
                    disabled={idx === sorted.length - 1}
                    onClick={() => onTaskReorder(task.id, "down")}
                    className="w-8 h-6 rounded border border-border text-xs disabled:opacity-40"
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
