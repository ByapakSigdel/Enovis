"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Project, ProjectTask, Sprint } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ProgressBar from "@/components/ui/ProgressBar";
import { cn, formatCurrency } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Helper: format an ISO date string                                  */
/* ------------------------------------------------------------------ */
function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Badge variant helpers                                              */
/* ------------------------------------------------------------------ */
function statusBadgeVariant(
  status: string
): "default" | "info" | "warning" | "error" {
  switch (status) {
    case "active":
      return "default";
    case "planning":
      return "info";
    case "on-hold":
      return "warning";
    case "completed":
      return "default";
    default:
      return "default";
  }
}

function statusBadgeClass(status: string): string | undefined {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  return undefined;
}

function taskPriorityVariant(
  priority: string
): "default" | "info" | "warning" | "error" {
  switch (priority) {
    case "urgent":
      return "error";
    case "high":
      return "warning";
    case "medium":
      return "info";
    case "low":
    default:
      return "default";
  }
}

function taskStatusVariant(
  status: string
): "default" | "info" | "warning" | "error" {
  switch (status) {
    case "done":
    case "completed":
      return "default";
    case "in-progress":
    case "in_progress":
      return "info";
    case "blocked":
      return "error";
    case "todo":
    case "backlog":
    default:
      return "warning";
  }
}

/* ------------------------------------------------------------------ */
/*  Default form state                                                 */
/* ------------------------------------------------------------------ */
interface ProjectFormData {
  name: string;
  projectCode: string;
  description: string;
  methodology: "agile" | "waterfall" | "hybrid";
  startDate: string;
  endDate: string;
  status: string;
}

const EMPTY_PROJECT_FORM: ProjectFormData = {
  name: "",
  projectCode: "",
  description: "",
  methodology: "agile",
  startDate: "",
  endDate: "",
  status: "planning",
};

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  priority: string;
  estimatedHours: string;
  dueDate: string;
  storyPoints: string;
}

const EMPTY_TASK_FORM: TaskFormData = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  estimatedHours: "",
  dueDate: "",
  storyPoints: "",
};

