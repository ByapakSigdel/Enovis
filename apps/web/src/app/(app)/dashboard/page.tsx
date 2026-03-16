"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, getGreeting, formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Task, Habit } from "@/types";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import MoodSelector, { type Mood } from "@/components/ui/MoodSelector";

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const greeting = getGreeting();
  const today = formatDate(new Date(), "EEEE, MMM dd");
  const displayName = user?.name ?? "User";
  const fullName = user ? user.name : "User";

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [tasksRes, habitsRes] = await Promise.all([
        api.tasks.list(),
        api.habits.list(),
      ]);
      if (tasksRes.success && tasksRes.data) {
        setTasks(tasksRes.data as unknown as Task[]);
      }
      if (habitsRes.success && habitsRes.data) {
        setHabits(habitsRes.data as unknown as Habit[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const toggleTask = useCallback(async (id: string, completed: boolean) => {
    const res = await api.tasks.update(id, { completed: !completed });
    if (res.success) {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      );
    }
  }, []);

  const incompleteTasks = tasks.filter((t) => !t.completed).slice(0, 5);
  const topHabits = habits.slice(0, 2);

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Two-column grid for web */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column (spans 2) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Greeting Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">{today}</p>
              <h1 className="text-2xl font-bold text-neutral-900">
                {greeting}, {displayName}
              </h1>
            </div>
            <Avatar name={fullName} size="lg" />
          </div>

          {/* Mood Selector */}
          <Card>
            <h2 className="mb-4 text-base font-semibold text-neutral-800">
              How are you feeling?
            </h2>
            <MoodSelector value={selectedMood} onChange={setSelectedMood} />
          </Card>

          {/* Habit Streaks */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-800">
                Habit Streaks
              </h2>
              <button className="text-sm font-medium text-primary-500 hover:text-primary-600">
                See All
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-neutral-400">Loading habits...</p>
            ) : topHabits.length === 0 ? (
              <Card>
                <p className="py-4 text-center text-sm text-neutral-500">
                  No habits tracked yet. Create one to get started.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {topHabits.map((habit) => {
                  const streakPercent = habit.target > 0
                    ? Math.min(100, (habit.currentStreak / habit.target) * 100)
                    : 0;
                  return (
                    <Card key={habit.id} variant="elevated">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{habit.icon || "🎯"}</span>
                          <div>
                            <p className="font-semibold text-neutral-800">
                              {habit.name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {habit.frequency}
                            </p>
                          </div>
                        </div>
                        <Badge>
                          🔥 {habit.currentStreak} days
                        </Badge>
                      </div>
                      <ProgressBar value={streakPercent} color={habit.color || "#4a7c59"} />
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Tasks */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-800">
                Quick Tasks
              </h2>
              <span className="text-sm text-neutral-500">
                {incompleteTasks.length} remaining
              </span>
            </div>
            {loading ? (
              <p className="text-sm text-neutral-400">Loading tasks...</p>
            ) : incompleteTasks.length === 0 ? (
              <Card>
                <p className="py-4 text-center text-sm text-neutral-500">
                  All caught up! No pending tasks.
                </p>
              </Card>
            ) : (
              <Card>
                <div className="flex flex-col divide-y divide-sage-100">
                  {incompleteTasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex cursor-pointer items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id, task.completed)}
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          task.completed
                            ? "border-primary-500 bg-primary-500"
                            : "border-neutral-300 hover:border-primary-400"
                        )}
                      >
                        {task.completed && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                      <span
                        className={cn(
                          "text-sm",
                          task.completed
                            ? "text-neutral-400 line-through"
                            : "text-neutral-700"
                        )}
                      >
                        {task.title}
                      </span>
                    </label>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Quick Stats */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-800">
              Quick Stats
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Card variant="outlined" className="text-center">
                <span className="text-2xl">📋</span>
                <p className="mt-1 text-lg font-bold text-neutral-800">
                  {tasks.filter((t) => t.completed).length}
                </p>
                <p className="text-xs text-neutral-500">/ {tasks.length} tasks</p>
              </Card>
              <Card variant="outlined" className="text-center">
                <span className="text-2xl">🎯</span>
                <p className="mt-1 text-lg font-bold text-neutral-800">
                  {habits.length}
                </p>
                <p className="text-xs text-neutral-500">habits tracked</p>
              </Card>
              <Card variant="outlined" className="text-center">
                <span className="text-2xl">🔥</span>
                <p className="mt-1 text-lg font-bold text-neutral-800">
                  {habits.length > 0 ? Math.max(...habits.map((h) => h.currentStreak)) : 0}
                </p>
                <p className="text-xs text-neutral-500">best streak</p>
              </Card>
              <Card variant="outlined" className="text-center">
                <span className="text-2xl">
                  {selectedMood === "great" ? "😄" : selectedMood === "good" ? "🙂" : selectedMood === "okay" ? "😐" : selectedMood === "calm" ? "😌" : selectedMood === "stressed" ? "😣" : "🙂"}
                </span>
                <p className="mt-1 text-lg font-bold text-neutral-800">
                  {selectedMood ? selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1) : "—"}
                </p>
                <p className="text-xs text-neutral-500">Mood</p>
              </Card>
            </div>
          </div>

          {/* Wellness Tip */}
          <Card
            variant="outlined"
            className="!bg-primary-50 !border-primary-100"
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-600">
              Daily Tip
            </p>
            <p className="text-sm text-primary-800">
              Take 5 minutes to practice deep breathing. It reduces cortisol and
              improves focus throughout the day.
            </p>
          </Card>
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 active:bg-primary-700"
        aria-label="Add new item"
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
