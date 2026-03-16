"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { JournalEntry } from "@/types";
import Card from "@/components/ui/Card";
import MoodSelector from "@/components/ui/MoodSelector";
import type { Mood } from "@/components/ui/MoodSelector";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/*  Mood mapping: numeric ↔ Mood string                                */
/* ------------------------------------------------------------------ */

const moodToNumber: Record<Mood, number> = {
  stressed: 1,
  okay: 3,
  good: 5,
  calm: 7,
  great: 9,
};

const numberToMood = (n: number): Mood | null => {
  if (n <= 2) return "stressed";
  if (n <= 4) return "okay";
  if (n <= 6) return "good";
  if (n <= 8) return "calm";
  return "great";
};

const moodEmoji: Record<Mood, string> = {
  stressed: "😣",
  okay: "😐",
  good: "🙂",
  calm: "😌",
  great: "😄",
};

/* ------------------------------------------------------------------ */
/*  Daily prompts                                                      */
/* ------------------------------------------------------------------ */

const prompts = [
  "What is one small win you've had today that you're proud of?",
  "What are you grateful for right now?",
  "What made you smile today?",
  "What's something you learned recently?",
  "If you could change one thing about today, what would it be?",
  "What's on your mind right now?",
  "Describe your ideal day. How close was today?",
  "What habit are you most proud of maintaining?",
];

