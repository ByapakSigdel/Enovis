"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PenSquare } from "lucide-react";
import { api } from "@/lib/api";
import type { Note } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/*  Notebook color lookup                                              */
/* ------------------------------------------------------------------ */

const notebookColors: Record<string, { bg: string; text: string }> = {
  personal: { bg: "bg-blue-100", text: "text-blue-700" },
  work: { bg: "bg-amber-100", text: "text-amber-700" },
  wellness: { bg: "bg-green-100", text: "text-green-700" },
  ideas: { bg: "bg-purple-100", text: "text-purple-700" },
};

function getNotebookStyle(notebook?: string | null) {
  if (notebook && notebook in notebookColors) return notebookColors[notebook];
  return { bg: "bg-sage-100", text: "text-neutral-600" };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  /* Form state */
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formNotebook, setFormNotebook] = useState("");
  const [formTags, setFormTags] = useState("");

  /* Edit state */
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ---- Fetch -------------------------------------------------------- */

  const fetchNotes = useCallback(async () => {
    const res = await api.notes.list();
    if (res.success && res.data) {
      setNotes(res.data as unknown as Note[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  /* ---- Filter & search ---------------------------------------------- */

  const notebooks = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      if (n.notebook) set.add(n.notebook);
    }
    return Array.from(set).sort();
  }, [notes]);

  const filterTabs = useMemo(
    () => [
      { value: "all", label: "All" },
      ...notebooks.map((nb) => ({
        value: nb,
        label: nb.charAt(0).toUpperCase() + nb.slice(1),
      })),
    ],
    [notebooks]
  );

  const filteredNotes = useMemo(() => {
    let result = notes;

    // Filter by notebook
    if (activeTab !== "all") {
      result = result.filter((n) => n.notebook === activeTab);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Pinned first, then by date
    return [...result].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt || b.createdAt || "").getTime() -
        new Date(a.updatedAt || a.createdAt || "").getTime();
    });
  }, [notes, activeTab, search]);

  /* ---- Handlers ----------------------------------------------------- */

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setCreating(true);
    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await api.notes.create({
      title: formTitle.trim(),
      content: formContent.trim(),
      notebook: formNotebook.trim() || null,
      tags,
      pinned: false,
    });

    if (res.success) {
      resetForm();
      await fetchNotes();
    }
    setCreating(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formTitle.trim()) return;

    setCreating(true);
    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await api.notes.update(editingId, {
      title: formTitle.trim(),
      content: formContent.trim(),
      notebook: formNotebook.trim() || null,
      tags,
    });

    if (res.success) {
      resetForm();
      await fetchNotes();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    const res = await api.notes.delete(id);
    if (res.success) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleTogglePin = async (note: Note) => {
    const res = await api.notes.update(note.id, { pinned: !note.pinned });
    if (res.success) {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, pinned: !n.pinned } : n))
      );
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormNotebook(note.notebook || "");
    setFormTags(note.tags?.join(", ") || "");
    setShowForm(true);
  };

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormNotebook("");
    setFormTags("");
    setEditingId(null);
    setShowForm(false);
  };

  /* ---- Loading ------------------------------------------------------ */

  if (loading) {
    return (
      <div className="min-h-full bg-[#fafdf7]">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-400">
              Wellness Board
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-800">
              My Notes
            </h1>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <svg className="h-8 w-8 animate-spin text-primary-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-neutral-500">Loading notes...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Render ------------------------------------------------------- */

  return (
    <div className="min-h-full bg-[#fafdf7]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-400">
              Wellness Board
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-800">
              My Notes
            </h1>
          </div>
          <Badge variant="default">{notes.length} notes</Badge>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search notes, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-sage-200 bg-white py-3 pl-11 pr-4 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors",
                activeTab === tab.value
                  ? "bg-primary-500 text-white shadow-sm"
                  : "bg-white text-neutral-600 hover:bg-sage-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notes Grid */}
        {filteredNotes.length === 0 ? (
          <Card variant="elevated" className="overflow-hidden">
            {/* Hero */}
            <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-4xl shadow-sm">
                <PenSquare className="w-10 h-10 text-primary-400" />
              </div>
              <h3 className="text-xl font-bold text-neutral-800">
                {search ? "No matching notes" : "Capture Your Thoughts"}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
                {search
                  ? "Try different keywords or clear your search to browse all notes."
                  : "Jot down ideas, meeting notes, or anything on your mind. Organize them into notebooks and find them instantly with search."}
              </p>
            </div>

            {/* Notebook previews */}
            {!search && (
              <div className="border-t border-sage-100 px-6 py-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Organize by notebook
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Personal", bg: "bg-blue-100", text: "text-blue-700" },
                    { label: "Work", bg: "bg-amber-100", text: "text-amber-700" },
                    { label: "Wellness", bg: "bg-green-100", text: "text-green-700" },
                    { label: "Ideas", bg: "bg-purple-100", text: "text-purple-700" },
                  ].map((nb) => (
                    <span
                      key={nb.label}
                      className={cn("rounded-full px-3 py-1.5 text-sm font-medium", nb.bg, nb.text)}
                    >
                      {nb.label}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {[
                    { title: "Weekly reflection", preview: "This week I accomplished...", notebook: "Personal", tag: "#mindset" },
                    { title: "Project ideas", preview: "Key features to build next...", notebook: "Work", tag: "#planning" },
                    { title: "Gratitude list", preview: "Three things I'm grateful for...", notebook: "Wellness", tag: "#gratitude" },
                  ].map((note) => (
                    <div key={note.title} className="flex items-start gap-3 rounded-xl bg-sage-50 p-3 opacity-60">
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="text-sm font-semibold text-neutral-800">{note.title}</span>
                          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">{note.tag}</span>
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-1">{note.preview}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            {!search && (
              <div className="px-6 pb-7 pt-4">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    setEditingId(null);
                    setShowForm(true);
                  }}
                >
                  Write Your First Note
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {filteredNotes.map((note) => {
              const nbStyle = getNotebookStyle(note.notebook);
              return (
                <Card
                  key={note.id}
                  variant="elevated"
                  className={cn(
                    "group relative cursor-pointer transition-shadow hover:shadow-md",
                    note.pinned && "ring-2 ring-primary-200"
                  )}
                >
                  {/* Action buttons */}
                  <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {/* Pin toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(note);
                      }}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                        note.pinned
                          ? "bg-primary-100 text-primary-600"
                          : "text-neutral-400 hover:bg-sage-100 hover:text-neutral-600"
                      )}
                      aria-label={note.pinned ? "Unpin" : "Pin"}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={note.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L12 22" />
                        <path d="M5 10L19 10" />
                        <path d="M7 2L17 2" />
                      </svg>
                    </button>
                    {/* Edit */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(note);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-sage-100 hover:text-neutral-600"
                      aria-label="Edit note"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(note.id);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-red-50 hover:text-red-500"
                      aria-label="Delete note"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      </svg>
                    </button>
                  </div>

                  {/* Notebook badge */}
                  {note.notebook && (
                    <Badge
                      variant="custom"
                      className={cn("mb-3", nbStyle.bg, nbStyle.text)}
                    >
                      {note.notebook.toUpperCase()}
                    </Badge>
                  )}

                  {/* Pin indicator */}
                  {note.pinned && (
                    <span className="absolute left-3 top-3 text-primary-400">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                        <path d="M12 2L12 22" />
                        <path d="M5 10L19 10" />
                        <path d="M7 2L17 2" />
                      </svg>
                    </span>
                  )}

                  {/* Title */}
                  <h3 className="mb-2 pr-20 font-semibold text-neutral-800">
                    {note.title}
                  </h3>

                  {/* Content preview */}
                  <p className="text-sm leading-relaxed text-neutral-600 line-clamp-4">
                    {note.content}
                  </p>

                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Date */}
                  <p className="mt-3 text-xs text-neutral-400">
                    {new Date(note.updatedAt || note.createdAt || "").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Note Modal */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={resetForm}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
            <h2 className="mb-4 text-lg font-bold text-neutral-800">
              {editingId ? "Edit Note" : "New Note"}
            </h2>
            <form
              onSubmit={editingId ? handleUpdate : handleCreate}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Note title..."
                  className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Content
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Write your note..."
                  rows={5}
                  className="w-full resize-none rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Notebook
                  </label>
                  <select
                    value={formNotebook}
                    onChange={(e) => setFormNotebook(e.target.value)}
                    className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">None</option>
                    <option value="personal">Personal</option>
                    <option value="work">Work</option>
                    <option value="wellness">Wellness</option>
                    <option value="ideas">Ideas</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="comma, separated"
                    className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div className="mt-2 flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  loading={creating}
                  disabled={!formTitle.trim()}
                >
                  {editingId ? "Update Note" : "Create Note"}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Floating Add Button */}
      {!showForm && (
        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
          className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-600 active:scale-95"
          aria-label="Create new note"
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