/* ================================================================== */
/*  Projects page                                                      */
/* ================================================================== */
export default function ProjectsPage() {
  const { user } = useAuth();

  /* ---- Data state ------------------------------------------------- */
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Create project modal state --------------------------------- */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectForm, setProjectForm] =
    useState<ProjectFormData>(EMPTY_PROJECT_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /* ---- Expanded project + tasks state ----------------------------- */
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null
  );
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  /* ---- Add task form state ---------------------------------------- */
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormData>(EMPTY_TASK_FORM);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskCreateError, setTaskCreateError] = useState<string | null>(null);

  /* ---- Search filter ----------------------------------------------- */
  const [search, setSearch] = useState("");

  /* ================================================================= */
  /*  Fetch projects                                                    */
  /* ================================================================= */
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.projects.list();
      if (res.success && res.data) {
        setProjects(res.data as unknown as Project[]);
      } else {
        setError(res.error || "Failed to load projects.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /* ================================================================= */
  /*  Fetch tasks for expanded project                                  */
  /* ================================================================= */
  const fetchTasks = useCallback(async (projectId: string) => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const res = await api.projects.tasks.list(projectId);
      if (res.success && res.data) {
        setTasks(res.data as unknown as ProjectTask[]);
      } else {
        setTasksError(res.error || "Failed to load tasks.");
      }
    } catch {
      setTasksError("Network error loading tasks.");
    } finally {
      setTasksLoading(false);
    }
  }, []);

  /* ================================================================= */
  /*  Handlers                                                          */
  /* ================================================================= */
  const handleToggleExpand = useCallback(
    (projectId: string) => {
      if (expandedProjectId === projectId) {
        setExpandedProjectId(null);
        setTasks([]);
        setShowTaskForm(false);
      } else {
        setExpandedProjectId(projectId);
        setShowTaskForm(false);
        setTaskForm(EMPTY_TASK_FORM);
        fetchTasks(projectId);
      }
    },
    [expandedProjectId, fetchTasks]
  );

  const handleCreateProject = useCallback(async () => {
    if (!projectForm.name.trim()) {
      setCreateError("Project name is required.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const payload: Record<string, unknown> = {
        name: projectForm.name.trim(),
        methodology: projectForm.methodology,
        status: projectForm.status,
      };
      if (projectForm.projectCode.trim())
        payload.projectCode = projectForm.projectCode.trim();
      if (projectForm.description.trim())
        payload.description = projectForm.description.trim();
      if (projectForm.startDate) payload.startDate = projectForm.startDate;
      if (projectForm.endDate) payload.endDate = projectForm.endDate;

      const res = await api.projects.create(payload);
      if (res.success) {
        setShowCreateModal(false);
        setProjectForm(EMPTY_PROJECT_FORM);
        await fetchProjects();
      } else {
        setCreateError(res.error || "Failed to create project.");
      }
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }, [projectForm, fetchProjects]);

  const handleCreateTask = useCallback(async () => {
    if (!expandedProjectId) return;
    if (!taskForm.title.trim()) {
      setTaskCreateError("Task title is required.");
      return;
    }

    setCreatingTask(true);
    setTaskCreateError(null);
    try {
      const payload: Record<string, unknown> = {
        title: taskForm.title.trim(),
        status: taskForm.status,
        priority: taskForm.priority,
      };
      if (taskForm.description.trim())
        payload.description = taskForm.description.trim();
      if (taskForm.estimatedHours)
        payload.estimatedHours = parseFloat(taskForm.estimatedHours);
      if (taskForm.dueDate) payload.dueDate = taskForm.dueDate;
      if (taskForm.storyPoints)
        payload.storyPoints = parseInt(taskForm.storyPoints, 10);

      const res = await api.projects.tasks.create(expandedProjectId, payload);
      if (res.success) {
        setShowTaskForm(false);
        setTaskForm(EMPTY_TASK_FORM);
        await fetchTasks(expandedProjectId);
      } else {
        setTaskCreateError(res.error || "Failed to create task.");
      }
    } catch {
      setTaskCreateError("Network error. Please try again.");
    } finally {
      setCreatingTask(false);
    }
  }, [expandedProjectId, taskForm, fetchTasks]);

  /* ---- Derived: filtered projects --------------------------------- */
  const filtered = projects.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.projectCode?.toLowerCase().includes(q) ||
      p.status?.toLowerCase().includes(q) ||
      p.methodology?.toLowerCase().includes(q)
    );
  });

  /* ================================================================= */
  /*  Render                                                            */
  /* ================================================================= */
  return (
    <div className="space-y-6">
      {/* ---- Header ------------------------------------------------ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Projects</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your team&apos;s projects and track progress
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setShowCreateModal(true);
            setCreateError(null);
          }}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Project
        </Button>
      </div>

      {/* ---- Search bar -------------------------------------------- */}
      <div className="max-w-sm">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-4.35-4.35"
              />
            </svg>
          }
        />
      </div>

      {/* ---- Loading state ----------------------------------------- */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
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
            <p className="text-sm text-neutral-500">Loading projects...</p>
          </div>
        </div>
      )}

      {/* ---- Error state ------------------------------------------- */}
      {!loading && error && (
        <Card variant="outlined">
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <svg
              className="h-10 w-10 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-sm text-neutral-600">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchProjects}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* ---- Empty state ------------------------------------------- */}
      {!loading && !error && projects.length === 0 && (
        <Card variant="elevated" className="overflow-hidden">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-4xl shadow-sm">
              🗂️
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-700">No projects yet</p>
              <p className="mt-1 text-sm text-neutral-500">
                Organize work into projects. Track milestones, assign tasks, set deadlines, and keep your team aligned.
              </p>
            </div>
            {/* Mock project cards preview */}
            <div className="w-full space-y-2">
              {[
                { code: "PRJ", name: "Website Redesign", status: "Active", progress: 68, due: "Apr 15" },
                { code: "MKT", name: "Q2 Marketing Campaign", status: "Planning", progress: 20, due: "May 1" },
                { code: "OPS", name: "System Migration", status: "Active", progress: 45, due: "Mar 30" },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-sage-50 p-3 text-left opacity-75">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-700">
                    {p.code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-800">{p.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-sage-200">
                        <div className="h-full rounded-full bg-primary-400" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-[10px] text-neutral-400">{p.progress}%</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-400 shrink-0">Due {p.due}</span>
                </div>
              ))}
            </div>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => setShowCreateModal(true)}
            >
              Create First Project
            </Button>
          </div>
        </Card>
      )}

      {/* ---- No search results ------------------------------------- */}
      {!loading &&
        !error &&
        projects.length > 0 &&
        filtered.length === 0 && (
          <Card variant="outlined">
            <div className="py-8 text-center">
              <p className="text-sm text-neutral-500">
                No projects match &ldquo;{search}&rdquo;
              </p>
            </div>
          </Card>
        )}

      {/* ---- Project cards grid ------------------------------------ */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
            const isExpanded = expandedProjectId === project.id;

            return (
              <div
                key={project.id}
                className={cn(
                  isExpanded && "sm:col-span-2 lg:col-span-3"
                )}
              >
                <Card
                  variant="elevated"
                  className={cn(
                    "transition-all duration-200",
                    isExpanded && "ring-2 ring-primary-200"
                  )}
                >
                  {/* ---- Card header ---- */}
                  <div
                    className="cursor-pointer"
                    onClick={() => handleToggleExpand(project.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-neutral-900">
                            {project.name}
                          </h3>
                          {project.projectCode && (
                            <span className="shrink-0 rounded bg-sage-100 px-1.5 py-0.5 text-xs font-mono text-sage-600">
                              {project.projectCode}
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
                            {project.description}
                          </p>
                        )}
                      </div>

                      {/* Expand chevron */}
                      <svg
                        className={cn(
                          "h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>

                    {/* ---- Badges ---- */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge
                        variant={statusBadgeVariant(project.status)}
                        className={statusBadgeClass(project.status)}
                      >
                        {project.status}
                      </Badge>
                      <Badge variant="info">{project.methodology}</Badge>
                    </div>

                    {/* ---- Progress ---- */}
                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
                        <span>Progress</span>
                        <span className="font-medium text-neutral-700">
                          {project.progress ?? 0}%
                        </span>
                      </div>
                      <ProgressBar
                        value={project.progress ?? 0}
                        size="sm"
                      />
                    </div>

                    {/* ---- Dates & budget ---- */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                      {(project.startDate || project.endDate) && (
                        <span>
                          {fmtDate(project.startDate)} –{" "}
                          {fmtDate(project.endDate)}
                        </span>
                      )}
                      {project.budgetAmount != null &&
                        project.budgetAmount > 0 && (
                          <span className="flex items-center gap-1">
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {formatCurrency(project.budgetAmount)}
                            {project.actualCost != null && (
                              <span className="text-neutral-400">
                                {" "}
                                / {formatCurrency(project.actualCost)} spent
                              </span>
                            )}
                          </span>
                        )}
                      {project.estimatedHours != null &&
                        project.estimatedHours > 0 && (
                          <span>
                            {project.actualHours ?? 0}h /{" "}
                            {project.estimatedHours}h
                          </span>
                        )}
                    </div>
                  </div>

                  {/* === Expanded: task list === */}
                  {isExpanded && (
                    <div className="mt-5 border-t border-sage-200 pt-5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-neutral-800">
                          Tasks
                        </h4>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTaskForm((v) => !v);
                            setTaskCreateError(null);
                            setTaskForm(EMPTY_TASK_FORM);
                          }}
                        >
                          {showTaskForm ? "Cancel" : "Add Task"}
                        </Button>
                      </div>

                      {/* ---- Add task form ---- */}
                      {showTaskForm && (
                        <div className="mt-4 rounded-xl border border-sage-200 bg-sage-50/50 p-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <Input
                                label="Title *"
                                value={taskForm.title}
                                onChange={(e) =>
                                  setTaskForm((f) => ({
                                    ...f,
                                    title: e.target.value,
                                  }))
                                }
                                placeholder="Task title"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Input
                                label="Description"
                                value={taskForm.description}
                                onChange={(e) =>
                                  setTaskForm((f) => ({
                                    ...f,
                                    description: e.target.value,
                                  }))
                                }
                                placeholder="Brief description"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-sm font-medium text-neutral-700">
                                Status
                              </label>
                              <select
                                className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                value={taskForm.status}
                                onChange={(e) =>
                                  setTaskForm((f) => ({
                                    ...f,
                                    status: e.target.value,
                                  }))
                                }
                              >
                                <option value="backlog">Backlog</option>
                                <option value="todo">To Do</option>
                                <option value="in-progress">
                                  In Progress
                                </option>
                                <option value="done">Done</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-sm font-medium text-neutral-700">
                                Priority
                              </label>
                              <select
                                className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                value={taskForm.priority}
                                onChange={(e) =>
                                  setTaskForm((f) => ({
                                    ...f,
                                    priority: e.target.value,
                                  }))
                                }
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            </div>
                            <Input
                              label="Estimated Hours"
                              type="number"
                              value={taskForm.estimatedHours}
                              onChange={(e) =>
                                setTaskForm((f) => ({
                                  ...f,
                                  estimatedHours: e.target.value,
                                }))
                              }
                              placeholder="0"
                            />
                            <Input
                              label="Story Points"
                              type="number"
                              value={taskForm.storyPoints}
                              onChange={(e) =>
                                setTaskForm((f) => ({
                                  ...f,
                                  storyPoints: e.target.value,
                                }))
                              }
                              placeholder="0"
                            />
                            <Input
                              label="Due Date"
                              type="date"
                              value={taskForm.dueDate}
                              onChange={(e) =>
                                setTaskForm((f) => ({
                                  ...f,
                                  dueDate: e.target.value,
                                }))
                              }
                            />
                          </div>

                          {taskCreateError && (
                            <p className="mt-3 text-sm text-red-600">
                              {taskCreateError}
                            </p>
                          )}

                          <div className="mt-4 flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowTaskForm(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              loading={creatingTask}
                              onClick={handleCreateTask}
                            >
                              Create Task
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* ---- Tasks loading ---- */}
                      {tasksLoading && (
                        <div className="flex items-center justify-center py-8">
                          <svg
                            className="h-6 w-6 animate-spin text-primary-500"
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
                        </div>
                      )}

                      {/* ---- Tasks error ---- */}
                      {!tasksLoading && tasksError && (
                        <p className="mt-4 text-center text-sm text-red-500">
                          {tasksError}
                        </p>
                      )}

                      {/* ---- Tasks empty ---- */}
                      {!tasksLoading &&
                        !tasksError &&
                        tasks.length === 0 && (
                          <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
                            <span className="text-2xl">✅</span>
                            <p className="text-sm font-medium text-neutral-600">No tasks yet</p>
                            <p className="text-xs text-neutral-400">Add a task above to start breaking this project into actionable steps.</p>
                          </div>
                        )}

                      {/* ---- Tasks list ---- */}
                      {!tasksLoading && !tasksError && tasks.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-sage-100 bg-white px-4 py-3 transition-colors hover:bg-sage-50"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-neutral-800">
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="mt-0.5 truncate text-xs text-neutral-400">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {task.storyPoints != null &&
                                  task.storyPoints > 0 && (
                                    <span className="rounded bg-sage-100 px-1.5 py-0.5 text-xs font-mono text-sage-600">
                                      {task.storyPoints}sp
                                    </span>
                                  )}
                                {task.dueDate && (
                                  <span className="text-xs text-neutral-400">
                                    {fmtDate(task.dueDate)}
                                  </span>
                                )}
                                <Badge variant={taskStatusVariant(task.status)}>
                                  {task.status}
                                </Badge>
                                <Badge
                                  variant={taskPriorityVariant(task.priority)}
                                >
                                  {task.priority}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* === Create Project Modal === */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />

          {/* Modal */}
          <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">
                New Project
              </h2>
              <button
                className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-sage-100 hover:text-neutral-600"
                onClick={() => setShowCreateModal(false)}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <Input
                label="Project Name *"
                value={projectForm.name}
                onChange={(e) =>
                  setProjectForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Website Redesign"
              />

              <Input
                label="Project Code"
                value={projectForm.projectCode}
                onChange={(e) =>
                  setProjectForm((f) => ({
                    ...f,
                    projectCode: e.target.value,
                  }))
                }
                placeholder="e.g. WEB-001"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  Description
                </label>
                <textarea
                  className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  rows={3}
                  value={projectForm.description}
                  onChange={(e) =>
                    setProjectForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Brief project description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    Methodology
                  </label>
                  <select
                    className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    value={projectForm.methodology}
                    onChange={(e) =>
                      setProjectForm((f) => ({
                        ...f,
                        methodology: e.target.value as
                          | "agile"
                          | "waterfall"
                          | "hybrid",
                      }))
                    }
                  >
                    <option value="agile">Agile</option>
                    <option value="waterfall">Waterfall</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    Status
                  </label>
                  <select
                    className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    value={projectForm.status}
                    onChange={(e) =>
                      setProjectForm((f) => ({
                        ...f,
                        status: e.target.value,
                      }))
                    }
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) =>
                    setProjectForm((f) => ({
                      ...f,
                      startDate: e.target.value,
                    }))
                  }
                />
                <Input
                  label="End Date"
                  type="date"
                  value={projectForm.endDate}
                  onChange={(e) =>
                    setProjectForm((f) => ({
                      ...f,
                      endDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {createError && (
              <p className="mt-4 text-sm text-red-600">{createError}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setShowCreateModal(false);
                  setProjectForm(EMPTY_PROJECT_FORM);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={creating}
                onClick={handleCreateProject}
              >
                Create Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
