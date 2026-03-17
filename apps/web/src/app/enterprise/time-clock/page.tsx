"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { TimeClockEntry, LeaveRequest } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type Tab = "entries" | "leave";

const tabs: { value: Tab; label: string }[] = [
  { value: "entries", label: "Time Entries" },
  { value: "leave", label: "Leave Requests" },
];

const leaveTypes = [
  { value: "vacation", label: "Vacation" },
  { value: "sick", label: "Sick" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
];

function statusBadgeVariant(
  status: string
): "default" | "info" | "warning" | "error" {
  switch (status) {
    case "active":
    case "clocked_in":
      return "default";
    case "completed":
      return "info";
    case "pending":
      return "warning";
    case "approved":
      return "default";
    case "rejected":
      return "error";
    default:
      return "default";
  }
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatHours(h: number | null | undefined): string {
  if (h == null) return "--";
  return `${h.toFixed(1)}h`;
}

/* ------------------------------------------------------------------ */
/*  Elapsed timer hook                                                 */
/* ------------------------------------------------------------------ */

function useElapsedTimer(clockInTime: string | null | undefined) {
  const [elapsed, setElapsed] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!clockInTime) {
      setElapsed("");
      return;
    }

    const tick = () => {
      const diff = Math.max(
        0,
        Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000)
      );
      const hrs = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;
      setElapsed(
        `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [clockInTime]);

  return elapsed;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function TimeClockPage() {
  const { user } = useAuth();

  /* --- State ------------------------------------------------------- */
  const [activeTab, setActiveTab] = useState<Tab>("entries");
  const [entries, setEntries] = useState<TimeClockEntry[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [loadingLeave, setLoadingLeave] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active session = most recent entry that has no clockOutTime
  const activeSession: TimeClockEntry | null =
    entries.find(
      (e) =>
        !e.clockOutTime &&
        (e.status === "active" || e.status === "clocked_in")
    ) ?? null;

  const elapsed = useElapsedTimer(activeSession?.clockInTime);

  // Leave form modal
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: "vacation",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  /* --- Data loading ------------------------------------------------ */
  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    setError(null);
    const res = await api.timeClock.my();
    if (res.success && res.data) {
      setEntries(res.data as unknown as TimeClockEntry[]);
    } else {
      setError(res.error ?? "Failed to load time entries.");
    }
    setLoadingEntries(false);
  }, []);

  const loadLeave = useCallback(async () => {
    setLoadingLeave(true);
    const res = await api.timeClock.leave.my();
    if (res.success && res.data) {
      setLeaveRequests(res.data as unknown as LeaveRequest[]);
    }
    setLoadingLeave(false);
  }, []);

  useEffect(() => {
    loadEntries();
    loadLeave();
  }, [loadEntries, loadLeave]);

  /* --- Clock in / out ---------------------------------------------- */
  const handleClockIn = useCallback(async () => {
    setClockLoading(true);
    setError(null);
    const res = await api.timeClock.clockIn({ workLocation: "office" });
    if (res.success && res.data) {
      setEntries((prev) => [
        res.data as unknown as TimeClockEntry,
        ...prev,
      ]);
    } else {
      setError(res.error ?? "Failed to clock in.");
    }
    setClockLoading(false);
  }, []);

  const handleClockOut = useCallback(async () => {
    setClockLoading(true);
    setError(null);
    const res = await api.timeClock.clockOut();
    if (res.success && res.data) {
      const updated = res.data as unknown as TimeClockEntry;
      setEntries((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
      );
    } else {
      setError(res.error ?? "Failed to clock out.");
    }
    setClockLoading(false);
  }, []);

  /* --- Leave request submission ------------------------------------ */
  const handleLeaveSubmit = useCallback(async () => {
    if (!leaveForm.startDate || !leaveForm.endDate) {
      setLeaveError("Start date and end date are required.");
      return;
    }
    setLeaveSubmitting(true);
    setLeaveError(null);
    const res = await api.timeClock.leave.create({
      type: leaveForm.type,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.reason || undefined,
    });
    if (res.success && res.data) {
      setLeaveRequests((prev) => [
        res.data as unknown as LeaveRequest,
        ...prev,
      ]);
      setShowLeaveForm(false);
      setLeaveForm({ type: "vacation", startDate: "", endDate: "", reason: "" });
    } else {
      setLeaveError(res.error ?? "Failed to submit leave request.");
    }
    setLeaveSubmitting(false);
  }, [leaveForm]);

  /* --- Render ------------------------------------------------------ */
  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">
            ENTERPRISE
          </p>
          <h1 className="text-2xl font-bold text-neutral-900">
            Time &amp; Attendance
          </h1>
        </div>

        {/* ---------------------------------------------------------- */}
        {/*  Clock In / Out Section                                     */}
        {/* ---------------------------------------------------------- */}
        <Card variant="elevated" className="mb-8">
          <div className="flex flex-col items-center gap-4 py-4 sm:flex-row sm:justify-between sm:py-2">
            {/* Status indicator */}
            <div className="flex items-center gap-4">
              {/* Pulsing dot */}
              <span className="relative flex h-4 w-4">
                {activeSession && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex h-4 w-4 rounded-full",
                    activeSession ? "bg-primary-500" : "bg-neutral-300"
                  )}
                />
              </span>

              <div>
                <p className="text-sm font-medium text-neutral-600">
                  {activeSession ? "Currently Clocked In" : "Not Clocked In"}
                </p>
                {activeSession && elapsed && (
                  <p className="mt-0.5 font-mono text-2xl font-bold text-primary-600">
                    {elapsed}
                  </p>
                )}
                {activeSession?.workLocation && (
                  <p className="mt-0.5 text-xs text-neutral-400">
                    Location: {activeSession.workLocation}
                  </p>
                )}
              </div>
            </div>

            {/* Action button */}
            <Button
              variant={activeSession ? "danger" : "primary"}
              size="lg"
              loading={clockLoading}
              onClick={activeSession ? handleClockOut : handleClockIn}
              className="min-w-[160px]"
            >
              {activeSession ? (
                <>
                  {/* Stop icon */}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="none"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  Clock Out
                </>
              ) : (
                <>
                  {/* Play icon */}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="none"
                  >
                    <polygon points="6,4 20,12 6,20" />
                  </svg>
                  Clock In
                </>
              )}
            </Button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </Card>

        {/* ---------------------------------------------------------- */}
        {/*  Tab Switcher                                               */}
        {/* ---------------------------------------------------------- */}
        <div className="mb-6 flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "rounded-full px-5 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.value
                  ? "bg-primary-500 text-white"
                  : "bg-sage-100 text-neutral-600 hover:bg-sage-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ---------------------------------------------------------- */}
        {/*  Time Entries Tab                                           */}
        {/* ---------------------------------------------------------- */}
        {activeTab === "entries" && (
          <>
            {loadingEntries ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-primary-500" />
                <p className="text-sm text-neutral-400">
                  Loading time entries...
                </p>
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl shadow-sm">⏱️</div>
                <div>
                  <p className="text-base font-semibold text-neutral-700">No time entries yet</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Clock in to start tracking work hours. See total hours, overtime, and attendance history — all in one place.
                  </p>
                </div>
                <div className="w-full max-w-sm space-y-2">
                  {[
                    { date: "Mon Mar 17", clockIn: "9:00 AM", clockOut: "5:30 PM", hours: "8.5 hrs" },
                    { date: "Tue Mar 16", clockIn: "8:45 AM", clockOut: "5:15 PM", hours: "8.5 hrs" },
                    { date: "Wed Mar 15", clockIn: "9:10 AM", clockOut: "6:00 PM", hours: "8.8 hrs" },
                  ].map((e, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-sage-50 p-3 text-left opacity-75">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-neutral-800">{e.date}</p>
                        <p className="text-[10px] text-neutral-400">{e.clockIn} → {e.clockOut}</p>
                      </div>
                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">{e.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {entries.map((entry) => (
                  <Card key={entry.id} variant="outlined">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left: date + times */}
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-neutral-800">
                            {formatDate(entry.clockInTime)}
                          </p>
                          <Badge variant={statusBadgeVariant(entry.status)}>
                            {entry.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-neutral-500">
                          <span>
                            In:{" "}
                            <span className="font-medium text-neutral-700">
                              {formatTime(entry.clockInTime)}
                            </span>
                          </span>
                          <span>
                            Out:{" "}
                            <span className="font-medium text-neutral-700">
                              {formatTime(entry.clockOutTime)}
                            </span>
                          </span>
                          {entry.workLocation && (
                            <span className="hidden sm:inline">
                              {entry.workLocation}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: hours summary */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <p className="font-mono text-lg font-bold text-neutral-800">
                            {formatHours(entry.totalHours)}
                          </p>
                          <p className="text-neutral-400">Total</p>
                        </div>
                        {(entry.regularHours != null ||
                          entry.overtimeHours != null) && (
                          <>
                            <div className="h-8 w-px bg-sage-200" />
                            <div className="text-center">
                              <p className="font-mono text-sm font-semibold text-neutral-600">
                                {formatHours(entry.regularHours)}
                              </p>
                              <p className="text-neutral-400">Regular</p>
                            </div>
                            <div className="text-center">
                              <p className="font-mono text-sm font-semibold text-neutral-600">
                                {formatHours(entry.overtimeHours)}
                              </p>
                              <p className="text-neutral-400">OT</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {entry.notes && (
                      <p className="mt-2 text-xs text-neutral-400">
                        {entry.notes}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------------------------------------------------------- */}
        {/*  Leave Requests Tab                                         */}
        {/* ---------------------------------------------------------- */}
        {activeTab === "leave" && (
          <>
            {/* Request Leave button */}
            <div className="mb-4 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowLeaveForm(true)}
              >
                <svg
                  width="16"
                  height="16"
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
                Request Leave
              </Button>
            </div>

            {loadingLeave ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-primary-500" />
                <p className="text-sm text-neutral-400">
                  Loading leave requests...
                </p>
              </div>
            ) : leaveRequests.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl shadow-sm">🏖️</div>
                <div>
                  <p className="text-base font-semibold text-neutral-700">No leave requests yet</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Submit vacation, sick, or personal leave requests. Track approval status and balances in one place.
                  </p>
                </div>
                <div className="w-full max-w-sm space-y-2">
                  {[
                    { type: "Vacation Leave", dates: "Apr 7 – Apr 11", days: "5 days", status: "Approved" },
                    { type: "Sick Leave", dates: "Mar 3", days: "1 day", status: "Approved" },
                    { type: "Personal Leave", dates: "May 2", days: "1 day", status: "Pending" },
                  ].map((lr, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-sage-50 p-3 text-left opacity-75">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-neutral-800">{lr.type}</p>
                        <p className="text-[10px] text-neutral-400">{lr.dates} · {lr.days}</p>
                      </div>
                      <span className={`text-[10px] font-semibold ${lr.status === "Approved" ? "text-primary-600" : "text-amber-500"}`}>{lr.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {leaveRequests.map((lr) => (
                  <Card key={lr.id} variant="outlined">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold capitalize text-neutral-800">
                            {lr.type} Leave
                          </p>
                          <Badge variant={statusBadgeVariant(lr.status)}>
                            {lr.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-neutral-500">
                          <span>
                            {formatDate(lr.startDate)} &mdash;{" "}
                            {formatDate(lr.endDate)}
                          </span>
                        </div>
                        {lr.reason && (
                          <p className="mt-1.5 text-xs text-neutral-400">
                            {lr.reason}
                          </p>
                        )}
                      </div>

                      <div className="text-right text-xs text-neutral-400">
                        <p>Submitted {formatDate(lr.createdAt)}</p>
                        {lr.approvedBy && (
                          <p className="mt-0.5">
                            Approved by: {lr.approvedBy}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* -------------------------------------------------------------- */}
      {/*  Leave Request Modal                                            */}
      {/* -------------------------------------------------------------- */}
      {showLeaveForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowLeaveForm(false);
              setLeaveError(null);
            }}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-bold text-neutral-900">
              Request Leave
            </h2>

            <div className="flex flex-col gap-4">
              {/* Type */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="leave-type"
                  className="text-sm font-medium text-neutral-700"
                >
                  Leave Type
                </label>
                <select
                  id="leave-type"
                  value={leaveForm.type}
                  onChange={(e) =>
                    setLeaveForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  {leaveTypes.map((lt) => (
                    <option key={lt.value} value={lt.value}>
                      {lt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <Input
                label="Start Date"
                type="date"
                value={leaveForm.startDate}
                onChange={(e) =>
                  setLeaveForm((f) => ({
                    ...f,
                    startDate: e.target.value,
                  }))
                }
              />

              {/* End Date */}
              <Input
                label="End Date"
                type="date"
                value={leaveForm.endDate}
                onChange={(e) =>
                  setLeaveForm((f) => ({
                    ...f,
                    endDate: e.target.value,
                  }))
                }
              />

              {/* Reason */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="leave-reason"
                  className="text-sm font-medium text-neutral-700"
                >
                  Reason
                </label>
                <textarea
                  id="leave-reason"
                  rows={3}
                  placeholder="Optional reason for leave..."
                  value={leaveForm.reason}
                  onChange={(e) =>
                    setLeaveForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Error */}
              {leaveError && (
                <p className="text-xs text-red-600">{leaveError}</p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowLeaveForm(false);
                    setLeaveError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={leaveSubmitting}
                  onClick={handleLeaveSubmit}
                >
                  Submit Request
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
