"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn, getGreeting, formatCurrency, formatDate } from "@/lib/utils";
import type { EnterpriseDashboardStats, Project, Order } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import Avatar from "@/components/ui/Avatar";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusBadgeVariant(
  status: string
): "default" | "warning" | "error" | "info" {
  const s = status.toLowerCase();
  if (["active", "completed", "paid", "fulfilled", "won"].includes(s))
    return "default";
  if (["in_progress", "in progress", "pending", "partial", "open"].includes(s))
    return "info";
  if (["on_hold", "on hold", "overdue", "draft"].includes(s)) return "warning";
  if (["cancelled", "canceled", "lost", "failed"].includes(s)) return "error";
  return "info";
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Skeleton placeholder                                               */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <Card variant="elevated" className="animate-pulse">
      <div className="mb-3 h-4 w-24 rounded bg-sage-100" />
      <div className="h-8 w-16 rounded bg-sage-100" />
    </Card>
  );
}

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-4 py-3">
      <div className="h-4 w-4 rounded bg-sage-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-sage-100" />
        <div className="h-3 w-1/2 rounded bg-sage-100" />
      </div>
      <div className="h-5 w-16 rounded-full bg-sage-100" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
}

function StatCard({ label, value, icon, subtext }: StatCardProps) {
  return (
    <Card variant="elevated">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-neutral-800">{value}</p>
          {subtext && (
            <p className="mt-1 text-xs text-neutral-400">{subtext}</p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-500">
          {icon}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Icons (inline SVGs - no external libs)                             */
/* ------------------------------------------------------------------ */

const icons = {
  projects: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  orders: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  ),
  contacts: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  pipeline: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  invoices: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  team: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  plus: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  arrow: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EnterpriseDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<EnterpriseDashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const greeting = getGreeting();
  const today = formatDate(new Date(), "EEEE, MMM dd, yyyy");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [dashRes, projRes, ordRes] = await Promise.all([
          api.analytics.dashboard(),
          api.projects.list(),
          api.orders.list(),
        ]);

        if (dashRes.success && dashRes.data) {
          setStats(dashRes.data as unknown as EnterpriseDashboardStats);
        } else {
          setError(dashRes.error || "Failed to load dashboard data.");
        }

        if (projRes.success && projRes.data) {
          setProjects(projRes.data as unknown as Project[]);
        }

        if (ordRes.success && ordRes.data) {
          setOrders(ordRes.data as unknown as Order[]);
        }
      } catch {
        setError("A network error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /* ---- Derived values ---------------------------------------------- */

  const recentProjects = projects.slice(0, 5);
  const recentOrders = orders.slice(0, 5);

  const outstandingInvoices = stats
    ? stats.invoices.totalAmount - stats.invoices.amountPaid
    : 0;

  const invoicePaidPercent =
    stats && stats.invoices.totalAmount > 0
      ? Math.round(
          (stats.invoices.amountPaid / stats.invoices.totalAmount) * 100
        )
      : 0;

  /* ---- Error state ------------------------------------------------- */

  if (error && !stats) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-center text-neutral-600">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  /* ---- Render ------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-sage-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* ---- Welcome Header ---------------------------------------- */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name ?? "User"} src={user?.avatar} size="lg" />
            <div>
              <p className="text-sm text-neutral-500">{today}</p>
              <h1 className="text-2xl font-bold text-neutral-800">
                {greeting}, {user?.name?.split(" ")[0] ?? "there"}
              </h1>
              <p className="mt-0.5 text-sm text-neutral-400">
                Enterprise Overview
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/enterprise/projects")}
            >
              {icons.plus}
              New Project
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push("/enterprise/orders")}
            >
              {icons.plus}
              New Order
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/enterprise/channels")}
            >
              {icons.plus}
              Invite Member
            </Button>
          </div>
        </div>

        {/* ---- Stats Grid --------------------------------------------- */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Total Projects"
              value={stats.projects.total}
              icon={icons.projects}
              subtext={
                stats.projects.byStatus.active
                  ? `${stats.projects.byStatus.active} active`
                  : undefined
              }
            />
            <StatCard
              label="Active Orders"
              value={stats.orders.total}
              icon={icons.orders}
              subtext={formatCurrency(stats.orders.totalAmount)}
            />
            <StatCard
              label="Total Contacts"
              value={stats.contacts.total}
              icon={icons.contacts}
              subtext={
                Object.keys(stats.contacts.byType).length > 0
                  ? Object.entries(stats.contacts.byType)
                      .map(([k, v]) => `${v} ${formatStatusLabel(k)}`)
                      .join(", ")
                  : undefined
              }
            />
            <StatCard
              label="Pipeline Value"
              value={formatCurrency(stats.deals.totalValue)}
              icon={icons.pipeline}
              subtext={`${stats.deals.total} deal${stats.deals.total !== 1 ? "s" : ""}`}
            />
            <StatCard
              label="Outstanding"
              value={formatCurrency(outstandingInvoices)}
              icon={icons.invoices}
              subtext={`${stats.invoices.total} invoice${stats.invoices.total !== 1 ? "s" : ""}`}
            />
            <StatCard
              label="Team Members"
              value={stats.members.total}
              icon={icons.team}
              subtext={`${stats.timeClock.totalEntries} clock entries`}
            />
          </div>
        ) : null}

        {/* ---- Invoice collection progress ----------------------------- */}
        {stats && stats.invoices.totalAmount > 0 && (
          <Card variant="outlined">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">
                  Invoice Collection
                </p>
                <p className="text-lg font-bold text-neutral-800">
                  {formatCurrency(stats.invoices.amountPaid)}{" "}
                  <span className="text-sm font-normal text-neutral-400">
                    of {formatCurrency(stats.invoices.totalAmount)} collected
                  </span>
                </p>
              </div>
              <span className="text-sm font-semibold text-primary-500">
                {invoicePaidPercent}%
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar value={invoicePaidPercent} size="sm" />
            </div>
          </Card>
        )}

        {/* ---- Two-column content -------------------------------------- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Projects */}
          <Card variant="outlined" padding={false}>
            <div className="flex items-center justify-between border-b border-sage-200 px-5 py-4">
              <h2 className="text-base font-semibold text-neutral-800">
                Recent Projects
              </h2>
              <button
                onClick={() => router.push("/enterprise/projects")}
                className="flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600"
              >
                View All {icons.arrow}
              </button>
            </div>

            {loading ? (
              <div className="px-5 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-neutral-400">No projects yet.</p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push("/enterprise/projects")}
                >
                  Create First Project
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-sage-100">
                {recentProjects.map((project) => (
                  <li
                    key={project.id}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-sage-50 cursor-pointer"
                    onClick={() =>
                      router.push(`/enterprise/projects/${project.id}`)
                    }
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-600">
                      {project.projectCode?.slice(0, 3) || "PRJ"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {project.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-400">
                        <span>{project.methodology}</span>
                        {project.progress != null && (
                          <>
                            <span className="text-neutral-300">|</span>
                            <span>{project.progress}% complete</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant={statusBadgeVariant(project.status)}>
                      {formatStatusLabel(project.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Recent Orders */}
          <Card variant="outlined" padding={false}>
            <div className="flex items-center justify-between border-b border-sage-200 px-5 py-4">
              <h2 className="text-base font-semibold text-neutral-800">
                Recent Orders
              </h2>
              <button
                onClick={() => router.push("/enterprise/orders")}
                className="flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600"
              >
                View All {icons.arrow}
              </button>
            </div>

            {loading ? (
              <div className="px-5 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-neutral-400">No orders yet.</p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push("/enterprise/orders")}
                >
                  Create First Order
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-sage-100">
                {recentOrders.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-sage-50 cursor-pointer"
                    onClick={() =>
                      router.push(`/enterprise/orders/${order.id}`)
                    }
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage-100 text-xs font-bold text-neutral-600">
                      #{order.orderNumber?.slice(-4) || "—"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {order.customerName}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {formatCurrency(order.totalAmount)}
                        {order.createdAt && (
                          <>
                            {" "}
                            &middot;{" "}
                            {formatDate(new Date(order.createdAt), "MMM dd")}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        variant={statusBadgeVariant(order.fulfillmentStatus)}
                      >
                        {formatStatusLabel(order.fulfillmentStatus)}
                      </Badge>
                      <Badge variant={statusBadgeVariant(order.paymentStatus)}>
                        {formatStatusLabel(order.paymentStatus)}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ---- Deal pipeline breakdown -------------------------------- */}
        {stats &&
          stats.deals.total > 0 &&
          Object.keys(stats.deals.byStatus).length > 0 && (
            <Card variant="outlined">
              <h2 className="mb-4 text-base font-semibold text-neutral-800">
                Deal Pipeline
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {Object.entries(stats.deals.byStatus).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <p className="text-2xl font-bold text-neutral-800">
                      {count}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {formatStatusLabel(status)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
      </div>
    </div>
  );
}
