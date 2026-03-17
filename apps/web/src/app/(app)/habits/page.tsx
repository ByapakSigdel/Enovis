"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { Habit, HabitCompletion } from "@/types";

const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];

/** Return the Monday–Sunday date strings (YYYY-MM-DD) for the current week */
function getCurrentWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Build the week status array for a habit given its completions */
function buildWeekStatus(
  weekDates: string[],
  completions: HabitCompletion[]
): (boolean | null)[] {
  const today = todayString();
  const completedSet = new Set(
    completions.filter((c) => c.completed).map((c) => c.date.slice(0, 10))
  );

  return weekDates.map((date) => {
    if (completedSet.has(date)) return true;
    if (date === today) return null; // today, not yet completed
    if (date > today) return false; // future
    return false; // past, not completed
  });
}

/** Default icon/bg based on category or fallback */
function habitIcon(habit: Habit): { icon: string; bg: string } {
  if (habit.icon) {
    const bgMap: Record<string, string> = {
      "🧘": "bg-purple-100",
      "💧": "bg-blue-100",
      "📖": "bg-amber-100",
      "🚶": "bg-green-100",
      "🏃": "bg-green-100",
      "💪": "bg-red-100",
      "🎯": "bg-indigo-100",
    };
    return { icon: habit.icon, bg: bgMap[habit.icon] || "bg-sage-100" };
  }
  const colorMap: Record<string, string> = {
    green: "bg-green-100",
    blue: "bg-blue-100",
    purple: "bg-purple-100",
    red: "bg-red-100",
    amber: "bg-amber-100",
    orange: "bg-orange-100",
  };
  const bg = (habit.color && colorMap[habit.color]) || "bg-primary-100";
  return { icon: "✦", bg };
}

/* ------------------------------------------------------------------ */

function DayCheck({
  status,
  onClick,
}: {
  status: boolean | null;
  onClick?: () => void;
}) {
  if (status === true) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white transition-colors hover:bg-primary-600"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    );
  }
  if (status === null) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-primary-300 transition-colors hover:border-primary-500 hover:bg-primary-50"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-sage-200 transition-colors hover:border-primary-300 hover:bg-sage-50"
    />
  );
}

