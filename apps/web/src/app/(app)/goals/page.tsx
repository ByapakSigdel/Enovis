"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Goal, Milestone } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import CircularProgress from "@/components/ui/CircularProgress";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type FilterTab = "active" | "completed" | "paused";

const tabs: { value: FilterTab; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
];

const categoryIcons: Record<string, { icon: string; bg: string }> = {
  health: { icon: "🧘", bg: "bg-purple-100" },
  fitness: { icon: "🏃", bg: "bg-orange-100" },
  education: { icon: "📚", bg: "bg-amber-100" },
  finance: { icon: "💰", bg: "bg-emerald-100" },
  career: { icon: "💼", bg: "bg-blue-100" },
  personal: { icon: "🌱", bg: "bg-green-100" },
  default: { icon: "🎯", bg: "bg-sage-100" },
};

function getCategoryStyle(category?: string | null) {
  if (category && category in categoryIcons) return categoryIcons[category];
  return categoryIcons.default;
}

/** Safely parse milestones - handles string, array, or missing values */
function parseMilestones(raw: unknown): Milestone[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Milestone[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function GoalsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FilterTab>("active");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [formCategory, setFormCategory] = useState("");

  const fetchGoals = useCallback(async () => {
    try {
      setError(null);
      const res = await api.goals.list();
      if (res.success && res.data) {
        const normalized = (res.data as unknown as Goal[]).map((g) => ({
          ...g,
          milestones: parseMilestones(g.milestones),
          progress: typeof g.progress === "number" ? g.progress : 0,
          status: g.status || "active",
        }));
        setGoals(normalized);
      } else {
        setError(res.error || "Failed to load goals.");
      }
    } catch {
      setError("Network error. Could not fetch goals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // ---- Derived data ----

  const filteredGoals = goals.filter((g) => {
    if (activeTab === "active") return g.status !== "completed" && g.status !== "paused";
    return g.status === activeTab;
  });

  const totalMilestones = goals.reduce((sum, g) => sum + g.milestones.length, 0);
  const completedMilestones = goals.reduce(
    (sum, g) => sum + g.milestones.filter((m) => m.completed).length,
    0
  );
  const milestonePercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const overviewMessage =
    milestonePercent >= 75
      ? "You're doing great!"
      : milestonePercent >= 40
        ? "Good progress, keep it up!"
        : totalMilestones === 0
          ? "Set milestones to track your progress."
          : "Keep pushing, you'll get there!";

  // ---- Handlers ----

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formTargetDate) return;

    setCreating(true);
    try {
      const res = await api.goals.create({
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        targetDate: formTargetDate,
        category: formCategory.trim() || null,
        progress: 0,
        milestones: [],
        status: "active",
      });

      if (res.success) {
        setFormTitle("");
        setFormDescription("");
        setFormTargetDate("");
        setFormCategory("");
        setShowForm(false);
        await fetchGoals();
      } else {
        setError(res.error || "Failed to create goal.");
      }
    } catch {
      setError("Network error. Could not create goal.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await api.goals.delete(id);
      if (res.success) {
        setGoals((prev) => prev.filter((g) => g.id !== id));
      } else {
        setError(res.error || "Failed to delete goal.");
      }
    } catch {
      setError("Network error. Could not delete goal.");
    } finally {
      setDeletingId(null);
    }
  }

  // ---- Render ----

  const userName = user?.name || "User";

  return (
    <div className="min-h-full bg-[#fafdf7]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-400">
              PRMS Wellness
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-800">
              My Goals
            </h1>
          </div>
          <Avatar name={userName} size="lg" />
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                activeTab === tab.value
                  ? "bg-primary-500 text-white shadow-sm"
                  : "bg-white text-neutral-600 hover:bg-sage-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Weekly Overview */}
        <Card className="mb-8 bg-primary-50/60" variant="default">
          <div className="flex items-center gap-6">
            <CircularProgress value={milestonePercent} size={100} strokeWidth={8} />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-primary-700">
                {overviewMessage}
              </h3>
              <p className="mt-1 text-sm text-primary-600/80">
                {completedMilestones} of {totalMilestones} milestones achieved.
              </p>
            </div>
          </div>
        </Card>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-800">
            {activeTab === "active"
              ? "Current Priorities"
              : activeTab === "completed"
                ? "Completed Goals"
                : "Paused Goals"}
          </h2>
          <Badge variant="default">{filteredGoals.length}</Badge>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
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
            <p className="mt-3 text-sm text-neutral-500">Loading goals...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredGoals.length === 0 && (
          <Card variant="outlined" className="py-12 text-center">
            <p className="text-3xl">🎯</p>
            <p className="mt-2 font-medium text-neutral-600">
              No {activeTab} goals yet.
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              {activeTab === "active"
                ? "Tap the + button to create your first goal."
                : `You don't have any ${activeTab} goals.`}
            </p>
          </Card>
        )}

        {/* Goal Cards Grid */}
        {!loading && filteredGoals.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredGoals.map((goal) => {
              const { icon, bg } = getCategoryStyle(goal.category);
              const milestoneDone = goal.milestones.filter((m) => m.completed).length;
              const milestoneTotal = goal.milestones.length;
              const isCompleted = goal.status === "completed";
              const isDeleting = deletingId === goal.id;

              return (
                <Card key={goal.id} variant="elevated" className="group relative">
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(goal.id)}
                    disabled={isDeleting}
                    className={cn(
                      "absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100",
                      isDeleting && "opacity-100"
                    )}
                    aria-label="Delete goal"
                  >
                    {isDeleting ? (
                      <svg
                        className="h-4 w-4 animate-spin"
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
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    )}
                  </button>

                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl",
                        bg
                      )}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between pr-8">
                        <h3 className="font-semibold text-neutral-800">
                          {goal.title}
                        </h3>
                        {isCompleted ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white">
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
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-primary-600">
                            {goal.progress}%
                          </span>
                        )}
                      </div>
                      {goal.description && (
                        <p className="mt-0.5 text-sm text-neutral-500">
                          {goal.description}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-3">
                        <ProgressBar
                          value={goal.progress}
                          size="sm"
                          className="flex-1"
                        />
                        {milestoneTotal > 0 && (
                          <span className="shrink-0 text-xs font-medium text-neutral-500">
                            {milestoneDone}/{milestoneTotal}
                          </span>
                        )}
                      </div>

                      {/* Target date & status */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-neutral-400">
                          Target:{" "}
                          {new Date(goal.targetDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {goal.status === "paused" && (
                          <Badge variant="warning">Paused</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Goal Modal Overlay */}
      {showForm && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        />
      )}

      {/* Create Goal Form */}
      {showForm && (
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <h2 className="mb-4 text-lg font-bold text-neutral-800">
            New Goal
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Input
              label="Title"
              placeholder="What do you want to achieve?"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">
                Description
              </label>
              <textarea
                placeholder="Describe your goal (optional)"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <Input
              label="Target Date"
              type="date"
              value={formTargetDate}
              onChange={(e) => setFormTargetDate(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">Select category (optional)</option>
                <option value="health">Health</option>
                <option value="fitness">Fitness</option>
                <option value="education">Education</option>
                <option value="finance">Finance</option>
                <option value="career">Career</option>
                <option value="personal">Personal</option>
              </select>
            </div>
            <div className="mt-2 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                loading={creating}
                disabled={!formTitle.trim() || !formTargetDate}
              >
                Create Goal
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Add Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-600 active:scale-95"
          aria-label="Create new goal"
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
      )}
    </div>
  );
}
