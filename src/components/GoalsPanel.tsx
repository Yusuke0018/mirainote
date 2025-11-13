"use client";
import React from "react";

interface Goal {
  id: string;
  title: string;
  color?: string;
  categoryId?: string;
  period?: "year" | "quarter" | "month" | "custom";
  startDate?: string;
  endDate?: string;
  order?: number;
  subGoals?: SubGoal[];
}

interface SubGoal {
  id: string;
  title: string;
  completedAt?: number;
}

interface GoalsPanelProps {
  goals: Goal[];
  categories?: { id: string; name: string; color: string }[];
  onAdd: (title: string, categoryId?: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (
    id: string,
    patch: {
      title?: string;
      period?: "year" | "quarter" | "month" | "custom";
      startDate?: string;
      endDate?: string;
      color?: string;
      categoryId?: string;
      order?: number;
    },
  ) => void;
  onCategoryAdd?: (name: string, color?: string) => void;
  onCategoryUpdate?: (
    id: string,
    patch: { name?: string; color?: string; order?: number },
  ) => void;
  onCategoryDelete?: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
  onSubGoalAdd?: (goalId: string, title: string) => void;
  onSubGoalToggle?: (goalId: string, subGoalId: string, done: boolean) => void;
}

const COLOR_PRESETS = [
  { value: "#2fa38a", label: "ミント", mood: "整える" },
  { value: "#0ea5e9", label: "スカイ", mood: "軽やか" },
  { value: "#f59e0b", label: "アンバー", mood: "情熱" },
  { value: "#ef4444", label: "サンセット", mood: "火力" },
  { value: "#8b5cf6", label: "ラベンダー", mood: "ひらめき" },
] as const;

export default function GoalsPanel({
  goals,
  categories = [],
  onAdd,
  onDelete,
  onUpdate,
  onCategoryAdd,
  onCategoryUpdate,
  onCategoryDelete,
  onReorder,
  onSubGoalAdd,
  onSubGoalToggle,
}: GoalsPanelProps) {
  const totalSubGoals = React.useMemo(
    () =>
      goals.reduce((sum, goal) => sum + (goal.subGoals?.length ?? 0), 0),
    [goals],
  );
  const completedSubGoals = React.useMemo(
    () =>
      goals.reduce(
        (sum, goal) =>
          sum +
          (goal.subGoals?.filter((sg) => Boolean(sg.completedAt)).length ?? 0),
        0,
      ),
    [goals],
  );
  const completionRate =
    totalSubGoals > 0
      ? Math.round((completedSubGoals / totalSubGoals) * 100)
      : 0;

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = (fd.get("title") as string) ?? "";
    const categoryId = (fd.get("categoryId") as string) || undefined;
    if (title.trim()) {
      onAdd(title.trim(), categoryId);
      form.reset();
    }
  };

  const orderedGoals = React.useMemo(() => {
    return [...goals].sort((a, b) => {
      const orderA =
        typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
      const orderB =
        typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    });
  }, [goals]);

  const handleMove = React.useCallback(
    (goalId: string, direction: "up" | "down") => {
      if (!onReorder) return;
      const currentIndex = orderedGoals.findIndex((g) => g.id === goalId);
      if (currentIndex < 0) return;
      const next = [...orderedGoals];
      const [moved] = next.splice(currentIndex, 1);
      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex > next.length) return;
      next.splice(targetIndex, 0, moved);
      onReorder(next.map((g) => g.id));
    },
    [onReorder, orderedGoals],
  );

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-md border border-border p-4 sm:p-6 mobile-card">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-10 rounded-full bg-gradient-to-b from-ink via-charcoal to-graphite"></div>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-ink/50">
              Goals
            </p>
            <h2 className="text-3xl font-black text-ink tracking-tight">
              目標
            </h2>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="px-3 py-2 rounded-2xl bg-ink text-white text-sm font-semibold shadow">
            {goals.length} 件
          </div>
          <div className="px-4 py-2 rounded-2xl border border-border/80 bg-white text-xs text-ink/70">
            ミニ目標 {completedSubGoals}/{totalSubGoals} 達成（{completionRate}
            %）
          </div>
        </div>
      </div>
      <form onSubmit={handleAdd} className="mb-4">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            name="title"
            placeholder="目標を追加..."
            className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-gray-50 focus:border-charcoal focus:bg-white outline-none transition-all duration-200 placeholder:text-gray-400"
          />
          <select
            name="categoryId"
            className="px-2 py-2 rounded border border-border bg-white text-sm text-gray-600"
          >
            <option value="">カテゴリー</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-ink via-charcoal to-mint-green text-white font-semibold hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            追加
          </button>
        </div>
      </form>
      <CategoryManager
        categories={categories}
        onAdd={onCategoryAdd}
        onUpdate={onCategoryUpdate}
        onDelete={onCategoryDelete}
      />
      <div className="space-y-2">
        {orderedGoals.map((g, idx) => (
          <GoalRow
            key={g.id}
            goal={g}
            categories={categories}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onMove={onReorder ? handleMove : undefined}
            isFirst={idx === 0}
            isLast={idx === orderedGoals.length - 1}
            onSubGoalAdd={onSubGoalAdd}
            onSubGoalToggle={onSubGoalToggle}
          />
        ))}
        {orderedGoals.length === 0 && (
          <div className="text-sm text-gray-500">まだ目標がありません</div>
        )}
      </div>
    </div>
  );
}

