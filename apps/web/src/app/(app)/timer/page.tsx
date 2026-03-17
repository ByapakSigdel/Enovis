"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { FocusSession } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/*  Timer ring dimensions                                              */
/* ------------------------------------------------------------------ */

const SIZE = 280;
const STROKE_WIDTH = 8;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/* ------------------------------------------------------------------ */
/*  Preset durations (minutes)                                         */
/* ------------------------------------------------------------------ */

const presets = [
  { label: "15 min", minutes: 15 },
  { label: "25 min", minutes: 25 },
  { label: "45 min", minutes: 45 },
  { label: "60 min", minutes: 60 },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function TimerPage() {
  /* Session data from API */
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);

  /* Active timer state */
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds elapsed
  const [status, setStatus] = useState<"idle" | "running" | "paused" | "break" | "completed">("idle");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Setup form */
  const [taskName, setTaskName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [showSetup, setShowSetup] = useState(false);

  /* ---- Fetch sessions ----------------------------------------------- */

  const fetchSessions = useCallback(async () => {
    const res = await api.focusSessions.list();
    if (res.success && res.data) {
      setSessions(res.data as unknown as FocusSession[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  /* ---- Timer tick --------------------------------------------------- */

  useEffect(() => {
    if (status === "running") {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  /* ---- Auto-complete when elapsed reaches duration ------------------ */

  useEffect(() => {
    if (activeSession && elapsed >= activeSession.duration && status === "running") {
      handleComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, activeSession, status]);

  /* ---- Timer display values ----------------------------------------- */

  const duration = activeSession ? activeSession.duration : durationMinutes * 60;
  const remaining = Math.max(0, duration - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;
  const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  /* ---- Handlers ----------------------------------------------------- */

  const handleStart = async () => {
    const res = await api.focusSessions.create({
      task: taskName.trim() || null,
      duration: durationMinutes * 60,
      elapsed: 0,
      status: "running",
    });

    if (res.success && res.data) {
      const session = res.data as unknown as FocusSession;
      setActiveSession(session);
      setElapsed(0);
      setStatus("running");
      setShowSetup(false);
    }
  };

  const handlePause = async () => {
    setStatus("paused");
    if (activeSession) {
      await api.focusSessions.update(activeSession.id, {
        elapsed,
        status: "paused",
      });
    }
  };

  const handleResume = async () => {
    setStatus("running");
    if (activeSession) {
      await api.focusSessions.update(activeSession.id, {
        elapsed,
        status: "running",
      });
    }
  };

  const handleComplete = async () => {
    setStatus("completed");
    if (activeSession) {
      await api.focusSessions.update(activeSession.id, {
        elapsed,
        status: "completed",
      });
      await fetchSessions();
    }
  };

  const handleStop = async () => {
    if (activeSession) {
      await api.focusSessions.update(activeSession.id, {
        elapsed,
        status: "completed",
      });
    }
    setActiveSession(null);
    setElapsed(0);
    setStatus("idle");
    setTaskName("");
    await fetchSessions();
  };

  const handleReset = () => {
    setActiveSession(null);
    setElapsed(0);
    setStatus("idle");
    setTaskName("");
  };

  const handleDeleteSession = async (id: string) => {
    const res = await api.focusSessions.delete(id);
    if (res.success) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  /* ---- Stats -------------------------------------------------------- */

  const todayString = new Date().toISOString().slice(0, 10);

  const todaySessions = useMemo(
    () =>
      sessions.filter(
        (s) =>
          s.status === "completed" &&
          s.startedAt &&
          s.startedAt.slice(0, 10) === todayString
      ),
    [sessions, todayString]
  );

  const todayMinutes = useMemo(
    () => Math.round(todaySessions.reduce((sum, s) => sum + s.elapsed, 0) / 60),
    [todaySessions]
  );

  const totalSessions = sessions.filter((s) => s.status === "completed").length;

  /* ---- Status label ------------------------------------------------- */

  const statusLabel =
    status === "running"
      ? "Focus"
      : status === "paused"
        ? "Paused"
        : status === "completed"
          ? "Done!"
          : "Ready";

  /* ---- Loading ------------------------------------------------------ */

  if (loading) {
    return (
      <div className="min-h-full bg-[#fafdf7]">
        <div className="mx-auto max-w-lg px-6 py-8">
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <svg className="h-8 w-8 animate-spin text-primary-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-neutral-500">Loading focus sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Render ------------------------------------------------------- */

  return (
    <div className="min-h-full bg-[#fafdf7]">
      <div className="mx-auto max-w-lg px-6 py-8">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-800">
            Focus Session
          </h1>
          <div className="flex items-center gap-2">
            {todayMinutes > 0 && (
              <Badge variant="default">{todayMinutes}m today</Badge>
            )}
            <button
              onClick={() => setShowSetup(!showSetup)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-600 hover:bg-sage-100"
              aria-label="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Timer Circle */}
        <div className="mb-10 flex flex-col items-center">
          <div
            className="relative inline-flex items-center justify-center"
            style={{ width: SIZE, height: SIZE }}
          >
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
              {/* Background track */}
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="var(--color-sage-100)"
                strokeWidth={STROKE_WIDTH}
              />
              {/* Progress arc */}
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={
                  status === "completed"
                    ? "var(--color-primary-500)"
                    : status === "paused"
                      ? "var(--color-amber-400)"
                      : "var(--color-primary-500)"
                }
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                className="transition-[stroke-dashoffset] duration-700 ease-out"
              />
            </svg>

            {/* Center label */}
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-bold tabular-nums text-neutral-800">
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </span>
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    status === "running"
                      ? "animate-pulse bg-primary-500"
                      : status === "paused"
                        ? "bg-amber-400"
                        : status === "completed"
                          ? "bg-green-500"
                          : "bg-sage-300"
                  )}
                />
                <span className="text-xs font-semibold uppercase tracking-widest text-primary-600">
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Working On Card */}
        {(activeSession?.task || taskName) && status !== "idle" && (
          <Card variant="elevated" className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Working On
                </p>
                <h3 className="font-semibold text-neutral-800">
                  {activeSession?.task || taskName}
                </h3>
              </div>
              <Badge variant="default">
                {Math.round(duration / 60)}m
              </Badge>
            </div>
          </Card>
        )}

        {/* Setup Panel (idle state) */}
        {status === "idle" && (
          <Card variant="elevated" className="mb-6">
            <h3 className="mb-4 text-sm font-semibold text-neutral-800">
              Set Up Session
            </h3>

            {/* Task name */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                What will you focus on?
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g. Write documentation..."
                className="w-full rounded-xl border border-sage-200 bg-white px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            {/* Duration presets */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-neutral-500">
                Duration
              </label>
              <div className="flex gap-2">
                {presets.map((p) => (
                  <button
                    key={p.minutes}
                    onClick={() => setDurationMinutes(p.minutes)}
                    className={cn(
                      "flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors",
                      durationMinutes === p.minutes
                        ? "bg-primary-500 text-white shadow-sm"
                        : "bg-sage-100 text-neutral-600 hover:bg-sage-200"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleStart}
            >
              Start Focus
            </Button>
          </Card>
        )}

        {/* Controls (when timer is active) */}
        {status !== "idle" && (
          <div className="mb-8 flex items-center justify-center gap-8">
            {/* Stop */}
            <button
              onClick={handleStop}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-neutral-600 hover:bg-sage-200"
              aria-label="Stop"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>

            {/* Play/Pause */}
            {status !== "completed" ? (
              <button
                onClick={status === "running" ? handlePause : handleResume}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-600 active:scale-95"
                aria-label={status === "running" ? "Pause" : "Resume"}
              >
                {status === "running" ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-600 active:scale-95"
                aria-label="New session"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}

            {/* Skip (complete immediately) */}
            {status === "running" && (
              <button
                onClick={handleComplete}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-neutral-600 hover:bg-sage-200"
                aria-label="Skip to complete"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
                  <line x1="19" y1="5" x2="19" y2="19" />
                </svg>
              </button>
            )}
           </div>
        )}

        {/* Sessions teaser (shown when no sessions yet and timer is idle) */}
        {sessions.length === 0 && status === "idle" && (
          <Card variant="elevated" className="overflow-hidden">
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-4xl shadow-sm">
                ⏱️
              </div>
              <div>
                <p className="text-base font-semibold text-neutral-800">
                  Deep work, tracked
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Start a focus session above. Your completed sessions will appear here so you can see how you spend your time.
                </p>
              </div>
              {/* Mock session rows */}
              <div className="w-full space-y-2">
                {[
                  { emoji: "💻", label: "Deep Work", duration: "25 min", time: "9:00 AM" },
                  { emoji: "📖", label: "Reading", duration: "50 min", time: "11:00 AM" },
                  { emoji: "🎯", label: "Planning", duration: "15 min", time: "2:00 PM" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-sage-50 p-3 text-left opacity-75">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm">
                      {s.emoji}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-neutral-800">{s.label}</p>
                      <p className="text-[10px] text-neutral-400">{s.time}</p>
                    </div>
                    <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                      {s.duration}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-800">
                Recent Sessions
              </h2>
              <span className="text-xs text-neutral-500">
                {totalSessions} completed
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {[...sessions]
                .sort(
                  (a, b) =>
                    new Date(b.startedAt || "").getTime() -
                    new Date(a.startedAt || "").getTime()
                )
                .slice(0, 8)
                .map((s) => (
                  <Card key={s.id} variant="elevated" className="group relative">
                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      aria-label="Delete session"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      </svg>
                    </button>

                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg",
                          s.status === "completed"
                            ? "bg-green-100"
                            : "bg-sage-100"
                        )}
                      >
                        {s.status === "completed" ? "✅" : "⏱️"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-800">
                          {s.task || "Focus Session"}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {Math.round(s.elapsed / 60)}m / {Math.round(s.duration / 60)}m
                          {s.startedAt && (
                            <span className="ml-1.5">
                              &middot;{" "}
                              {new Date(s.startedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge
                        variant={s.status === "completed" ? "default" : "warning"}
                      >
                        {s.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