/* ------------------------------------------------------------------ */

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completionsMap, setCompletionsMap] = useState<
    Record<string, HabitCompletion[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    frequency: "daily",
    target: 1,
  });
  const [creating, setCreating] = useState(false);

  const weekDates = getCurrentWeekDates();
  const today = todayString();

  /* ---- Fetch habits ---------------------------------------------- */
  const fetchHabits = useCallback(async () => {
    const res = await api.habits.list();
    if (res.success && res.data) {
      const fetched = res.data as unknown as Habit[];
      setHabits(fetched);
      return fetched;
    }
    return [];
  }, []);

  /* ---- Fetch completions for all habits -------------------------- */
  const fetchAllCompletions = useCallback(async (habitList: Habit[]) => {
    const map: Record<string, HabitCompletion[]> = {};
    await Promise.all(
      habitList.map(async (h) => {
        const res = await api.habits.completions(h.id);
        if (res.success && res.data) {
          map[h.id] = res.data as unknown as HabitCompletion[];
        } else {
          map[h.id] = [];
        }
      })
    );
    setCompletionsMap(map);
  }, []);

  /* ---- Initial load ---------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const fetched = await fetchHabits();
      if (!cancelled && fetched.length > 0) {
        await fetchAllCompletions(fetched);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchHabits, fetchAllCompletions]);

  /* ---- Toggle completion ----------------------------------------- */
  const toggleCompletion = async (habitId: string, dateStr: string) => {
    const existing = (completionsMap[habitId] || []).find(
      (c) => c.date.slice(0, 10) === dateStr
    );
    const isCurrentlyCompleted = existing?.completed ?? false;

    // Optimistic update
    setCompletionsMap((prev) => {
      const list = prev[habitId] || [];
      if (isCurrentlyCompleted) {
        return {
          ...prev,
          [habitId]: list.map((c) =>
            c.date.slice(0, 10) === dateStr ? { ...c, completed: false } : c
          ),
        };
      }
      if (existing) {
        return {
          ...prev,
          [habitId]: list.map((c) =>
            c.date.slice(0, 10) === dateStr ? { ...c, completed: true } : c
          ),
        };
      }
      return {
        ...prev,
        [habitId]: [
          ...list,
          { habitId, date: dateStr, completed: true, value: null, note: null },
        ],
      };
    });

    // API call
    await api.habits.complete(habitId, {
      date: dateStr,
      completed: !isCurrentlyCompleted,
      value: null,
    });

    // Refetch completions for accuracy
    const res = await api.habits.completions(habitId);
    if (res.success && res.data) {
      setCompletionsMap((prev) => ({
        ...prev,
        [habitId]: res.data as unknown as HabitCompletion[],
      }));
    }

    // Refetch habits to get updated streak counts
    const habitsRes = await api.habits.list();
    if (habitsRes.success && habitsRes.data) {
      setHabits(habitsRes.data as unknown as Habit[]);
    }
  };

  /* ---- Create habit ---------------------------------------------- */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setCreating(true);
    const res = await api.habits.create({
      name: formData.name.trim(),
      frequency: formData.frequency,
      target: formData.target,
      trackingType: "checkbox",
    });
    if (res.success) {
      const fetched = await fetchHabits();
      await fetchAllCompletions(fetched);
      setFormData({ name: "", frequency: "daily", target: 1 });
      setShowForm(false);
    }
    setCreating(false);
  };

  /* ---- Computed stats -------------------------------------------- */
  // perfectDays: days in current week where ALL habits were completed
  const perfectDays = (() => {
    if (habits.length === 0) return 0;
    let count = 0;
    for (const date of weekDates) {
      if (date > today) continue;
      const allDone = habits.every((h) => {
        const comps = completionsMap[h.id] || [];
        return comps.some(
          (c) => c.date.slice(0, 10) === date && c.completed
        );
      });
      if (allDone) count++;
    }
    return count;
  })();

  // bestStreak: max currentStreak across all habits
  const bestStreak =
    habits.length > 0
      ? Math.max(...habits.map((h) => h.currentStreak ?? 0))
      : 0;

  /* ---- Loading state --------------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-full bg-[#fafdf7]">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-400">
              Wellness Tracker
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-800">
              My Habits
            </h1>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <svg
              className="h-8 w-8 animate-spin text-primary-500"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-neutral-500">Loading habits...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Render ---------------------------------------------------- */
  return (
    <div className="min-h-full bg-[#fafdf7]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-400">
              Wellness Tracker
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-800">
              My Habits
            </h1>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-neutral-600 shadow-sm hover:bg-sage-50">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-2">
          <Card variant="elevated">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-lg">
                ⭐
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-800">
                  {perfectDays}
                </p>
                <p className="text-sm text-neutral-500">Perfect Days</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-lg">
                🔥
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-800">
                  {bestStreak}
                </p>
                <p className="text-sm text-neutral-500">Best Streak</p>
              </div>
            </div>
          </Card>
        </div>

        {/* This Week's Focus */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-800">
            This Week&apos;s Focus
          </h2>
          <button className="text-sm font-medium text-primary-500 hover:text-primary-600">
            View All
          </button>
        </div>

        {/* Habit Cards Grid */}
        {habits.length === 0 ? (
          <Card variant="elevated" className="overflow-hidden">
            {/* Hero */}
            <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-4xl shadow-sm">
                🌱
              </div>
              <h3 className="text-xl font-bold text-neutral-800">
                Build Lasting Habits
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
                Small daily actions compound into big results. Track your habits, build streaks, and watch your consistency grow week by week.
              </p>
            </div>

            {/* Example habit previews */}
            <div className="border-t border-sage-100 px-6 py-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Popular habits to track
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: "🧘", label: "Meditation", bg: "bg-purple-100" },
                  { icon: "💧", label: "Drink Water", bg: "bg-blue-100" },
                  { icon: "📖", label: "Daily Reading", bg: "bg-amber-100" },
                  { icon: "🏃", label: "Exercise", bg: "bg-green-100" },
                ].map((h) => (
                  <div key={h.label} className="flex items-center gap-2.5 rounded-xl bg-sage-50 px-3 py-2.5">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base", h.bg)}>
                      {h.icon}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-neutral-700">{h.label}</p>
                      <div className="mt-0.5 flex gap-0.5">
                        {[true, true, true, false, false, false, false].map((done, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-2 w-2 rounded-full",
                              done ? "bg-primary-500" : "bg-sage-200"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Streak teaser */}
            <div className="mx-6 mb-5 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3">
              <span className="text-2xl">🔥</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Build your streak</p>
                <p className="text-xs text-amber-600">Check in daily and watch your streak counter climb</p>
              </div>
            </div>

            {/* CTA */}
            <div className="px-6 pb-7">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => setShowForm(true)}
              >
                Create Your First Habit
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {habits.map((habit) => {
              const completions = completionsMap[habit.id] || [];
              const weekStatus = buildWeekStatus(weekDates, completions);
              const completedDays = weekStatus.filter(
                (s) => s === true
              ).length;
              const totalDays = 7;
              const { icon, bg } = habitIcon(habit);

              return (
                <Card key={habit.id} variant="elevated">
                  {/* Top row: icon, name, category, completion */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl",
                          bg
                        )}
                      >
                        {icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-800">
                          {habit.name}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          {habit.target > 1
                            ? `${habit.target}x`
                            : habit.frequency}
                          {habit.category
                            ? ` \u00B7 ${habit.category}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        completedDays === totalDays ? "default" : "custom"
                      }
                      className={
                        completedDays === totalDays
                          ? undefined
                          : "bg-sage-100 text-neutral-600"
                      }
                    >
                      {completedDays}/{totalDays}
                    </Badge>
                  </div>

                  {/* Day-of-week checkmarks */}
                  <div className="flex items-center justify-between">
                    {daysOfWeek.map((day, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <span className="text-xs font-medium text-neutral-400">
                          {day}
                        </span>
                        <DayCheck
                          status={weekStatus[i]}
                          onClick={() =>
                            toggleCompletion(habit.id, weekDates[i])
                          }
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Habit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowForm(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-800">
                New Habit
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-sage-100 hover:text-neutral-600"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Morning Meditation"
                  className="w-full rounded-xl border border-sage-200 bg-white px-4 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        frequency: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-sage-200 bg-white px-4 py-2.5 text-sm text-neutral-800 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Target
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.target}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        target: parseInt(e.target.value, 10) || 1,
                      }))
                    }
                    className="w-full rounded-xl border border-sage-200 bg-white px-4 py-2.5 text-sm text-neutral-800 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>
              <div className="mt-1 flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={creating}
                  className="flex-1"
                >
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-600 active:scale-95"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
