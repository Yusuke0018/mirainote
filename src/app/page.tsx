"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import DateNavigation from "@/components/DateNavigation";
import TaskList from "@/components/TaskList";
import Timeline from "@/components/Timeline";
import {
  initAuthListener,
  signInWithGoogle,
  signOutUser,
  getCurrentUser,
  getAuthDebugInfo,
  sendEmailLink,
  completeEmailLinkSignIn,
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
  listGoals,
  createGoal,
  deleteGoal,
  listCategories,
  createCategory as apiCreateCategory,
  updateCategory as apiUpdateCategory,
  deleteCategory as apiDeleteCategory,
} from "@/lib/client";
import GoalsPanel from "@/components/GoalsPanel";

export default function Home() {
  type UITask = {
    id: string;
    title: string;
    state: "todo" | "doing" | "done";
    estimateMinutes?: number;
    order?: number;
    timingNote?: string;
  };
  const [currentDate, setCurrentDate] = useState(DateTime.now());
  const [planId, setPlanId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<UITask[]>([]);
  const [blocks, setBlocks] = useState<
    {
      id: string;
      title: string | undefined;
      start: number;
      end: number;
      taskId: string | undefined;
    }[]
  >([]);
  const [intermissions, setIntermissions] = useState<
    { id: string; start: number; end: number }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [goals, setGoals] = useState<
    {
      id: string;
      title: string;
      color?: string;
      categoryId?: string;
      period?: "year" | "quarter" | "month" | "custom";
      startDate?: string;
      endDate?: string;
    }[]
  >([]);
  const [categories, setCategories] = useState<
    { id: string; name: string; color: string }[]
  >([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authDebug, setAuthDebug] = useState({
    hasUser: false,
    hasToken: false,
    email: null as string | null,
    debugUid: undefined as string | undefined,
  });
  const [emailInput, setEmailInput] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const showTimeline = false;
  type CachedSnapshot = {
    planId: string;
    tasks: UITask[];
    blocks: typeof blocks;
    intermissions: typeof intermissions;
  };
  const planCache = useRef<Map<string, CachedSnapshot>>(new Map());

  const ymd = useMemo(() => currentDate.toFormat("yyyy-LL-dd"), [currentDate]);
  const todayDate = DateTime.now().startOf("day");
  const tomorrowDate = todayDate.plus({ days: 1 });
  const todayStr = todayDate.toFormat("yyyy-LL-dd");
  const tomorrowStr = tomorrowDate.toFormat("yyyy-LL-dd");
  const isTodayPlan = ymd === todayStr;
  const isTomorrowPlan = ymd === tomorrowStr;
  const canAddTaskForPlan = isTodayPlan || isTomorrowPlan;
  const planDateLabel = currentDate.toFormat("yyyy年M月d日 (ccc)", {
    locale: "ja",
  });
  const stats = useMemo(() => {
    const todo = tasks.filter((t) => t.state === "todo").length;
    const doing = tasks.filter((t) => t.state === "doing").length;
    const done = tasks.filter((t) => t.state === "done").length;
    return { todo, doing, done, total: tasks.length };
  }, [tasks]);
  const dayStartMs = useMemo(
    () => DateTime.fromISO(ymd).startOf("day").toMillis(),
    [ymd],
  );

  const findSlotForDuration = useCallback(
    (minutes: number, sourceBlocks?: typeof blocks) => {
      const durationMs = Math.max(1, minutes) * 60 * 1000;
      const sorted = (sourceBlocks ?? blocks)
        .slice()
        .sort((a, b) => a.start - b.start);
      let cursor = dayStartMs;
      for (const block of sorted) {
        if (cursor + durationMs <= block.start) {
          return { start: cursor, end: cursor + durationMs };
        }
        cursor = Math.max(cursor, block.end);
      }
      return { start: cursor, end: cursor + durationMs };
    },
    [blocks, dayStartMs],
  );

  const createBlockForTask = useCallback(
    async (
      planIdentifier: string,
      task: { id: string; title: string; estimateMinutes?: number },
      snapshot?: typeof blocks,
    ) => {
      if (!showTimeline) return null;
      const base = snapshot ?? blocks;
      const duration = task.estimateMinutes ?? 30;
      const slot = findSlotForDuration(duration, base);
      const { block } = await apiCreateBlock({
        planId: planIdentifier,
        start: slot.start,
        end: slot.end,
        title: task.title,
        taskId: task.id,
      });
      const normalized = {
        id: block.id,
        title: block.title,
        start: block.start,
        end: block.end,
        taskId: block.taskId,
      };
      if (!snapshot) {
        setBlocks((prev) => [...prev, normalized]);
      }
      return normalized;
    },
    [blocks, findSlotForDuration, showTimeline],
  );

  const ensureBlocksForTasks = useCallback(
    async (
      planIdentifier: string,
      taskList: {
        id: string;
        title: string;
        estimateMinutes?: number | null;
      }[],
      initialBlocks: typeof blocks,
    ) => {
      if (!showTimeline) return initialBlocks;
      const snapshot = [...initialBlocks];
      for (const task of taskList) {
        if (snapshot.some((b) => b.taskId === task.id)) continue;
        const normalized = await createBlockForTask(
          planIdentifier,
          {
            id: task.id,
            title: task.title,
            estimateMinutes: task.estimateMinutes ?? undefined,
          },
          snapshot,
        );
        if (normalized) snapshot.push(normalized);
      }
      return snapshot;
    },
    [createBlockForTask, showTimeline],
  );

  const getAuthErrorMessage = useCallback(() => {
    if (!authDebug.hasUser) return "Googleでログインしてください";
    if (!authDebug.hasToken)
      return "IDトークンが取得できていません。ページを再読み込みして再ログインしてください";
    return "サーバーの Firebase 鍵とクライアントの設定が一致していない可能性があります";
  }, [authDebug]);

  const resolveMessage = useCallback(
    (err: { status?: number; message?: string }, fallback: string) => {
      if (err?.status === 401) return getAuthErrorMessage();
      return err?.message || fallback;
    },
    [getAuthErrorMessage],
  );

  const fetchPlan = async (dateStr: string) => {
    setLoading(true);
    setMessage(null);
    const cached = planCache.current.get(dateStr);
    if (cached) {
      applySnapshot(cached);
    }

    // 認証状態チェック（ログイン済みかつトークンがない場合は待機）
    if (!authDebug.hasToken && authDebug.hasUser) {
      setMessage("認証情報を取得中です。しばらくお待ちください...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    try {
      const bundle = await getPlan(dateStr).catch(async (e: unknown) => {
        const err = e as { status?: number };
        if (err?.status === 404) return await ensurePlan(dateStr);
        throw e;
      });
      const mappedTasks = bundle.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        state: t.state as UITask["state"],
        estimateMinutes: t.estimateMinutes,
        order: (t as unknown as { order?: number }).order,
        timingNote: (t as unknown as { timingNote?: string }).timingNote,
      }));
      let mappedBlocks: typeof blocks = [];
      let mappedIntermissions: typeof intermissions = [];
      if (showTimeline) {
        mappedBlocks = bundle.blocks.map((b) => ({
          id: b.id,
          title: b.title,
          start: b.start,
          end: b.end,
          taskId: b.taskId,
        }));
        mappedIntermissions = bundle.intermissions.map((i) => ({
          id: i.id,
          start: i.start,
          end: i.end,
        }));
        mappedBlocks = await ensureBlocksForTasks(
          bundle.plan.id,
          bundle.tasks,
          mappedBlocks,
        );
      }
      const snapshot: CachedSnapshot = {
        planId: bundle.plan.id,
        tasks: mappedTasks,
        blocks: mappedBlocks,
        intermissions: mappedIntermissions,
      };
      planCache.current.set(dateStr, snapshot);
      applySnapshot(snapshot);
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      setMessage(resolveMessage(e, "読み込みに失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  const applySnapshot = useCallback(
    (snapshot: CachedSnapshot) => {
      setPlanId(snapshot.planId);
      setTasks(snapshot.tasks);
      if (showTimeline) {
        setBlocks(snapshot.blocks);
        setIntermissions(snapshot.intermissions);
      }
    },
    [showTimeline],
  );

  useEffect(() => {
    // Auth state polling (簡易): 1秒ごとにEmailを反映
    initAuthListener();
    const t = setInterval(() => {
      const u = getCurrentUser();
      setUserEmail(u?.email ?? null);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // メールリンク認証の処理（ページ読み込み時）
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const completed = await completeEmailLinkSignIn();
        if (completed && mounted) {
          setMessage("✅ ログインに成功しました！");
          // URLからクエリパラメータを削除してクリーンなURLに
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (error) {
        if (mounted) {
          console.error("Email link sign-in error:", error);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const update = async () => {
      const info = await getAuthDebugInfo();
      if (mounted) setAuthDebug(info);
    };
    update();
    const timer = setInterval(update, 4000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // 認証準備完了まで待機（最大3秒）
      let retries = 0;
      while (retries < 6 && !authDebug.hasToken && authDebug.hasUser) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        retries++;
      }

      try {
        const [gl, cat] = await Promise.all([listGoals(), listCategories()]);
        if (!mounted) return;
        setGoals(
          gl.goals.map((g) => ({
            id: g.id,
            title: g.title,
            color: g.color,
            categoryId: g.categoryId,
            period: g.period,
            startDate: g.startDate,
            endDate: g.endDate,
          })),
        );
        setCategories(
          cat.categories.map((c) => ({ id: c.id, name: c.name, color: c.color })),
        );
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      setMessage(resolveMessage(e, "マスターデータの取得に失敗しました"));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [resolveMessage, authDebug.hasToken, authDebug.hasUser]);

  useEffect(() => {
    fetchPlan(ymd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ymd]);

  const handleDateChange = (date: DateTime) => setCurrentDate(date);

  const handleTaskAdd = async (title: string, timingNote?: string) => {
    if (!canAddTaskForPlan) {
      setMessage("タスクは今日と明日のみ追加できます。");
      return;
    }
    if (!planId) return;
    const tempId = `tmp-${Date.now()}`;
    const optimistic: UITask = {
      id: tempId,
      title,
      state: "todo",
      timingNote,
    };
    setTasks((prev) => [...prev, optimistic]);
    try {
      const { task } = await apiCreateTask({ planId, title, timingNote });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === tempId
            ? {
                id: task.id,
                title: task.title,
                state: task.state as UITask["state"],
                estimateMinutes: task.estimateMinutes,
                timingNote: (task as { timingNote?: string }).timingNote,
              }
            : t,
        ),
      );
      if (showTimeline && planId) {
        try {
          await createBlockForTask(planId, {
            id: task.id,
            title: task.title,
            estimateMinutes: task.estimateMinutes,
          });
        } catch (err: unknown) {
          const e = err as { message?: string; status?: number };
          setMessage(resolveMessage(e, "タイムラインへの反映に失敗しました"));
        }
      }
    } catch (err: unknown) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      const e = err as { message?: string; status?: number };
      setMessage(resolveMessage(e, "タスク追加に失敗しました"));
    }
  };

  const handleTaskUpdate = async (id: string, updates: Partial<UITask>) => {
    const beforeTasks = tasks;
    const beforeBlocks = blocks;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );

    const patch: {
      title?: string;
      state?: UITask["state"];
      estimateMinutes?: number;
      goalId?: string;
      timingNote?: string;
    } = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.state !== undefined) patch.state = updates.state;
    if (updates.estimateMinutes !== undefined)
      patch.estimateMinutes = updates.estimateMinutes;
    if ((updates as { goalId?: string }).goalId !== undefined) {
      patch.goalId = (updates as { goalId?: string }).goalId;
    }
    if ((updates as { timingNote?: string }).timingNote !== undefined) {
      patch.timingNote = (updates as { timingNote?: string }).timingNote;
    }

    const linkedBlock = showTimeline
      ? blocks.find((b) => b.taskId === id)
      : null;
    let blockPromise: Promise<unknown> | null = null;
    if (
      showTimeline &&
      linkedBlock &&
      (updates.title !== undefined || updates.estimateMinutes !== undefined)
    ) {
      const blockPatch: { title?: string; end?: number } = {};
      if (updates.title !== undefined) {
        blockPatch.title = updates.title;
      }
      if (updates.estimateMinutes !== undefined) {
        const durationMs = Math.max(1, updates.estimateMinutes ?? 0) * 60 * 1000;
        blockPatch.end = linkedBlock.start + durationMs;
      }
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === linkedBlock.id
            ? {
                ...b,
                ...(blockPatch.title ? { title: blockPatch.title } : {}),
                ...(blockPatch.end ? { end: blockPatch.end } : {}),
              }
            : b,
        ),
      );
      blockPromise = apiUpdateBlock(linkedBlock.id, blockPatch);
    }

    try {
      await Promise.all([
        apiUpdateTask(id, patch),
        blockPromise ?? Promise.resolve(),
      ]);
    } catch (err: unknown) {
      setTasks(beforeTasks);
      setBlocks(beforeBlocks);
      const e = err as { message?: string; status?: number };
      setMessage(resolveMessage(e, "タスク更新に失敗しました"));
    }
  };

  const handleBlockShift = async (id: string, deltaMs: number) => {
    const block = blocks.find((x) => x.id === id);
    if (!block) return;
    const before = blocks;
    const next = { ...block, start: block.start + deltaMs, end: block.end + deltaMs };
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
      const e = err as { message?: string; status?: number };
      setBlocks(before);
      setMessage(resolveMessage(e, "ブロック削除に失敗しました"));
    }
  };

  const handleBlockAdd = async (start: number, end: number, title?: string) => {
    if (!planId) return;
    const tempId = `tmp-${Date.now()}`;
    setBlocks((prev) => [
      ...prev,
      {
        id: tempId,
        title: title || "新しいブロック",
        start,
        end,
        taskId: undefined,
      },
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
      else setMessage(resolveMessage(e, "ブロック追加に失敗しました"));
    }
  };

  const handleBlockMoveTo = async (id: string, start: number, end: number) => {
    const block = blocks.find((x) => x.id === id);
    if (!block) return;
    const before = blocks;
    setBlocks((prev) =>
      prev.map((x) => (x.id === id ? { ...x, start, end } : x)),
    );
    try {
      await apiUpdateBlock(id, { start, end });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      setBlocks(before);
      if (e?.status === 409) setMessage("既存ブロックと重なります");
      else setMessage(resolveMessage(e, "ブロック移動に失敗しました"));
    }
  };

  const handleGoalAdd = async (title: string, categoryId?: string) => {
    try {
      const { goal } = await createGoal({ title, categoryId });
      setGoals((prev) => [
        {
          id: goal.id,
          title: goal.title,
          color: goal.color,
          categoryId: goal.categoryId,
          period: goal.period,
          startDate: goal.startDate,
          endDate: goal.endDate,
        },
        ...prev,
      ]);
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      setMessage(resolveMessage(e, "目標の追加に失敗しました"));
    }
  };

  const handleGoalDelete = async (id: string) => {
    const before = goals;
    setGoals((prev) => prev.filter((g) => g.id !== id));
    try {
      await deleteGoal(id);
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      setGoals(before);
      setMessage(resolveMessage(e, "目標の削除に失敗しました"));
    }
  };

  const handleEmailLinkSend = async () => {
    if (!emailInput.trim()) {
      setMessage("メールアドレスを入力してください");
      return;
    }

    // 簡易的なメールバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      setMessage("有効なメールアドレスを入力してください");
      return;
    }

    setSendingEmail(true);
    setMessage(null);

    try {
      await sendEmailLink(emailInput.trim());
      setEmailSent(true);
      setMessage(`✉️ ${emailInput} にログインリンクを送信しました。メールをご確認ください。`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage(`メール送信に失敗しました: ${e?.message || "不明なエラー"}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleTaskDelete = async (id: string) => {
    const beforeTasks = tasks;
    const beforeBlocks = blocks;
    const linkedBlock = showTimeline
      ? blocks.find((b) => b.taskId === id)
      : null;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (showTimeline && linkedBlock) {
      setBlocks((prev) => prev.filter((b) => b.id !== linkedBlock.id));
    }
    try {
      await Promise.all([
        apiDeleteTask(id),
        showTimeline && linkedBlock
          ? apiDeleteBlock(linkedBlock.id)
          : Promise.resolve(),
      ]);
    } catch (err: unknown) {
      setTasks(beforeTasks);
      setBlocks(beforeBlocks);
      const e = err as { message?: string; status?: number };
      setMessage(resolveMessage(e, "タスク削除に失敗しました"));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/90 border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-mint-green to-pastel-blue flex items-center justify-center shadow-lg">
                <svg
                  className="w-4 h-4 sm:w-6 sm:h-6 text-white"
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
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-mint-green to-mint-light bg-clip-text text-transparent">
                  ミライノート
                </h1>
                <span className="text-[10px] sm:text-xs text-gray-500">
                  計画と実行を、やさしく整える
                </span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {userEmail ? (
                <>
                  <span className="hidden sm:inline text-xs text-gray-500">
                    {userEmail}
                  </span>
                  <button
                    onClick={() => signOutUser()}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs sm:text-sm hover:bg-gray-50 font-medium transition-all duration-200"
                  >
                    ログアウト
                  </button>
                </>
              ) : emailSent ? (
                <span className="text-xs sm:text-sm text-mint-green font-medium">
                  📧 メールを確認してください
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="メールアドレス"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEmailLinkSend();
                    }}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs sm:text-sm w-40 sm:w-48"
                    disabled={sendingEmail}
                  />
                  <button
                    onClick={handleEmailLinkSend}
                    disabled={sendingEmail}
                    className="px-3 py-1.5 rounded-lg bg-mint-lighter text-mint-green hover:bg-mint-light font-medium transition-all duration-200 text-xs sm:text-sm disabled:opacity-50"
                  >
                    {sendingEmail ? "送信中..." : "ログイン"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 目標（トップに配置） */}
        <div className="mb-6">
          <GoalsPanel
            goals={goals}
            categories={categories}
            onAdd={handleGoalAdd}
            onDelete={handleGoalDelete}
            onUpdate={async (
              id,
              patch: {
                title?: string;
                period?: "year" | "quarter" | "month" | "custom";
                startDate?: string;
                endDate?: string;
                color?: string;
                categoryId?: string;
              },
            ) => {
              try {
                const { updateGoal } = await import("@/lib/client");
                const pp = patch as {
                  title?: string;
                  period?: "year" | "quarter" | "month" | "custom";
                  startDate?: string;
                  endDate?: string;
                  color?: string;
                  categoryId?: string;
                };
                await updateGoal(id, pp);
                // 極力局所更新
                setGoals((prev) =>
                  prev.map((g) =>
                    g.id === id
                      ? {
                          ...g,
                          title: patch.title ?? g.title,
                          color: patch.color ?? g.color,
                          categoryId: patch.categoryId ?? g.categoryId,
                          period: patch.period ?? g.period,
                          startDate: patch.startDate ?? g.startDate,
                          endDate: patch.endDate ?? g.endDate,
                        }
                      : g,
                  ),
                );
              } catch (err: unknown) {
                const e = err as { message?: string; status?: number };
                setMessage(resolveMessage(e, "目標の更新に失敗しました"));
              }
            }}
            onCategoryAdd={async (name, color) => {
              try {
                const { category } = await apiCreateCategory({ name, color });
                setCategories((prev) => [
                  ...prev,
                  {
                    id: category.id,
                    name: category.name,
                    color: category.color,
                  },
                ]);
              } catch (err: unknown) {
                const e = err as { message?: string; status?: number };
                setMessage(resolveMessage(e, "カテゴリーの追加に失敗しました"));
              }
            }}
            onCategoryUpdate={async (id, patch) => {
              try {
                const { category } = await apiUpdateCategory(id, patch);
                setCategories((prev) =>
                  prev.map((c) =>
                    c.id === id
                      ? {
                          id: category.id,
                          name: category.name,
                          color: category.color,
                        }
                      : c,
                  ),
                );
              } catch (err: unknown) {
                const e = err as { message?: string; status?: number };
                setMessage(resolveMessage(e, "カテゴリーの更新に失敗しました"));
              }
            }}
            onCategoryDelete={async (id) => {
              const before = categories;
              setCategories((prev) => prev.filter((c) => c.id !== id));
              try {
                await apiDeleteCategory(id);
              } catch (err: unknown) {
                setCategories(before);
                const e = err as { message?: string; status?: number };
                setMessage(resolveMessage(e, "カテゴリーの削除に失敗しました"));
              }
            }}
          />
        </div>

        {/* 日付ナビゲーション */}
        <DateNavigation
          currentDate={currentDate}
          onDateChange={handleDateChange}
        />

        {/* 今日のサマリ */}
        <div className="mt-2 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-white p-3">
            <div className="text-xs text-gray-500">合計</div>
            <div className="text-xl font-bold text-foreground">
              {stats.total}
            </div>
          </div>
          <div className="rounded-xl border border-pastel-blue bg-pastel-blue/10 p-3">
            <div className="text-xs text-gray-600">未着手</div>
            <div className="text-xl font-bold text-pastel-blue">
              {stats.todo}
            </div>
          </div>
          <div className="rounded-xl border border-pastel-yellow bg-pastel-yellow/20 p-3">
            <div className="text-xs text-gray-700">作業中</div>
            <div className="text-xl font-bold text-warning">{stats.doing}</div>
          </div>
          <div className="rounded-xl border border-mint-green bg-mint-light/20 p-3">
            <div className="text-xs text-gray-700">完了</div>
            <div className="text-xl font-bold text-success">{stats.done}</div>
          </div>
        </div>

        {message && (
          <div className="mt-4 mb-6 px-4 py-3 rounded-lg border border-border bg-white text-sm text-gray-700">
            {message}
          </div>
        )}

        {/* グリッドレイアウト */}
        <div
          className={`grid grid-cols-1 gap-4 lg:gap-6 ${
            showTimeline ? "lg:grid-cols-2" : ""
          }`}
        >
          {/* タスク */}
          <div className={showTimeline ? "order-2 lg:order-1" : ""}>
            <TaskList
              tasks={tasks}
              goals={goals}
              onTaskAdd={handleTaskAdd}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              canAddTomorrow={canAddTaskForPlan}
              promiseDateLabel={planDateLabel}
              planScopeLabel={isTomorrowPlan ? "明日の" : isTodayPlan ? "今日の" : ""}
              onTaskReorderIndex={async (
                draggedId: string,
                toIndex: number,
              ) => {
                const ordered = tasks
                  .slice()
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const fromIndex = ordered.findIndex((t) => t.id === draggedId);
                if (fromIndex < 0 || toIndex === fromIndex) return;
                const moved = ordered.splice(fromIndex, 1)[0];
                ordered.splice(toIndex, 0, moved);
                const reOrdered = ordered.map((t, i) => ({ ...t, order: i }));
                const before = tasks;
                setTasks(reOrdered);
                try {
                  for (let i = 0; i < reOrdered.length; i++) {
                    const t = reOrdered[i];
                    if ((before.find((b) => b.id === t.id)?.order ?? i) !== i) {
                      await apiUpdateTask(t.id, { order: i } as unknown as {
                        order: number;
                      });
                    }
                  }
                } catch {
                  await fetchPlan(ymd);
                }
              }}
              onTaskReorder={async (id, dir) => {
                // 並べ替え: orderを隣とスワップ
                const ordered = tasks
                  .slice()
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const idx = ordered.findIndex((t) => t.id === id);
                if (idx < 0) return;
                const ni = dir === "up" ? idx - 1 : idx + 1;
                if (ni < 0 || ni >= ordered.length) return;
                const tA = ordered[idx];
                const tB = ordered[ni];
                const aOrder = tA.order ?? idx;
                const bOrder = tB.order ?? ni;
                setTasks((prev) =>
                  prev.map((t) =>
                    t.id === tA.id
                      ? { ...t, order: bOrder }
                      : t.id === tB.id
                        ? { ...t, order: aOrder }
                        : t,
                  ),
                );
                try {
                  await apiUpdateTask(tA.id, { order: bOrder } as unknown as {
                    order: number;
                  });
                  await apiUpdateTask(tB.id, { order: aOrder } as unknown as {
                    order: number;
                  });
                } catch {
                  // 失敗したら再取得
                  await fetchPlan(ymd);
                }
              }}
            />
          </div>

          {/* タイムライン（必要なときだけ表示） */}
          {showTimeline && (
            <div className="order-1 lg:order-2">
              <Timeline
                tasks={tasks}
                planDate={ymd}
                blocks={blocks}
                intermissions={intermissions}
                onBlockShift={handleBlockShift}
                onBlockDelete={handleBlockDelete}
                onBlockMoveTo={handleBlockMoveTo}
                onBlockAdd={(start, end, title) =>
                  handleBlockAdd(start, end, title)
                }
              />
            </div>
          )}
        </div>

        {/* 目標はトップへ移設 */}

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
