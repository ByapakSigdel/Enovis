"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Task } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type FilterTab = "all" | "today" | "upcoming" | "completed";
type Priority = "high" | "medium" | "low" | "urgent";

const priorityConfig: Record<Priority, { label: string; variant: "error" | "warning" | "default" }> = {
  urgent: { label: "URGENT", variant: "error" },
  high: { label: "HIGH", variant: "error" },
  medium: { label: "MEDIUM", variant: "warning" },
  low: { label: "LOW", variant: "default" },
};

const filterTabs: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await api.tasks.list();
      if (res.success && res.data) {
        setTasks(res.data as unknown as Task[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredTasks = tasks.filter((task) => {
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    switch (activeFilter) {
      case "today":
        return !task.completed && task.dueDate === todayStr;
      case "upcoming":
        return !task.completed && (!task.dueDate || task.dueDate > todayStr);
      case "completed":
        return task.completed;
      default:
        return true;
    }
  });

  const todoTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  const toggleTask = useCallback(async (id: string, completed: boolean) => {
    const res = await api.tasks.update(id, { completed: !completed });
    if (res.success) {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      );
    }
  }, []);

  const addTask = useCallback(async () => {
    if (!newTitle.trim()) return;
    const res = await api.tasks.create({
      title: newTitle.trim(),
      priority: newPriority,
      status: "todo",
      completed: false,
      tags: [],
    });
    if (res.success && res.data) {
      setTasks((prev) => [res.data as unknown as Task, ...prev]);
      setNewTitle("");
      setShowAddForm(false);
    }
  }, [newTitle, newPriority]);

  const deleteTask = useCallback(async (id: string) => {
    const res = await api.tasks.delete(id);
    if (res.success) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">
              MY WELLNESS
            </p>
            <h1 className="text-2xl font-bold text-neutral-900">
              Daily Tasks
            </h1>
          </div>
          <Avatar name={user?.name ?? "User"} size="md" />
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-sage-200 bg-sage-50 py-2.5 pl-10 pr-4 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                activeFilter === tab.value
                  ? "bg-primary-500 text-white"
                  : "bg-sage-100 text-neutral-600 hover:bg-sage-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Add Task Form */}
        {showAddForm && (
          <Card className="mb-6" variant="elevated">
            <h3 className="mb-3 font-semibold text-neutral-800">New Task</h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Task title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                className="w-full rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Priority)}
                  className="rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <Button variant="primary" size="sm" onClick={addTask}>
                  Add
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="py-16 text-center">
            <p className="text-sm text-neutral-400">Loading tasks...</p>
          </div>
        ) : (
          <>
            {/* To Do Section */}
            {todoTasks.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-neutral-800">
                    To Do
                  </h2>
                  <span className="text-sm text-neutral-500">
                    {todoTasks.length} task{todoTasks.length !== 1 ? "s" : ""} left
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {todoTasks.map((task) => {
                    const config = priorityConfig[task.priority as Priority] || priorityConfig.medium;
                    return (
                      <Card key={task.id} variant="elevated" className="group">
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleTask(task.id, task.completed)}
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-neutral-300 transition-colors hover:border-primary-400"
                            aria-label={`Complete ${task.title}`}
                          />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="mb-1 flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-neutral-800">
                                {task.title}
                              </p>
                              <Badge variant={config.variant}>
                                {config.label}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="mb-2 text-sm text-neutral-500 line-clamp-1">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3">
                              {task.dueDate && (
                                <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
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
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                  </svg>
                                  {task.dueDate} {task.dueTime || ""}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Delete */}
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="shrink-0 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                            aria-label="Delete task"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completed Section */}
            {completedTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="mb-3 flex w-full items-center gap-2 text-left"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                      "text-neutral-400 transition-transform",
                      showCompleted && "rotate-90"
                    )}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <h2 className="text-base font-semibold text-neutral-800">
                    Completed
                  </h2>
                  <span className="text-sm text-neutral-400">
                    ({completedTasks.length})
                  </span>
                </button>
                {showCompleted && (
                  <div className="flex flex-col gap-3">
                    {completedTasks.map((task) => {
                      const config = priorityConfig[task.priority as Priority] || priorityConfig.medium;
                      return (
                        <Card key={task.id} className="opacity-60 group">
                          <div className="flex items-start gap-4">
                            <button
                              type="button"
                              onClick={() => toggleTask(task.id, task.completed)}
                              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-primary-500 bg-primary-500"
                              aria-label={`Uncomplete ${task.title}`}
                            >
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
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="mb-1 flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-neutral-400 line-through">
                                  {task.title}
                                </p>
                                <Badge variant={config.variant}>
                                  {config.label}
                                </Badge>
                              </div>
                              {task.description && (
                                <p className="text-sm text-neutral-400 line-clamp-1">
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="shrink-0 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                              aria-label="Delete task"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {filteredTasks.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-4xl">📋</p>
                <p className="mt-3 text-sm text-neutral-500">
                  No tasks found. Try a different filter or add a new task.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 active:bg-primary-700"
        aria-label="Add new task"
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
