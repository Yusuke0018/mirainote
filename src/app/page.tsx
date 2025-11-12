"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import DateNavigation from "@/components/DateNavigation";
import TaskList from "@/components/TaskList";
import Timeline from "@/components/Timeline";

export default function Home() {
  type UITask = {
    id: string;
    title: string;
    state: "todo" | "doing" | "done";
    estimateMinutes?: number;
  };
  const [currentDate, setCurrentDate] = useState(DateTime.now());
  const [tasks, setTasks] = useState<UITask[]>([
    {
      id: "1",
      title: "サンプルタスク1",
      state: "todo" as const,
      estimateMinutes: 30,
    },
    {
      id: "2",
      title: "サンプルタスク2",
      state: "doing" as const,
      estimateMinutes: 60,
    },
  ]);

  const [blocks, setBlocks] = useState([
    {
      id: "1",
      title: "朝の作業",
      start: DateTime.now().startOf("day").plus({ hours: 9 }).toMillis(),
      end: DateTime.now().startOf("day").plus({ hours: 12 }).toMillis(),
    },
  ]);

  const [intermissions] = useState([
    {
      id: "1",
      start: DateTime.now().startOf("day").plus({ hours: 12 }).toMillis(),
      end: DateTime.now().startOf("day").plus({ hours: 13 }).toMillis(),
    },
  ]);

  const handleDateChange = (date: DateTime) => {
    setCurrentDate(date);
    // TODO: API経由で新しい日付のデータを取得
  };

  const handleTaskAdd = (title: string) => {
    const newTask: UITask = {
      id: Date.now().toString(),
      title,
      state: "todo" as const,
    };
    setTasks([...tasks, newTask]);
    // TODO: API経由でタスクを作成
  };

  const handleTaskUpdate = (id: string, updates: Partial<UITask>) => {
    setTasks(
      tasks.map((task) => (task.id === id ? { ...task, ...updates } : task)),
    );
    // TODO: API経由でタスクを更新
  };

  const handleTaskDelete = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
    // TODO: API経由でタスクを削除
  };

  const handleBlockAdd = (start: number, end: number, title?: string) => {
    const newBlock = {
      id: Date.now().toString(),
      title: title || "新しいブロック",
      start,
      end,
    };
    setBlocks([...blocks, newBlock]);
    // TODO: API経由でブロックを作成
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-mint-lighter/20">
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
              <button className="px-4 py-2 rounded-lg bg-mint-lighter text-mint-green hover:bg-mint-light font-medium transition-all duration-200">
                設定
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

        {/* グリッドレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* タスクリスト */}
          <div className="lg:col-span-1">
            <TaskList
              tasks={tasks}
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
            />
          </div>
        </div>

        {/* フッター */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>みらいノート - あなたの未来を計画する</p>
        </footer>
      </main>
    </div>
  );
}
