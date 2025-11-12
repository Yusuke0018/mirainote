"use client";

interface Goal {
  id: string;
  title: string;
  color?: string;
}

interface GoalsPanelProps {
  goals: Goal[];
  onAdd: (title: string) => void;
  onDelete: (id: string) => void;
}

export default function GoalsPanel({
  goals,
  onAdd,
  onDelete,
}: GoalsPanelProps) {
  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = (fd.get("title") as string) ?? "";
    if (title.trim()) {
      onAdd(title.trim());
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
        <div className="flex gap-2">
          <input
            type="text"
            name="title"
            placeholder="目標を追加..."
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
      <div className="space-y-2">
        {goals.map((g) => (
          <div
            key={g.id}
            className="flex items-center justify-between p-3 rounded-lg border-2 border-border bg-gray-50/50"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: g.color || "#2fa38a" }}
              />
              <span className="font-medium text-foreground">{g.title}</span>
            </div>
            <button
              onClick={() => onDelete(g.id)}
              className="text-error text-sm hover:underline"
            >
              削除
            </button>
          </div>
        ))}
        {goals.length === 0 && (
          <div className="text-sm text-gray-500">まだ目標がありません</div>
        )}
      </div>
    </div>
  );
}
