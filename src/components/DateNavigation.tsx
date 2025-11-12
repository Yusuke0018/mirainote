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
  const tomorrow = DateTime.now().startOf("day").plus({ days: 1 });
  const disableNext =
    currentDate.startOf("day").toMillis() >= tomorrow.toMillis();

  const handlePrevDay = () => {
    onDateChange(currentDate.minus({ days: 1 }));
  };

  const handleNextDay = () => {
    if (disableNext) return;
    onDateChange(currentDate.plus({ days: 1 }));
  };

  const handleToday = () => {
    onDateChange(DateTime.now());
  };

  const isToday = currentDate.hasSame(DateTime.now(), "day");

  return (
    <div className="bg-gradient-to-b from-white to-pastel-mist rounded-2xl shadow-sm border border-border p-6 mb-6">
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevDay}
          className="flex items-center justify-center w-11 h-11 rounded-xl bg-ink text-white hover:bg-charcoal transition-all duration-200 shadow-sm"
          aria-label="前の日"
        >
          <svg
            className="w-5 h-5 text-white"
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

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-ink via-charcoal to-mint-green bg-clip-text text-transparent">
            {currentDate.toFormat("yyyy年M月d日")}
          </div>
          <div className="text-sm text-gray-600 font-medium tracking-wide uppercase">
            {currentDate.toFormat("cccc", { locale: "ja" })}
          </div>
          {!isToday && (
            <button
              onClick={handleToday}
              className="mt-1 px-5 py-1.5 rounded-full bg-charcoal text-white text-sm font-semibold tracking-wide hover:bg-ink transition-all duration-200"
            >
              今日に戻る
            </button>
          )}
        </div>

        <button
          onClick={handleNextDay}
          className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 shadow-sm ${
            disableNext
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-ink text-white hover:bg-charcoal"
          }`}
          aria-label="次の日"
          disabled={disableNext}
        >
          <svg
            className="w-5 h-5"
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
        <div className="w-2 h-2 rounded-full bg-ink"></div>
        <div className="w-2 h-2 rounded-full bg-pastel-pink"></div>
        <div className="w-2 h-2 rounded-full bg-pastel-blue"></div>
        <div className="w-2 h-2 rounded-full bg-pastel-lavender"></div>
        <div className="w-2 h-2 rounded-full bg-pastel-peach"></div>
        <div className="w-2 h-2 rounded-full bg-mint-green"></div>
      </div>
    </div>
  );
}
