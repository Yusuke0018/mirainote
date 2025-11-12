"use client";

import { DateTime } from "luxon";

interface DateNavigationProps {
  currentDate: DateTime;
  onDateChange: (date: DateTime) => void;
}

export default function DateNavigation({
  currentDate,
  onDateChange,
}: DateNavigationProps) {
  const handlePrevDay = () => {
    onDateChange(currentDate.minus({ days: 1 }));
  };

  const handleNextDay = () => {
    onDateChange(currentDate.plus({ days: 1 }));
  };

  const handleToday = () => {
    onDateChange(DateTime.now());
  };

  const isToday = currentDate.hasSame(DateTime.now(), "day");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-6">
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevDay}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-mint-lighter hover:bg-mint-light transition-all duration-200 group"
          aria-label="前の日"
        >
          <svg
            className="w-5 h-5 text-mint-green"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="flex flex-col items-center gap-2">
          <div className="text-3xl font-bold bg-gradient-to-r from-mint-green to-mint-light bg-clip-text text-transparent">
            {currentDate.toFormat("yyyy年M月d日")}
          </div>
          <div className="text-sm text-gray-500 font-medium">
            {currentDate.toFormat("cccc", { locale: "ja" })}
          </div>
          {!isToday && (
            <button
              onClick={handleToday}
              className="mt-1 px-4 py-1.5 rounded-lg bg-pastel-pink/30 hover:bg-pastel-pink/50 text-sm font-medium text-foreground transition-all duration-200"
            >
              今日に戻る
            </button>
          )}
        </div>

        <button
          onClick={handleNextDay}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-mint-lighter hover:bg-mint-light transition-all duration-200 group"
          aria-label="次の日"
        >
          <svg
            className="w-5 h-5 text-mint-green"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* 装飾的な要素 */}
      <div className="mt-6 flex gap-2 justify-center">
        <div className="w-2 h-2 rounded-full bg-pastel-pink"></div>
        <div className="w-2 h-2 rounded-full bg-mint-green"></div>
        <div className="w-2 h-2 rounded-full bg-pastel-blue"></div>
        <div className="w-2 h-2 rounded-full bg-pastel-lavender"></div>
        <div className="w-2 h-2 rounded-full bg-pastel-peach"></div>
      </div>
    </div>
  );
}
