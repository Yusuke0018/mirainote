"use client";

interface Task {
  id: string;
  title: string;
  state: "todo" | "doing" | "done";
  estimateMinutes?: number;
  goalId?: string;
}

interface TaskListProps {
  tasks: Task[];
  goals?: { id: string; title: string }[];
  onTaskAdd: (title: string) => void;
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  onTaskDelete: (id: string) => void;
}

export default function TaskList({
  tasks,
  goals = [],
  onTaskAdd,
  onTaskUpdate,
  onTaskDelete,
}: TaskListProps) {
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-mint-green to-pastel-blue"></div>
        <h2 className="text-2xl font-bold text-foreground">タスクリスト</h2>
        <div className="ml-auto px-3 py-1 rounded-full bg-mint-lighter text-sm font-medium text-mint-green">
          {tasks.filter((t) => t.state !== "done").length} 件
        </div>
      </div>

      {/* タスク追加フォーム */}
      <form onSubmit={handleAddTask} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            name="title"
            placeholder="新しいタスクを追加..."
            className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-gray-50 focus:border-mint-green focus:bg-white outline-none transition-all duration-200 placeholder:text-gray-400"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-mint-green to-mint-light text-white font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            追加
          </button>
        </div>
      </form>

      {/* タスクリスト */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
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
          tasks.map((task) => (
            <div
              key={task.id}
              className="group relative flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-mint-green bg-gray-50/50 hover:bg-white transition-all duration-200"
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

              {/* タイトル */}
              <div className="flex-1">
                <p
                  className={`font-medium ${task.state === "done" ? "line-through text-gray-400" : "text-foreground"}`}
                >
                  {task.title}
                </p>
                {goals.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
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
                {task.estimateMinutes && (
                  <p className="text-xs text-gray-500 mt-1">
                    見積: {task.estimateMinutes}分
                  </p>
                )}
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
