"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import DateNavigation from "@/components/DateNavigation";
import TaskList from "@/components/TaskList";
import Timeline from "@/components/Timeline";
import {
  initAuthListener,
  signInWithGoogle,
  signOutUser,
  getCurrentUser,
} from "@/lib/firebaseClient";
import {
  ensurePlan,
  getPlan,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  createBlock as apiCreateBlock,
  updateBlock as apiUpdateBlock,
  deleteBlock as apiDeleteBlock,
  interruptSchedule,
  closeDay,
  listGoals,
  createGoal,
  deleteGoal,
} from "@/lib/client";
import GoalsPanel from "@/components/GoalsPanel";

export default function Home() {
  type UITask = {
    id: string;
    title: string;
    state: "todo" | "doing" | "done";
    estimateMinutes?: number;
  };
  const [currentDate, setCurrentDate] = useState(DateTime.now());
  const [planId, setPlanId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<UITask[]>([]);
  const [blocks, setBlocks] = useState<
    {
      id: string;
      title?: string;
      start: number;
      end: number;
      taskId?: string;
    }[]
  >([]);
  const [intermissions, setIntermissions] = useState<
    { id: string; start: number; end: number }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [goals, setGoals] = useState<
    { id: string; title: string; color?: string }[]
  >([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const ymd = useMemo(() => currentDate.toFormat("yyyy-LL-dd"), [currentDate]);

  const fetchPlan = async (dateStr: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const bundle = await getPlan(dateStr).catch(async (e: unknown) => {
        const err = e as { status?: number };
        if (err?.status === 404) return await ensurePlan(dateStr);
        throw e;
      });
      setPlanId(bundle.plan.id);
      setTasks(
        bundle.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          state: t.state as UITask["state"],
          estimateMinutes: t.estimateMinutes,
        })),
      );
      setBlocks(
        bundle.blocks.map((b) => ({
          id: b.id,
          title: b.title,
          start: b.start,
          end: b.end,
          taskId: b.taskId,
        })),
      );
      setIntermissions(
        bundle.intermissions.map((i) => ({
          id: i.id,
          start: i.start,
          end: i.end,
        })),
      );
      // goals (side-load)
      const gl = await listGoals();
      setGoals(
        gl.goals.map((g) => ({ id: g.id, title: g.title, color: g.color })),
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage(e?.message || "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auth state polling (簡易): 1秒ごとにEmailを反映
    initAuthListener();
    const t = setInterval(() => {
      const u = getCurrentUser();
      setUserEmail(u?.email ?? null);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchPlan(ymd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ymd]);

  const handleDateChange = (date: DateTime) => setCurrentDate(date);

  const handleTaskAdd = async (title: string) => {
    if (!planId) return;
    const tempId = `tmp-${Date.now()}`;
    const optimistic: UITask = { id: tempId, title, state: "todo" };
    setTasks((prev) => [...prev, optimistic]);
    try {
      const { task } = await apiCreateTask({ planId, title });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === tempId
            ? {
                id: task.id,
                title: task.title,
                state: task.state as UITask["state"],
                estimateMinutes: task.estimateMinutes,
              }
            : t,
        ),
      );
    } catch (err: unknown) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      const e = err as { message?: string };
      setMessage(e?.message || "タスク追加に失敗しました");
    }
  };

  const handleTaskUpdate = async (id: string, updates: Partial<UITask>) => {
    const before = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
    try {
      const patch: {
        title?: string;
        state?: UITask["state"];
        estimateMinutes?: number;
        goalId?: string;
      } = {};
      if (updates.title !== undefined) patch.title = updates.title;
      if (updates.state !== undefined) patch.state = updates.state;
      if (updates.estimateMinutes !== undefined)
        patch.estimateMinutes = updates.estimateMinutes;
      if ((updates as { goalId?: string }).goalId !== undefined) {
        patch.goalId = (updates as { goalId?: string }).goalId;
      }
      await apiUpdateTask(id, patch);
    } catch (err: unknown) {
      setTasks(before);
      const e = err as { message?: string };
      setMessage(e?.message || "タスク更新に失敗しました");
    }
  };

  const handleBlockShift = async (id: string, deltaMs: number) => {
    const b = blocks.find((x) => x.id === id);
    if (!b) return;
    const before = blocks;
    const next = { ...b, start: b.start + deltaMs, end: b.end + deltaMs };
    setBlocks((prev) => prev.map((x) => (x.id === id ? next : x)));
    try {
      await apiUpdateBlock(id, { start: next.start, end: next.end });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      setBlocks(before);
      if (e?.status === 409) setMessage("既存ブロックと重なります");
      else setMessage(e?.message || "ブロック移動に失敗しました");
    }
  };

  const handleBlockDelete = async (id: string) => {
    const before = blocks;
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    try {
      await apiDeleteBlock(id);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setBlocks(before);
      setMessage(e?.message || "ブロック削除に失敗しました");
    }
  };

  const handleGoalAdd = async (title: string) => {
    try {
      const { goal } = await createGoal({ title });
      setGoals((prev) => [
        { id: goal.id, title: goal.title, color: goal.color },
        ...prev,
      ]);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage(e?.message || "目標の追加に失敗しました");
    }
  };

  const handleGoalDelete = async (id: string) => {
    const before = goals;
    setGoals((prev) => prev.filter((g) => g.id !== id));
    try {
      await deleteGoal(id);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setGoals(before);
      setMessage(e?.message || "目標の削除に失敗しました");
    }
  };

  const handleTaskDelete = async (id: string) => {
    const before = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await apiDeleteTask(id);
    } catch (err: unknown) {
      setTasks(before);
      const e = err as { message?: string };
      setMessage(e?.message || "タスク削除に失敗しました");
    }
  };

  const handleBlockAdd = async (start: number, end: number, title?: string) => {
    if (!planId) return;
    const tempId = `tmp-${Date.now()}`;
    setBlocks((prev) => [
      ...prev,
      { id: tempId, title: title || "新しいブロック", start, end },
    ]);
    try {
      const { block } = await apiCreateBlock({ planId, start, end, title });
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === tempId
            ? {
                id: block.id,
                title: block.title,
                start: block.start,
                end: block.end,
                taskId: block.taskId,
              }
            : b,
        ),
      );
    } catch (err: unknown) {
      setBlocks((prev) => prev.filter((b) => b.id !== tempId));
      const e = err as { status?: number; message?: string };
      if (e?.status === 409) setMessage("既存ブロックと重なります");
      else setMessage(e?.message || "ブロック追加に失敗しました");
    }
  };

  const handleInterrupt = async () => {
    if (!planId) return;
    setLoading(true);
    setMessage(null);
    try {
      const now = DateTime.now().toMillis();
      await interruptSchedule({ planId, start: now, duration: 30 * 60 * 1000 });
      await fetchPlan(ymd);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage(e?.message || "割り込み処理に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDay = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await closeDay({ date: ymd });
      setMessage(
        `遵守率: ${(res.checkin.adherenceRate * 100).toFixed(0)}% / 引継ぎ: ${res.checkin.carryOverCount}件`,
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage(e?.message || "クローズ処理に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mint-green to-pastel-blue flex items-center justify-center shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-mint-green to-mint-light bg-clip-text text-transparent">
                みらいノート
              </h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {userEmail ? (
                <>
                  <span className="text-sm text-gray-600">{userEmail}</span>
                  <button
                    onClick={() => signOutUser()}
                    className="px-3 py-2 rounded-lg border border-border hover:bg-gray-50 font-medium transition-all duration-200"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <button
                  onClick={() => signInWithGoogle()}
                  className="px-3 py-2 rounded-lg bg-mint-lighter text-mint-green hover:bg-mint-light font-medium transition-all duration-200"
                >
                  Googleでログイン
                </button>
              )}
              <button
                onClick={handleInterrupt}
                className="px-3 py-2 rounded-lg bg-mint-lighter text-mint-green hover:bg-mint-light font-medium transition-all duration-200"
              >
                今すぐ割り込み(30分)
              </button>
              <button
                onClick={handleCloseDay}
                className="px-3 py-2 rounded-lg border border-border hover:bg-gray-50 font-medium transition-all duration-200"
              >
                今日をクローズ
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 日付ナビゲーション */}
        <DateNavigation
          currentDate={currentDate}
          onDateChange={handleDateChange}
        />

        {message && (
          <div className="mt-4 mb-6 px-4 py-3 rounded-lg border border-border bg-white text-sm text-gray-700">
            {message}
          </div>
        )}

        {/* グリッドレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* タスクリスト */}
          <div className="lg:col-span-1">
            <TaskList
              tasks={tasks}
              goals={goals}
              onTaskAdd={handleTaskAdd}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
            />
          </div>

          {/* タイムライン */}
          <div className="lg:col-span-1">
            <Timeline
              blocks={blocks}
              intermissions={intermissions}
              onBlockAdd={handleBlockAdd}
              onBlockShift={handleBlockShift}
              onBlockDelete={handleBlockDelete}
            />
          </div>
        </div>

        {/* 目標 */}
        <div className="mt-6">
          <GoalsPanel
            goals={goals}
            onAdd={handleGoalAdd}
            onDelete={handleGoalDelete}
          />
        </div>

        {/* フッター */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>
            {loading ? "処理中..." : "みらいノート - あなたの未来を計画する"}
          </p>
        </footer>
      </main>
    </div>
  );
}