function getDailyPrompt(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return prompts[dayOfYear % prompts.length];
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* Current editor state */
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [content, setContent] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  /* View mode: "write" (today's entry) or "list" (past entries) */
  const [view, setView] = useState<"write" | "list">("write");

  const today = todayString();
  const dailyPrompt = getDailyPrompt();

  /* ---- Fetch -------------------------------------------------------- */

  const fetchEntries = useCallback(async () => {
    const res = await api.journal.list();
    if (res.success && res.data) {
      setEntries(res.data as unknown as JournalEntry[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  /* ---- Find today's entry (if any) --------------------------------- */

  useEffect(() => {
    if (entries.length === 0) return;
    const todayEntry = entries.find((e) => e.date.slice(0, 10) === today);
    if (todayEntry && !editingId) {
      setEditingId(todayEntry.id);
      setSelectedMood(numberToMood(todayEntry.mood));
      setContent(todayEntry.content);
      setGratitude(todayEntry.gratitude?.join("\n") || "");
    }
  }, [entries, today, editingId]);

  /* ---- Save/Create -------------------------------------------------- */

  const handleSave = async () => {
    if (!selectedMood) return;

    setSaving(true);
    const gratitudeList = gratitude
      .split("\n")
      .map((g) => g.trim())
      .filter(Boolean);

    const payload = {
      date: today,
      mood: moodToNumber[selectedMood],
      prompt: dailyPrompt,
      content: content.trim(),
      gratitude: gratitudeList,
    };

    let res;
    if (editingId) {
      res = await api.journal.update(editingId, payload);
    } else {
      res = await api.journal.create(payload);
    }

    if (res.success) {
      await fetchEntries();
    }
    setSaving(false);
  };

  /* ---- Delete ------------------------------------------------------- */

  const handleDelete = async (id: string) => {
    const res = await api.journal.delete(id);
    if (res.success) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setSelectedMood(null);
        setContent("");
        setGratitude("");
      }
    }
  };

  /* ---- Load entry for editing --------------------------------------- */

  const loadEntry = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setSelectedMood(numberToMood(entry.mood));
    setContent(entry.content);
    setGratitude(entry.gratitude?.join("\n") || "");
    setView("write");
  };

  /* ---- Start new entry ---------------------------------------------- */

  const startNewEntry = () => {
    setEditingId(null);
    setSelectedMood(null);
    setContent("");
    setGratitude("");
    setView("write");
  };

  /* ---- Sorted past entries ------------------------------------------ */

  const pastEntries = useMemo(
    () =>
      [...entries]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [entries]
  );

  /* ---- Streak calculation ------------------------------------------- */

  const streak = useMemo(() => {
    if (entries.length === 0) return 0;
    const dates = new Set(entries.map((e) => e.date.slice(0, 10)));
    let count = 0;
    const d = new Date();
    // If no entry today, start checking from yesterday
    if (!dates.has(d.toISOString().slice(0, 10))) {
      d.setDate(d.getDate() - 1);
    }
    while (dates.has(d.toISOString().slice(0, 10))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [entries]);

  /* ---- Loading ------------------------------------------------------ */

  if (loading) {
    return (
      <div className="min-h-full bg-[#fafdf7]">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <svg className="h-8 w-8 animate-spin text-primary-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-neutral-500">Loading journal...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Render ------------------------------------------------------- */

  return (
    <div className="min-h-full bg-[#fafdf7]">
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setView("write")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                view === "write"
                  ? "bg-primary-500 text-white shadow-sm"
                  : "bg-white text-neutral-600 hover:bg-sage-50"
              )}
            >
              Write
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                view === "list"
                  ? "bg-primary-500 text-white shadow-sm"
                  : "bg-white text-neutral-600 hover:bg-sage-50"
              )}
            >
              Past Entries
            </button>
          </div>

          {/* Streak badge */}
          {streak > 0 && (
            <Badge variant="default" className="gap-1">
              🔥 {streak} day streak
            </Badge>
          )}
        </div>

        {/* ========== WRITE VIEW ========== */}
        {view === "write" && (
          <>
            {/* Date + time */}
            <div className="mb-6 text-center">
              <p className="text-sm font-semibold text-neutral-800">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
              </p>
              <div className="mt-0.5 flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                <span className="text-xs text-neutral-500">
                  {editingId ? "Editing" : "New Entry"}
                </span>
              </div>
            </div>

            {/* Mood Selector */}
            <div className="mb-8">
              <h2 className="mb-4 text-center text-base font-semibold text-neutral-700">
                How are you feeling?
              </h2>
              <MoodSelector value={selectedMood} onChange={setSelectedMood} />
            </div>

            {/* Daily Prompt */}
            <Card
              variant="default"
              className="mb-6 border border-teal-100 bg-teal-50/60"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-teal-500">
                    Daily Prompt
                  </p>
                  <p className="text-sm leading-relaxed text-teal-800">
                    {dailyPrompt}
                  </p>
                </div>
              </div>
            </Card>

            {/* Journal Text Area */}
            <div className="mb-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing..."
                rows={10}
                className="w-full resize-none rounded-2xl border border-sage-200 bg-white p-5 text-sm leading-relaxed text-neutral-700 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            {/* Gratitude */}
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-neutral-700">
                Gratitude (one per line)
              </h3>
              <textarea
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                placeholder="What are you grateful for today?"
                rows={3}
                className="w-full resize-none rounded-xl border border-sage-200 bg-white p-4 text-sm leading-relaxed text-neutral-700 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            {/* Save button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleSave}
              loading={saving}
              disabled={!selectedMood}
            >
              {editingId ? "Update Entry" : "Save Entry"}
            </Button>
          </>
        )}

        {/* ========== LIST VIEW ========== */}
        {view === "list" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-800">
                Journal History
              </h2>
              <Badge variant="default">{entries.length}</Badge>
            </div>

            {pastEntries.length === 0 ? (
              <Card variant="outlined" className="py-12 text-center">
                <p className="text-3xl">📔</p>
                <p className="mt-2 font-medium text-neutral-600">
                  No journal entries yet.
                </p>
                <p className="mt-1 text-sm text-neutral-400">
                  Switch to Write to create your first entry.
                </p>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {pastEntries.map((entry) => {
                  const mood = numberToMood(entry.mood);
                  const isToday = entry.date.slice(0, 10) === today;

                  return (
                    <Card
                      key={entry.id}
                      variant="elevated"
                      className="group relative cursor-pointer transition-shadow hover:shadow-md"
                    >
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(entry.id);
                        }}
                        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        aria-label="Delete entry"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        </svg>
                      </button>

                      <div onClick={() => loadEntry(entry)}>
                        <div className="mb-2 flex items-center gap-3">
                          {/* Mood emoji */}
                          <span className="text-2xl">
                            {mood ? moodEmoji[mood] : "📝"}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-neutral-800">
                              {new Date(entry.date).toLocaleDateString(undefined, {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                              })}
                              {isToday && (
                                <span className="ml-2 text-xs font-normal text-primary-500">
                                  Today
                                </span>
                              )}
                            </p>
                            {mood && (
                              <p className="text-xs capitalize text-neutral-500">
                                Feeling {mood}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Content preview */}
                        <p className="text-sm leading-relaxed text-neutral-600 line-clamp-3">
                          {entry.content || "(empty)"}
                        </p>

                        {/* Gratitude */}
                        {entry.gratitude && entry.gratitude.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {entry.gratitude.map((g, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs text-primary-600"
                              >
                                🙏 {g}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating New Entry Button (only in list view) */}
      {view === "list" && (
        <button
          onClick={startNewEntry}
          className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-600 active:scale-95"
          aria-label="New journal entry"
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
