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

interface TaskListProps {
  tasks: Task[];
  goals?: { id: string; title: string }[];
  onTaskAdd: (title: string) => void;
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  onTaskDelete: (id: string) => void;
  onTaskReorder?: (id: string, direction: "up" | "down") => void;
  onTaskReorderIndex?: (id: string, toIndex: number) => void;
  canAddTomorrow: boolean;
  promiseDateLabel: string;
}

export default function TaskList({
  tasks,
  goals = [],
  onTaskAdd,
  onTaskUpdate,
  onTaskDelete,
  onTaskReorder,
  onTaskReorderIndex,
  canAddTomorrow,
  promiseDateLabel,
}: TaskListProps) {
  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canAddTomorrow) return;
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
        return "bg-ink text-white border-ink";
      case "doing":
        return "bg-pastel-yellow/70 border-pastel-yellow text-gray-900";
      case "done":
        return "bg-pastel-lavender/60 border-pastel-lavender text-ink";
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

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-md border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-ink via-charcoal to-pastel-lavender"></div>
        <h2 className="text-2xl font-bold text-ink tracking-tight">タスクリスト</h2>
        <div className="ml-auto px-3 py-1 rounded-full bg-charcoal text-white text-sm font-semibold shadow-sm">
          {tasks.filter((t) => t.state !== "done").length} 件
        </div>
      </div>

      {/* 約束モジュール */}
      <div
        className={`mb-6 rounded-2xl border p-5 ${
          canAddTomorrow
            ? "border-ink/20 bg-gradient-to-r from-ink via-charcoal to-graphite text-white shadow-[0_12px_45px_rgba(15,23,42,0.25)]"
            : "border-dashed border-gray-400 bg-gray-50 text-gray-600"
        }`}
      >
        {canAddTomorrow ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide uppercase text-pastel-blue">
              明日の自分との約束
            </p>
            <h3 className="text-xl font-bold text-white">{promiseDateLabel}</h3>
            <p className="text-sm text-gray-200">
              今日のうちに「明朝すぐ着手したいこと」を書き出しておきましょう。
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pastel-pink via-pastel-lavender to-pastel-blue transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-200">
              残り {unfinished} 件 / 完了 {finished} 件
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide uppercase">
              明日の約束のみ
            </p>
            <p className="text-base font-medium">
              約束は {promiseDateLabel} 分だけ登録できます。
            </p>
            <p className="text-sm text-gray-500">
              日付を明日に切り替えるとタスクを追加できます。
            </p>
          </div>
        )}
      </div>

      {/* タスク追加フォーム */}
      <form onSubmit={handleAddTask} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            name="title"
            placeholder={
              canAddTomorrow
                ? "明日の自分との約束を追加..."
                : "明日の分だけ追加できます"
            }
            className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-gray-50 focus:border-charcoal focus:bg-white outline-none transition-all duration-200 placeholder:text-gray-500 text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!canAddTomorrow}
          />
          <button
            type="submit"
            className={`px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-200 ${
              canAddTomorrow
                ? "bg-gradient-to-r from-ink via-charcoal to-pastel-lavender text-white"
                : "bg-white text-ink border-2 border-charcoal opacity-50 cursor-not-allowed"
            }`}
            disabled={!canAddTomorrow}
          >
            {canAddTomorrow ? "約束に追加" : "明日だけ追加可"}
          </button>
        </div>
        {!canAddTomorrow && (
          <p className="mt-2 text-xs text-gray-500">
            今日以降の約束はできません。日付を明日に変更してください。
          </p>
        )}
      </form>

      {/* タスクリスト */}
      <div className="space-y-3">
        {sorted.length === 0 ? (
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
              className="group relative flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-charcoal bg-gray-50/50 hover:bg-white transition-all duration-200"
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
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                  <label className="flex items-center gap-2">
                    <span>見積(分):</span>
                    <input
                      type="number"
                      min={0}
                      className="w-20 px-2 py-1 border border-border rounded bg-white text-gray-700"
                      value={task.estimateMinutes ?? 0}
                      onChange={(e) => {
                        const next = Math.max(0, Number(e.target.value) || 0);
                        onTaskUpdate(task.id, { estimateMinutes: next });
                      }}
                    />
                  </label>
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
