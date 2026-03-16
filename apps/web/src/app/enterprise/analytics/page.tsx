"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { EnterpriseDashboardStats } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { cn, formatCurrency } from "@/lib/utils";

type Tab = "dashboard" | "projects" | "sales" | "finance" | "team";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dashboard data
  const [dashboardStats, setDashboardStats] = useState<EnterpriseDashboardStats | null>(null);

  // Per-tab data
  const [projectStats, setProjectStats] = useState<Record<string, unknown> | null>(null);
  const [salesStats, setSalesStats] = useState<Record<string, unknown> | null>(null);
  const [financeStats, setFinanceStats] = useState<Record<string, unknown> | null>(null);
  const [teamStats, setTeamStats] = useState<Record<string, unknown> | null>(null);

  const [tabLoading, setTabLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await api.analytics.dashboard();
    if (res.success && res.data) {
      setDashboardStats(res.data as unknown as EnterpriseDashboardStats);
    } else {
      setError(res.error || "Failed to load analytics");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const loadTabData = useCallback(async (t: Tab) => {
    if (t === "dashboard") return;
    setTabLoading(true);
    let res;
    switch (t) {
      case "projects":
        if (projectStats) { setTabLoading(false); return; }
        res = await api.analytics.projects();
        if (res.success && res.data) setProjectStats(res.data as Record<string, unknown>);
        break;
      case "sales":
        if (salesStats) { setTabLoading(false); return; }
        res = await api.analytics.sales();
        if (res.success && res.data) setSalesStats(res.data as Record<string, unknown>);
        break;
      case "finance":
        if (financeStats) { setTabLoading(false); return; }
        res = await api.analytics.finance();
        if (res.success && res.data) setFinanceStats(res.data as Record<string, unknown>);
        break;
      case "team":
        if (teamStats) { setTabLoading(false); return; }
        res = await api.analytics.team();
        if (res.success && res.data) setTeamStats(res.data as Record<string, unknown>);
        break;
    }
    setTabLoading(false);
  }, [projectStats, salesStats, financeStats, teamStats]);

  useEffect(() => {
    loadTabData(tab);
  }, [tab, loadTabData]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "Overview" },
    { key: "projects", label: "Projects" },
    { key: "sales", label: "Sales" },
    { key: "finance", label: "Finance" },
    { key: "team", label: "Team" },
  ];

  const safeNum = (val: unknown): number => (typeof val === "number" ? val : 0);
  const safeStr = (val: unknown): string => (typeof val === "string" ? val : "");
  const safeObj = (val: unknown): Record<string, unknown> =>
    (val && typeof val === "object" && !Array.isArray(val) ? val as Record<string, unknown> : {});

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <p className="text-sm text-primary-500 font-medium">Enterprise</p>
          <h1 className="text-2xl font-bold text-neutral-900">Analytics & Reporting</h1>
          <p className="text-sm text-neutral-500 mt-1">Insights across your organization</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
                tab === t.key
                  ? "bg-primary-500 text-white"
                  : "bg-sage-100 text-neutral-600 hover:bg-sage-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && tab === "dashboard" ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-500" />
          </div>
        ) : error && tab === "dashboard" ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <Button variant="secondary" size="sm" onClick={loadDashboard}>Retry</Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Dashboard Overview */}
            {tab === "dashboard" && dashboardStats && (
              <div>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                  <Card variant="elevated">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-600">
                          <path d="M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-7.93a2 2 0 01-1.66-.9l-.82-1.2A2 2 0 007.93 3H4a2 2 0 00-2 2v13c0 1.1.9 2 2 2z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-neutral-800">{dashboardStats.projects?.total ?? 0}</p>
                    <p className="text-xs text-neutral-500">Projects</p>
                  </Card>
                  <Card variant="elevated">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-neutral-800">{dashboardStats.orders?.total ?? 0}</p>
                    <p className="text-xs text-neutral-500">Orders</p>
                  </Card>
                  <Card variant="elevated">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600">
                          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-neutral-800">{dashboardStats.contacts?.total ?? 0}</p>
                    <p className="text-xs text-neutral-500">Contacts</p>
                  </Card>
                  <Card variant="elevated">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                          <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-neutral-800">{formatCurrency(dashboardStats.deals?.totalValue ?? 0)}</p>
                    <p className="text-xs text-neutral-500">Pipeline</p>
                  </Card>
                  <Card variant="elevated">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-neutral-800">{formatCurrency(dashboardStats.invoices?.totalAmount ?? 0)}</p>
                    <p className="text-xs text-neutral-500">Invoiced</p>
                  </Card>
                  <Card variant="elevated">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-600">
                          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-neutral-800">{dashboardStats.members?.total ?? 0}</p>
                    <p className="text-xs text-neutral-500">Members</p>
                  </Card>
                </div>

                {/* Invoice Collection */}
                {dashboardStats.invoices && dashboardStats.invoices.totalAmount > 0 && (
                  <Card className="mb-8">
                    <h3 className="text-sm font-semibold text-neutral-700 mb-3">Invoice Collection</h3>
                    <div className="flex items-center justify-between text-sm text-neutral-500 mb-2">
                      <span>Collected: {formatCurrency(dashboardStats.invoices.amountPaid)}</span>
                      <span>Total: {formatCurrency(dashboardStats.invoices.totalAmount)}</span>
                    </div>
                    <ProgressBar
                      value={Math.round((dashboardStats.invoices.amountPaid / dashboardStats.invoices.totalAmount) * 100)}
                      color="#4a7c59"
                    />
                  </Card>
                )}

                {/* Status Breakdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Project Status */}
                  {dashboardStats.projects?.byStatus && Object.keys(dashboardStats.projects.byStatus).length > 0 && (
                    <Card variant="outlined">
                      <h3 className="text-sm font-semibold text-neutral-700 mb-4">Projects by Status</h3>
                      <div className="space-y-3">
                        {Object.entries(dashboardStats.projects.byStatus).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={status === "active" ? "default" : status === "planning" ? "info" : status === "on-hold" ? "warning" : "default"}>
                                {status}
                              </Badge>
                            </div>
                            <span className="text-sm font-medium text-neutral-800">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Deal Status */}
                  {dashboardStats.deals?.byStatus && Object.keys(dashboardStats.deals.byStatus).length > 0 && (
                    <Card variant="outlined">
                      <h3 className="text-sm font-semibold text-neutral-700 mb-4">Deals by Status</h3>
                      <div className="space-y-3">
                        {Object.entries(dashboardStats.deals.byStatus).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between">
                            <Badge variant={status === "closed_won" ? "default" : status === "closed_lost" ? "error" : "info"}>
                              {status}
                            </Badge>
                            <span className="text-sm font-medium text-neutral-800">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Invoice Status */}
                  {dashboardStats.invoices?.byStatus && Object.keys(dashboardStats.invoices.byStatus).length > 0 && (
                    <Card variant="outlined">
                      <h3 className="text-sm font-semibold text-neutral-700 mb-4">Invoices by Status</h3>
                      <div className="space-y-3">
                        {Object.entries(dashboardStats.invoices.byStatus).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between">
                            <Badge variant={status === "paid" ? "default" : status === "overdue" ? "error" : status === "draft" ? "warning" : "info"}>
                              {status}
                            </Badge>
                            <span className="text-sm font-medium text-neutral-800">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Contact Types */}
                  {dashboardStats.contacts?.byType && Object.keys(dashboardStats.contacts.byType).length > 0 && (
                    <Card variant="outlined">
                      <h3 className="text-sm font-semibold text-neutral-700 mb-4">Contacts by Type</h3>
                      <div className="space-y-3">
                        {Object.entries(dashboardStats.contacts.byType).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <Badge variant={type === "customer" ? "default" : type === "lead" ? "info" : "warning"}>
                              {type}
                            </Badge>
                            <span className="text-sm font-medium text-neutral-800">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Per-tab analytics */}
            {tab !== "dashboard" && (
              <div>
                {tabLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-500" />
                  </div>
                ) : (
                  <>
                    {/* Projects Analytics */}
                    {tab === "projects" && (
                      <div>
                        {projectStats ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.entries(projectStats).map(([key, value]) => (
                              <Card key={key} variant="outlined">
                                <h3 className="text-sm font-semibold text-neutral-700 mb-3 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</h3>
                                {typeof value === "number" ? (
                                  <p className="text-2xl font-bold text-neutral-800">{value}</p>
                                ) : typeof value === "object" && value ? (
                                  <div className="space-y-2">
                                    {Object.entries(safeObj(value)).map(([k, v]) => (
                                      <div key={k} className="flex items-center justify-between">
                                        <span className="text-sm text-neutral-600 capitalize">{k.replace(/_/g, " ")}</span>
                                        <span className="text-sm font-medium text-neutral-800">{String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-neutral-600">{String(value)}</p>
                                )}
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Card>
                            <p className="text-center text-sm text-neutral-500 py-8">No project analytics data available.</p>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Sales Analytics */}
                    {tab === "sales" && (
                      <div>
                        {salesStats ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.entries(salesStats).map(([key, value]) => (
                              <Card key={key} variant="outlined">
                                <h3 className="text-sm font-semibold text-neutral-700 mb-3 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</h3>
                                {typeof value === "number" ? (
                                  <p className="text-2xl font-bold text-neutral-800">
                                    {key.toLowerCase().includes("value") || key.toLowerCase().includes("amount") || key.toLowerCase().includes("revenue")
                                      ? formatCurrency(value)
                                      : value}
                                  </p>
                                ) : typeof value === "object" && value ? (
                                  <div className="space-y-2">
                                    {Object.entries(safeObj(value)).map(([k, v]) => (
                                      <div key={k} className="flex items-center justify-between">
                                        <span className="text-sm text-neutral-600 capitalize">{k.replace(/_/g, " ")}</span>
                                        <span className="text-sm font-medium text-neutral-800">{String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-neutral-600">{String(value)}</p>
                                )}
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Card>
                            <p className="text-center text-sm text-neutral-500 py-8">No sales analytics data available.</p>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Finance Analytics */}
                    {tab === "finance" && (
                      <div>
                        {financeStats ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.entries(financeStats).map(([key, value]) => (
                              <Card key={key} variant="outlined">
                                <h3 className="text-sm font-semibold text-neutral-700 mb-3 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</h3>
                                {typeof value === "number" ? (
                                  <p className="text-2xl font-bold text-neutral-800">
                                    {key.toLowerCase().includes("amount") || key.toLowerCase().includes("revenue") || key.toLowerCase().includes("expense")
                                      ? formatCurrency(value)
                                      : value}
                                  </p>
                                ) : typeof value === "object" && value ? (
                                  <div className="space-y-2">
                                    {Object.entries(safeObj(value)).map(([k, v]) => (
                                      <div key={k} className="flex items-center justify-between">
                                        <span className="text-sm text-neutral-600 capitalize">{k.replace(/_/g, " ")}</span>
                                        <span className="text-sm font-medium text-neutral-800">{String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-neutral-600">{String(value)}</p>
                                )}
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Card>
                            <p className="text-center text-sm text-neutral-500 py-8">No finance analytics data available.</p>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Team Analytics */}
                    {tab === "team" && (
                      <div>
                        {teamStats ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.entries(teamStats).map(([key, value]) => (
                              <Card key={key} variant="outlined">
                                <h3 className="text-sm font-semibold text-neutral-700 mb-3 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</h3>
                                {typeof value === "number" ? (
                                  <p className="text-2xl font-bold text-neutral-800">{value}</p>
                                ) : typeof value === "object" && value ? (
                                  <div className="space-y-2">
                                    {Object.entries(safeObj(value)).map(([k, v]) => (
                                      <div key={k} className="flex items-center justify-between">
                                        <span className="text-sm text-neutral-600 capitalize">{k.replace(/_/g, " ")}</span>
                                        <span className="text-sm font-medium text-neutral-800">{String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-neutral-600">{String(value)}</p>
                                )}
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Card>
                            <p className="text-center text-sm text-neutral-500 py-8">No team analytics data available.</p>
                          </Card>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