function GoalRow({
  goal,
  categories,
  onDelete,
  onUpdate,
  onMove,
  isFirst,
  isLast,
  onSubGoalAdd,
  onSubGoalToggle,
}: {
  goal: Goal;
  categories: { id: string; name: string; color: string }[];
  onDelete: (id: string) => void;
  onUpdate?: GoalsPanelProps["onUpdate"];
  onMove?: (id: string, direction: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
  onSubGoalAdd?: (goalId: string, title: string) => void;
  onSubGoalToggle?: (goalId: string, subGoalId: string, done: boolean) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(goal.title);
  const [period, setPeriod] = React.useState<
    "year" | "quarter" | "month" | "custom"
  >(goal.period ?? "month");
  const [startDate, setStartDate] = React.useState(goal.startDate ?? "");
  const [endDate, setEndDate] = React.useState(goal.endDate ?? "");
  const [categoryId, setCategoryId] = React.useState(goal.categoryId || "");
  const [newSubGoalTitle, setNewSubGoalTitle] = React.useState("");
  const category = categories.find((c) => c.id === goal.categoryId) || null;
  const accentColor = category?.color || goal.color || "#2fa38a";
  const tintedAccent = `${accentColor}22`;
  const cardStyle = {
    background: `linear-gradient(130deg, ${tintedAccent} 0%, #ffffff 65%)`,
  };
  const readablePeriodMap: Record<
    "year" | "quarter" | "month" | "custom",
    string
  > = {
    year: "年次目標",
    quarter: "四半期目標",
    month: "月次目標",
    custom: "カスタム期間",
  };
  const readablePeriod = readablePeriodMap[period];
  const dateRange = startDate && endDate
    ? `${startDate} 〜 ${endDate}`
    : startDate
      ? `${startDate} 〜`
      : endDate
        ? `〜 ${endDate}`
        : null;
  const subGoals = goal.subGoals ?? [];
  const activeSubGoals = subGoals.filter((sg) => !sg.completedAt);
  const completedSubGoals = subGoals.filter((sg) => sg.completedAt);
  const totalSubGoals = subGoals.length;
  const subGoalProgress =
    totalSubGoals > 0
      ? Math.round((completedSubGoals.length / totalSubGoals) * 100)
      : 0;

  React.useEffect(() => {
    setTitle(goal.title);
    setPeriod(goal.period ?? "month");
    setStartDate(goal.startDate ?? "");
    setEndDate(goal.endDate ?? "");
    setCategoryId(goal.categoryId || "");
    setNewSubGoalTitle("");
  }, [goal]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-border shadow-lg px-5 py-4 sm:py-5 sm:px-6"
      style={cardStyle}
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5 rounded-r-full"
        style={{ backgroundColor: accentColor }}
        aria-hidden
      />
      {!editing ? (
        <div className="relative z-10 flex flex-col gap-4 text-ink">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.35em] text-ink/50">
              GOAL
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                {goal.title}
              </p>
              {category && (
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold border border-white/80"
                  style={{
                    backgroundColor: `${accentColor}30`,
                    color: "#0f172a",
                  }}
                >
                  {category.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-ink/70">
            <span className="font-semibold">{readablePeriod}</span>
            {dateRange && <span>{dateRange}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
            {onMove && (
              <div className="flex items-center gap-1 text-xs font-medium text-ink/70">
                <button
                  type="button"
                  disabled={isFirst}
                  className="px-2 py-1 rounded-full border border-border disabled:opacity-40 hover:bg-white/70 transition-colors"
                  onClick={() => onMove(goal.id, "up")}
                >
                  上へ
                </button>
                <button
                  type="button"
                  disabled={isLast}
                  className="px-2 py-1 rounded-full border border-border disabled:opacity-40 hover:bg-white/70 transition-colors"
                  onClick={() => onMove(goal.id, "down")}
                >
                  下へ
                </button>
              </div>
            )}
            {onUpdate && (
              <button
                className="text-ink hover:text-ink/70 transition-colors"
                onClick={() => setEditing(true)}
              >
                編集
              </button>
            )}
            <button
              onClick={() => onDelete(goal.id)}
              className="text-error hover:text-error/80 transition-colors"
            >
              削除
            </button>
          </div>
          {(onSubGoalAdd || subGoals.length > 0) && (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-ink/70 mb-3">
                  <span>ミニ目標</span>
                  <div className="flex items-center gap-2 text-[11px] text-ink/60">
                    <span>
                      {completedSubGoals.length}/{subGoals.length || 0}
                    </span>
                    <div className="relative h-1.5 w-24 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-ink transition-all"
                        style={{ width: `${subGoalProgress}%` }}
                      />
                    </div>
                    <span>{subGoalProgress}%</span>
                  </div>
                </div>
                {activeSubGoals.length > 0 ? (
                  <ul className="space-y-2">
                    {activeSubGoals.map((sg) => (
                      <li
                        key={sg.id}
                        className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 border border-border/60"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border text-charcoal"
                          checked={false}
                          disabled={!onSubGoalToggle}
                          onChange={() => onSubGoalToggle?.(goal.id, sg.id, true)}
                        />
                        <span className="text-sm font-semibold text-ink">
                          {sg.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-ink/50">
                    未達成のミニ目標はありません。
                  </p>
                )}
                {onSubGoalAdd && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newSubGoalTitle.trim()) return;
                      onSubGoalAdd(goal.id, newSubGoalTitle.trim());
                      setNewSubGoalTitle("");
                    }}
                    className="mt-3 flex items-center gap-2"
                  >
                    <input
                      className="flex-1 px-3 py-2 rounded-xl border border-border text-sm bg-white focus:border-charcoal"
                      placeholder="新しいミニ目標"
                      value={newSubGoalTitle}
                      onChange={(e) => setNewSubGoalTitle(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-xl bg-charcoal text-white text-xs font-semibold hover:bg-ink"
                    >
                      追加
                    </button>
                  </form>
                )}
              </div>
              {completedSubGoals.length > 0 && (
                <div className="rounded-2xl border border-dashed border-white/60 bg-white/50 p-3">
                  <p className="text-xs font-semibold text-ink/60 mb-2">
                    完了済み
                  </p>
                  <ul className="space-y-2 text-xs text-ink/60">
                    {completedSubGoals.map((sg) => (
                      <li
                        key={sg.id}
                        className="flex items-center gap-3 rounded-2xl border border-border/40 px-3 py-2 bg-white/80"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border text-charcoal"
                          checked
                          disabled={!onSubGoalToggle}
                          onChange={() =>
                            onSubGoalToggle?.(goal.id, sg.id, false)
                          }
                        />
                        <span className="line-through text-sm">{sg.title}</span>
                        {sg.completedAt && (
                          <span className="ml-auto text-[10px] text-ink/40">
                            {new Date(sg.completedAt).toLocaleDateString("ja-JP")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="relative z-10 space-y-3 text-sm text-gray-700">
          <div className="flex flex-col gap-2">
            <input
              className="w-full px-3 py-2 border-2 border-border rounded-xl text-base font-semibold focus:border-charcoal focus:bg-white/80 outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <select
                className="px-3 py-2 border-2 border-border rounded-xl text-sm text-gray-700 focus:border-charcoal"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">カテゴリー未設定</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className="px-3 py-2 border-2 border-border rounded-xl text-sm text-gray-700 focus:border-charcoal"
                value={period}
                onChange={(e) =>
                  setPeriod(
                    e.target.value as "year" | "quarter" | "month" | "custom",
                  )
                }
              >
                <option value="year">年</option>
                <option value="quarter">四半期</option>
                <option value="month">月</option>
                <option value="custom">カスタム</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              className="px-3 py-2 border-2 border-border rounded-xl text-sm text-gray-700 focus:border-charcoal flex-1 min-w-[160px]"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              className="px-3 py-2 border-2 border-border rounded-xl text-sm text-gray-700 focus:border-charcoal flex-1 min-w-[160px]"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="px-4 py-2 rounded-xl border border-border text-sm text-gray-600 hover:bg-white/70"
              onClick={() => setEditing(false)}
            >
              キャンセル
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-charcoal text-white hover:bg-ink text-sm shadow-sm"
              onClick={() => {
                const payload: {
                  title?: string;
                  period?: "year" | "quarter" | "month" | "custom";
                  startDate?: string;
                  endDate?: string;
                  categoryId?: string;
                } = {
                  title,
                  period,
                  categoryId: categoryId || undefined,
                };
                if (startDate) payload.startDate = startDate;
                if (endDate) payload.endDate = endDate;
                onUpdate?.(goal.id, payload);
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

function CategoryManager({
  categories,
  onAdd,
  onUpdate,
  onDelete,
}: {
  categories: { id: string; name: string; color: string }[];
  onAdd?: (name: string, color?: string) => void;
  onUpdate?: (
    id: string,
    patch: { name?: string; color?: string; order?: number },
  ) => void;
  onDelete?: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState<string>(COLOR_PRESETS[0].value);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2 text-sm text-ink hover:underline"
      >
        {open ? "カテゴリーを隠す" : "カテゴリーを管理"}
      </button>
      {open && (
        <div className="p-3 rounded-xl border border-border bg-gray-50/80 mb-2 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="px-2 py-1 border border-border rounded flex-1 text-sm text-gray-700 focus:border-charcoal"
              placeholder="カテゴリー名"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="px-3 py-1 rounded bg-charcoal text-white hover:bg-ink text-sm shadow-sm"
              onClick={() => {
                if (!name.trim()) return;
                onAdd?.(name.trim(), color);
                setName("");
                setColor(COLOR_PRESETS[0].value);
              }}
            >
              追加
            </button>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">カラーを選択</p>
            <ColorSwatchPicker value={color} onChange={setColor} />
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-2 p-2 rounded border border-border bg-white"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <input
                      className="px-2 py-1 border border-border rounded flex-1 text-sm text-gray-700 focus:border-charcoal"
                      defaultValue={c.name}
                      onBlur={(e) =>
                        onUpdate?.(c.id, { name: e.target.value })
                      }
                    />
                  </div>
                  <button
                    className="px-2 py-1 rounded bg-error/10 hover:bg-error/20 text-error text-sm sm:self-start"
                    onClick={() => onDelete?.(c.id)}
                  >
                    削除
                  </button>
                </div>
                <ColorSwatchPicker
                  value={c.color}
                  onChange={(selected) =>
                    onUpdate?.(c.id, { color: selected })
                  }
                  size="compact"
                />
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-xs text-gray-500">
                まだカテゴリーがありません
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ColorSwatchPicker({
  value,
  onChange,
  size = "default",
}: {
  value: string;
  onChange: (color: string) => void;
  size?: "default" | "compact";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_PRESETS.map((preset) => {
        const active = preset.value === value;
        return (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={`flex items-center gap-2 px-2 py-1 rounded-full border text-xs transition-all duration-200 ${
              active
                ? "border-charcoal bg-charcoal text-white shadow-sm"
                : "border-border text-gray-600 hover:border-charcoal"
            }`}
            aria-pressed={active}
            title={`${preset.label}（${preset.mood}）`}
          >
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: preset.value }}
            />
            <span className="font-medium">
              {preset.label}
              {size === "default" && (
                <span className="text-[10px] text-gray-400 ml-1">
                  {preset.mood}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
