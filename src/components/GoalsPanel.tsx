"use client";
import React from 'react'

interface Goal {
  id: string;
  title: string;
  color?: string;
}

interface GoalsPanelProps {
  goals: Goal[];
  onAdd: (title: string, color?: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (
    id: string,
    patch: {
      title?: string;
      period?: string;
      startDate?: string;
      endDate?: string;
      color?: string;
    },
  ) => void;
}

const COLORS = ["#2fa38a", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function GoalsPanel({
  goals,
  onAdd,
  onDelete,
  onUpdate,
}: GoalsPanelProps) {
  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = (fd.get("title") as string) ?? "";
    const color = (fd.get("color") as string) || undefined;
    if (title.trim()) {
      onAdd(title.trim(), color);
      form.reset();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-mint-green to-mint-light"></div>
        <h2 className="text-2xl font-bold text-foreground">目標</h2>
        <div className="ml-auto px-3 py-1 rounded-full bg-mint-lighter text-sm font-medium text-mint-green">
          {goals.length} 件
        </div>
      </div>
      <form onSubmit={handleAdd} className="mb-4">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            name="title"
            placeholder="目標を追加..."
            className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-gray-50 focus:border-mint-green focus:bg-white outline-none transition-all duration-200 placeholder:text-gray-400"
          />
          <select
            name="color"
            className="px-2 py-2 rounded border border-border bg-white"
          >
            <option value="">色</option>
            {COLORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-mint-green to-mint-light text-white font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            追加
          </button>
        </div>
      </form>
      <div className="space-y-2">
        {goals.map((g) => (
          <GoalRow
            key={g.id}
            goal={g}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))}
        {goals.length === 0 && (
          <div className="text-sm text-gray-500">まだ目標がありません</div>
        )}
      </div>
    </div>
  );
}

function GoalRow({
  goal,
  onDelete,
  onUpdate,
}: {
  goal: Goal;
  onDelete: (id: string) => void;
  onUpdate?: GoalsPanelProps["onUpdate"];
}) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(goal.title);
  const [period, setPeriod] = React.useState<
    "year" | "quarter" | "month" | "custom"
  >("month");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  return (
    <div className="p-3 rounded-lg border-2 border-border bg-gray-50/50">
      {!editing ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: goal.color || "#2fa38a" }}
            />
            <span className="font-medium text-foreground">{goal.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {onUpdate && (
              <button
                className="text-sm text-foreground hover:underline"
                onClick={() => setEditing(true)}
              >
                編集
              </button>
            )}
            <button
              onClick={() => onDelete(goal.id)}
              className="text-error text-sm hover:underline"
            >
              削除
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              className="px-2 py-1 border border-border rounded"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="px-2 py-1 border border-border rounded"
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'year'|'quarter'|'month'|'custom')}
            >
              <option value="year">年</option>
              <option value="quarter">四半期</option>
              <option value="month">月</option>
              <option value="custom">カスタム</option>
            </select>
            <input
              type="date"
              className="px-2 py-1 border border-border rounded"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              className="px-2 py-1 border border-border rounded"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded border border-border text-sm"
              onClick={() => setEditing(false)}
            >
              キャンセル
            </button>
            <button
              className="px-3 py-1 rounded bg-mint-lighter text-mint-green hover:bg-mint-light text-sm"
              onClick={() => {
                onUpdate?.(goal.id, { title, period, startDate, endDate });
                setEditing(false);
              }}
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
