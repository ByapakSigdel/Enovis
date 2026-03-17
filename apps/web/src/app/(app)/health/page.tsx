"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { HealthMetric } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/*  Metric type config                                                 */
/* ------------------------------------------------------------------ */

const metricTypes: {
  value: string;
  label: string;
  emoji: string;
  unit: string;
  bg: string;
}[] = [
  { value: "mood", label: "Mood", emoji: "😊", unit: "1-10", bg: "bg-amber-100" },
  { value: "sleep", label: "Sleep", emoji: "🌙", unit: "hours", bg: "bg-indigo-100" },
  { value: "steps", label: "Steps", emoji: "🏃", unit: "steps", bg: "bg-green-100" },
  { value: "water", label: "Water", emoji: "💧", unit: "glasses", bg: "bg-blue-100" },
  { value: "weight", label: "Weight", emoji: "⚖️", unit: "kg", bg: "bg-purple-100" },
  { value: "energy", label: "Energy", emoji: "⚡", unit: "1-10", bg: "bg-orange-100" },
];

function getMetricConfig(type: string) {
  return metricTypes.find((m) => m.value === type) ?? {
    value: type,
    label: type,
    emoji: "📊",
    unit: "",
    bg: "bg-sage-100",
  };
}

/* ------------------------------------------------------------------ */
/*  Chart helpers                                                      */
/* ------------------------------------------------------------------ */

const chartDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function getCurrentWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay();
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

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function HealthPage() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  /* Form state */
  const [formType, setFormType] = useState("mood");
  const [formValue, setFormValue] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const weekDates = getCurrentWeekDates();
  const today = new Date().toISOString().slice(0, 10);

  /* ---- Fetch -------------------------------------------------------- */

  const fetchMetrics = useCallback(async () => {
    const res = await api.health.list();
    if (res.success && res.data) {
      setMetrics(res.data as unknown as HealthMetric[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  /* ---- Computed ------------------------------------------------------ */

  /** Latest metric per type (most recent date) for quick cards */
  const latestByType = useMemo(() => {
    const map: Record<string, HealthMetric> = {};
    const sorted = [...metrics].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    for (const m of sorted) {
      if (!map[m.type]) map[m.type] = m;
    }
    return map;
  }, [metrics]);

  /** Chart data: values for a given type across the current week */
  function weekChartData(type: string): (number | null)[] {
    return weekDates.map((date) => {
      const found = metrics.find((m) => m.type === type && m.date.slice(0, 10) === date);
      return found ? found.value : null;
    });
  }

  /** Pick the "primary" chart type based on what has the most data */
  const primaryChartType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of metrics) {
      counts[m.type] = (counts[m.type] || 0) + 1;
    }
    let best = "mood";
    let bestCount = 0;
    for (const [type, count] of Object.entries(counts)) {
      if (count > bestCount) {
        best = type;
        bestCount = count;
      }
    }
    return best;
  }, [metrics]);

  const chartValues = weekChartData(primaryChartType);
  const maxChartVal = Math.max(1, ...chartValues.filter((v): v is number => v !== null));

  /* ---- Today's metrics ---------------------------------------------- */

  const todayMetrics = useMemo(
    () => metrics.filter((m) => m.date.slice(0, 10) === today),
    [metrics, today]
  );

  /* ---- Handlers ----------------------------------------------------- */

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(formValue);
    if (isNaN(val)) return;

    const config = getMetricConfig(formType);
    setCreating(true);
    const res = await api.health.create({
      type: formType,
      value: val,
      unit: config.unit,
      date: today,
      notes: formNotes.trim() || null,
    });

    if (res.success) {
      setFormValue("");
      setFormNotes("");
      setShowForm(false);
      await fetchMetrics();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    const res = await api.health.delete(id);
    if (res.success) {
      setMetrics((prev) => prev.filter((m) => m.id !== id));
    }
  };

  /* ---- Loading ------------------------------------------------------ */

  if (loading) {
    return (
      <div className="min-h-full bg-[#fafdf7]">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-400">
              Wellness
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-800">
              Health Insights
            </h1>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <svg className="h-8 w-8 animate-spin text-primary-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-neutral-500">Loading health data...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Render ------------------------------------------------------- */

  const primaryConfig = getMetricConfig(primaryChartType);

  return (
    <div className="min-h-full bg-[#fafdf7]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-400">
              Wellness
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-800">
              Health Insights
            </h1>
          </div>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-neutral-600 shadow-sm hover:bg-sage-50"
            aria-label="Calendar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </div>

        {/* Quick Metric Cards */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          {metricTypes.slice(0, 3).map((mt) => {
            const latest = latestByType[mt.value];
            return (
              <Card key={mt.value} variant="elevated">
                <div className="flex flex-col items-center text-center">
                  <span className="text-2xl">{mt.emoji}</span>
                  <p className="mt-2 text-lg font-bold text-neutral-800">
                    {latest ? `${latest.value}` : "--"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {mt.label}
                    {latest && mt.unit !== "1-10" ? ` ${mt.unit}` : ""}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Two-column layout */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Weekly Chart */}
          <Card variant="elevated">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-800">
                {primaryConfig.emoji} {primaryConfig.label} This Week
              </h3>
              {metrics.length > 0 && (
                <Badge variant="default">
                  {todayMetrics.length} today
                </Badge>
              )}
            </div>

            {metrics.length === 0 ? (
              <div className="flex h-40 items-center justify-center rounded-xl bg-sage-50">
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-3xl opacity-40">📊</span>
                  <p className="text-xs font-medium text-neutral-400">Log metrics to see your weekly trend</p>
                </div>
              </div>
            ) : (
              <>
                {/* Bar chart */}
                <div className="relative h-40">
                  <svg className="h-full w-full" viewBox="0 0 280 120" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[0, 1, 2, 3].map((i) => (
                      <line key={i} x1="0" y1={i * 40} x2="280" y2={i * 40} stroke="var(--color-sage-100)" strokeWidth="1" />
                    ))}
                    {/* Gradient */}
                    <defs>
                      <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary-500)" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="var(--color-primary-500)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Area + Line using actual data */}
                    {(() => {
                      const points = chartValues.map((v, i) => ({
                        x: (i * 280) / 6,
                        y: v !== null ? 120 - (v / maxChartVal) * 100 : null,
                      }));
                      const validPoints = points.filter((p): p is { x: number; y: number } => p.y !== null);
                      if (validPoints.length < 2) return null;

                      const lineStr = validPoints.map((p) => `${p.x},${p.y}`).join(" ");
                      const areaStr = `M${validPoints[0].x},${validPoints[0].y} ${validPoints.map((p) => `L${p.x},${p.y}`).join(" ")} L${validPoints[validPoints.length - 1].x},120 L${validPoints[0].x},120 Z`;

                      return (
                        <>
                          <path d={areaStr} fill="url(#healthGrad)" />
                          <polyline points={lineStr} fill="none" stroke="var(--color-primary-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          {validPoints.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke="var(--color-primary-500)" strokeWidth="2" />
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
                {/* Day labels */}
                <div className="mt-2 flex justify-between">
                  {chartDays.map((d) => (
                    <span key={d} className="text-[10px] font-medium text-neutral-400">
                      {d}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Today's Activity Summary */}
          <Card variant="default" className="bg-primary-700 text-white">
            <h3 className="mb-4 text-sm font-semibold text-white/80">
              Today&apos;s Snapshot
            </h3>
            {todayMetrics.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <span className="text-3xl">🌿</span>
                <p className="mt-3 text-sm text-white/70">
                  No metrics logged today yet.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 rounded-full border border-white/30 px-5 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  Log Now
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {todayMetrics.map((m) => {
                  const cfg = getMetricConfig(m.type);
                  return (
                    <div key={m.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{cfg.emoji}</span>
                        <span className="text-sm font-medium text-white/90">
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-white">
                        {m.value} {m.unit !== "1-10" ? m.unit : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* All Metrics (recent) */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-800">
            Recent Logs
          </h2>
          <Badge variant="default">{metrics.length}</Badge>
        </div>

        {metrics.length === 0 ? (
          <Card variant="elevated" className="overflow-hidden">
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-4xl shadow-sm">
                🌱
              </div>
              <div>
                <p className="text-base font-semibold text-neutral-800">
                  Build your health picture
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Track weight, sleep, water, steps, heart rate, and more. See trends over time and celebrate your progress.
                </p>
              </div>
              {/* Mock metric cards */}
              <div className="grid w-full grid-cols-2 gap-2">
                {[
                  { emoji: "⚖️", label: "Weight", value: "72.4 kg", trend: "↓ 0.6 kg" },
                  { emoji: "😴", label: "Sleep", value: "7.5 hrs", trend: "↑ 30 min" },
                  { emoji: "💧", label: "Water", value: "2.1 L", trend: "On track" },
                  { emoji: "👣", label: "Steps", value: "8,432", trend: "↑ 1,200" },
                ].map((m, i) => (
                  <div key={i} className="flex flex-col gap-1 rounded-xl bg-sage-50 p-3 text-left opacity-75">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{m.emoji}</span>
                      <span className="text-[11px] font-medium text-neutral-500">{m.label}</span>
                    </div>
                    <p className="text-sm font-bold text-neutral-800">{m.value}</p>
                    <p className="text-[10px] text-primary-500">{m.trend}</p>
                  </div>
                ))}
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => setShowForm(true)}
              >
                Log First Metric
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...metrics]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 12)
              .map((m) => {
                const cfg = getMetricConfig(m.type);
                return (
                  <Card key={m.id} variant="elevated" className="group relative">
                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      aria-label="Delete metric"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>

                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl", cfg.bg)}>
                        {cfg.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-neutral-800">
                            {cfg.label}
                          </h3>
                          <span className="text-sm font-bold text-primary-600">
                            {m.value} {m.unit !== "1-10" ? m.unit : ""}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">
                          {new Date(m.date).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                          {m.notes && (
                            <span className="ml-1.5 text-neutral-300">
                              &middot; {m.notes}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        )}
      </div>

      {/* Create Metric Modal */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
            <h2 className="mb-4 text-lg font-bold text-neutral-800">
              Log Health Metric
            </h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {/* Metric type selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {metricTypes.map((mt) => (
                    <button
                      key={mt.value}
                      type="button"
                      onClick={() => setFormType(mt.value)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                        formType === mt.value
                          ? "bg-primary-500 text-white"
                          : "bg-sage-100 text-neutral-600 hover:bg-sage-200"
                      )}
                    >
                      <span>{mt.emoji}</span>
                      {mt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Value
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder={getMetricConfig(formType).unit}
                    className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={getMetricConfig(formType).unit}
                    disabled
                    className="w-full rounded-xl border border-sage-200 bg-sage-100 px-4 py-2.5 text-sm text-neutral-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
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
                  disabled={!formValue}
                >
                  Log Metric
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Floating Add Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-600 active:scale-95"
          aria-label="Log health metric"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}
    </div>
  );
}
