"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { ShoppingCart, HeartPulse, Car, Utensils, Clapperboard, Pill, ShoppingBag, Lightbulb, Home, Coins, Laptop, RefreshCw, Banknote, Briefcase, CreditCard, Coffee } from "lucide-react";
import { api } from "@/lib/api";
import type { Transaction, Budget } from "@/types";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/*  Category emoji lookup                                              */
/* ------------------------------------------------------------------ */

const categoryEmoji: Record<string, React.ReactNode> = {
  groceries: <ShoppingCart className="w-5 h-5" />,
  wellness: <HeartPulse className="w-5 h-5" />,
  transport: <Car className="w-5 h-5" />,
  food: <Utensils className="w-5 h-5" />,
  entertainment: <Clapperboard className="w-5 h-5" />,
  health: <Pill className="w-5 h-5" />,
  shopping: <ShoppingBag className="w-5 h-5" />,
  utilities: <Lightbulb className="w-5 h-5" />,
  rent: <Home className="w-5 h-5" />,
  salary: <Coins className="w-5 h-5" />,
  freelance: <Laptop className="w-5 h-5" />,
  income: <Coins className="w-5 h-5" />,
  transfer: <RefreshCw className="w-5 h-5" />,
};

function emojiFor(category: string, type?: string): React.ReactNode {
  if (type === "income") return <Coins className="w-5 h-5" />;
  if (type === "transfer") return <RefreshCw className="w-5 h-5" />;
  return categoryEmoji[category.toLowerCase()] ?? <Banknote className="w-5 h-5" />;
}

/* ------------------------------------------------------------------ */
/*  Budget color palette                                               */
/* ------------------------------------------------------------------ */

const budgetColors = ["#4a7c59", "#14b8a6", "#84cc16", "#f59e0b", "#6366f1", "#ec4899"];

/* ------------------------------------------------------------------ */
/*  Quick actions (decorative)                                         */
/* ------------------------------------------------------------------ */

const quickActions = [
  {
    label: "Add Expense",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    label: "Top Up",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  {
    label: "Send",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Helper: friendly relative date                                     */
/* ------------------------------------------------------------------ */

function friendlyDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = new Date(d);
  dateOnly.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - dateOnly.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<"week" | "month" | "year">("month");

  /* Add-transaction form state */
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"expense" | "income" | "transfer">("expense");
  const [newCategory, setNewCategory] = useState("General");
  const [formLoading, setFormLoading] = useState(false);

  /* ---- Fetch data on mount ---------------------------------------- */

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [txRes, budgetRes] = await Promise.all([
        api.transactions.list(),
        api.budgets.list(),
      ]);
      if (txRes.success && txRes.data) {
        setTransactions(txRes.data as unknown as Transaction[]);
      }
      if (budgetRes.success && budgetRes.data) {
        setBudgets(budgetRes.data as unknown as Budget[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  /* ---- Computed totals -------------------------------------------- */

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const tx of transactions) {
      if (tx.type === "income") inc += tx.amount;
      else if (tx.type === "expense") exp += tx.amount;
    }
    return { totalIncome: inc, totalExpense: exp, balance: inc - exp };
  }, [transactions]);

  /* ---- Chart data from real transactions (grouped by month) ------- */

  const chartData = useMemo(() => {
    const monthMap: Record<string, { income: number; spend: number }> = {};

    for (const tx of transactions) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap[key]) monthMap[key] = { income: 0, spend: 0 };
      if (tx.type === "income") monthMap[key].income += tx.amount;
      else if (tx.type === "expense") monthMap[key].spend += tx.amount;
    }

    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return Object.keys(monthMap)
      .sort()
      .slice(-6)
      .map((key) => {
        const monthIdx = parseInt(key.split("-")[1], 10) - 1;
        return {
          month: shortMonths[monthIdx],
          ...monthMap[key],
        };
      });
  }, [transactions]);

  const maxChartValue = Math.max(1, ...chartData.flatMap((d) => [d.spend, d.income]));

  /* ---- Recent transactions (sorted by date desc, take 8) ---------- */

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8),
    [transactions]
  );

  /* ---- Add transaction -------------------------------------------- */

  const addTransaction = useCallback(async () => {
    const amount = parseFloat(newAmount);
    if (!newTitle.trim() || isNaN(amount) || amount <= 0) return;

    setFormLoading(true);
    const res = await api.transactions.create({
      type: newType,
      amount,
      currency: "USD",
      category: newCategory,
      date: new Date().toISOString().split("T")[0],
      description: newTitle.trim(),
      merchant: newTitle.trim(),
    });

    if (res.success && res.data) {
      setTransactions((prev) => [res.data as unknown as Transaction, ...prev]);
      setNewTitle("");
      setNewAmount("");
      setNewType("expense");
      setNewCategory("General");
      setShowAddForm(false);
    }
    setFormLoading(false);
  }, [newTitle, newAmount, newType, newCategory]);

  /* ---- Delete transaction ----------------------------------------- */

  const deleteTransaction = useCallback(async (id: string) => {
    const res = await api.transactions.delete(id);
    if (res.success) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  /* ---- Balance trend % (rough: income vs expense ratio) ----------- */

  const trendPercent = totalExpense > 0 ? (((totalIncome - totalExpense) / totalExpense) * 100).toFixed(1) : "0.0";
  const trendPositive = totalIncome >= totalExpense;

  /* ---- Render ----------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
          <p className="text-sm text-neutral-400">Loading finances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">
              OVERVIEW
            </p>
            <h1 className="text-2xl font-bold text-neutral-900">
              Wellness Finance
            </h1>
          </div>
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-sage-100 text-neutral-600 hover:bg-sage-200"
            aria-label="Notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>
        </div>

        {/* Add Transaction Form (modal-like overlay) */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card variant="elevated" className="w-full max-w-md">
              <h3 className="mb-4 text-lg font-semibold text-neutral-800">
                New Transaction
              </h3>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Title / merchant..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  autoFocus
                />
                <input
                  type="number"
                  placeholder="Amount"
                  min="0"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <div className="flex gap-2">
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as "expense" | "income" | "transfer")}
                    className="flex-1 rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddForm(false)}
                    disabled={formLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={addTransaction}
                    loading={formLoading}
                  >
                    Add Transaction
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left column (3 cols) */}
          <div className="flex flex-col gap-6 lg:col-span-3">
            {/* Balance Card */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 p-6 text-white shadow-lg">
              <p className="mb-1 text-sm font-medium text-white/70">
                Total Balance
              </p>
              <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={!trendPositive ? "rotate-180" : ""}
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                <span className="text-sm font-medium text-primary-100">
                  {trendPositive ? "+" : ""}{trendPercent}% net
                </span>
              </div>

              {/* Income / Expense mini summary */}
              <div className="mt-4 flex gap-6 border-t border-white/20 pt-4">
                <div>
                  <p className="text-xs text-white/60">Income</p>
                  <p className="text-sm font-semibold">{formatCurrency(totalIncome)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/60">Expenses</p>
                  <p className="text-sm font-semibold">{formatCurrency(totalExpense)}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions (decorative) */}
            <div className="flex justify-center gap-6">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 transition-colors hover:bg-primary-100">
                    {action.icon}
                  </div>
                  <span className="text-xs font-medium text-neutral-600">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Statistics Chart */}
            <Card variant="elevated">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-neutral-800">
                  Statistics
                </h2>
                <div className="flex gap-1 rounded-lg bg-sage-100 p-0.5">
                  {(["week", "month", "year"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setActivePeriod(period)}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                        activePeriod === period
                          ? "bg-white text-neutral-800 shadow-sm"
                          : "text-neutral-500 hover:text-neutral-700"
                      )}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="mb-4 flex gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                  <span className="text-xs text-neutral-500">Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
                  <span className="text-xs text-neutral-500">Spending</span>
                </div>
              </div>

              {/* Bar Chart */}
              {chartData.length > 0 ? (
                <div className="flex items-end gap-3">
                  {chartData.map((d) => (
                    <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full items-end justify-center gap-1" style={{ height: 120 }}>
                        {/* Income bar */}
                        <div
                          className="w-3 rounded-t-sm bg-primary-500"
                          style={{ height: `${(d.income / maxChartValue) * 100}%` }}
                        />
                        {/* Spend bar */}
                        <div
                          className="w-3 rounded-t-sm bg-teal-400"
                          style={{ height: `${(d.spend / maxChartValue) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-400">{d.month}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[120px] items-center justify-center">
                  <p className="text-sm text-neutral-400">
                    No transaction data to chart yet.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Right column (2 cols) */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Monthly Budgets */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-800">
                  Monthly Budgets
                </h2>
                <button className="text-sm font-medium text-primary-500 hover:text-primary-600">
                  See All
                </button>
              </div>

              {budgets.length === 0 ? (
                <Card className="overflow-hidden">
                  <div className="flex flex-col items-center px-4 py-6 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                      <Briefcase className="w-10 h-10 text-primary-400" />
                    </div>
                    <p className="font-semibold text-neutral-700">No budgets yet</p>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                      Set spending limits per category to stay on track each month.
                    </p>
                    <div className="mt-3 flex flex-col gap-1.5 w-full">
                      {[
                        { icon: <ShoppingCart className="w-4 h-4" />, label: "Groceries", pct: 70 },
                        { icon: <Utensils className="w-4 h-4" />, label: "Food", pct: 45 },
                        { icon: <Clapperboard className="w-4 h-4" />, label: "Entertainment", pct: 20 },
                      ].map((b) => (
                        <div key={b.label} className="flex items-center gap-2 rounded-lg bg-sage-50 px-3 py-2 opacity-60">
                          <span className="text-base">{b.icon}</span>
                          <span className="flex-1 text-xs font-medium text-neutral-700">{b.label}</span>
                          <div className="w-16 h-1.5 rounded-full bg-sage-200">
                            <div className="h-1.5 rounded-full bg-primary-400" style={{ width: `${b.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {budgets.map((budget, idx) => {
                    const remaining = budget.amount - budget.spent;
                    const percent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
                    const color = budgetColors[idx % budgetColors.length];
                    const overBudget = budget.spent > budget.amount;

                    return (
                      <Card key={budget.id}>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">
                              {emojiFor(budget.category)}
                            </span>
                            <span className="text-sm font-semibold text-neutral-800">
                              {budget.category}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "text-sm font-medium",
                              overBudget ? "text-red-500" : "text-neutral-600"
                            )}
                          >
                            {overBudget
                              ? `${formatCurrency(Math.abs(remaining))} over`
                              : `${formatCurrency(remaining)} left`}
                          </span>
                        </div>
                        <ProgressBar
                          value={percent}
                          color={overBudget ? "#ef4444" : color}
                          size="sm"
                        />
                        <div className="mt-1.5 flex justify-between text-xs text-neutral-400">
                          <span>{formatCurrency(budget.spent)} spent</span>
                          <span>{formatCurrency(budget.amount)}</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-800">
                  Recent Transactions
                </h2>
                <button className="text-sm font-medium text-primary-500 hover:text-primary-600">
                  View All
                </button>
              </div>

              {recentTransactions.length === 0 ? (
                <Card variant="elevated" className="overflow-hidden">
                  <div className="flex flex-col items-center gap-4 py-4 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-4xl shadow-sm">
                      <CreditCard className="w-10 h-10 text-primary-400" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-neutral-800">
                        Track every dollar
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        Log income and expenses to see where your money goes. Smart category tags make it effortless.
                      </p>
                    </div>
                    {/* Mock transaction rows */}
                    <div className="w-full rounded-xl bg-sage-50 p-3">
                      <div className="flex flex-col divide-y divide-sage-100">
                        {[
                          { icon: <ShoppingCart className="w-4 h-4" />, label: "Grocery Store", cat: "Food", amount: "–$64.20", color: "text-red-500" },
                          { icon: <Briefcase className="w-4 h-4" />, label: "Freelance Payment", cat: "Income", amount: "+$1,200.00", color: "text-primary-600" },
                          { icon: <Coffee className="w-4 h-4" />, label: "Coffee Shop", cat: "Food", amount: "–$5.50", color: "text-red-500" },
                          { icon: <Home className="w-4 h-4" />, label: "Rent", cat: "Housing", amount: "–$1,500.00", color: "text-red-500" },
                        ].map((tx, i) => (
                          <div key={i} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0 opacity-75">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm">
                              {tx.icon}
                            </span>
                            <div className="flex-1 text-left">
                              <p className="text-xs font-medium text-neutral-700">{tx.label}</p>
                              <p className="text-[10px] text-neutral-400">{tx.cat}</p>
                            </div>
                            <span className={cn("text-xs font-semibold", tx.color)}>{tx.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={() => setShowAddForm(true)}
                    >
                      Add First Transaction
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="flex flex-col divide-y divide-sage-100">
                    {recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-50 text-lg">
                          {emojiFor(tx.category, tx.type)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-800">
                            {tx.merchant || tx.description || tx.category}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {friendlyDate(tx.date)}
                            {tx.category && (
                              <span className="ml-1.5 text-neutral-300">
                                &middot; {tx.category}
                              </span>
                            )}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            tx.type === "income"
                              ? "text-green-600"
                              : "text-neutral-700"
                          )}
                        >
                          {tx.type === "income" ? "+" : "-"}
                          {formatCurrency(tx.amount, tx.currency || "USD")}
                        </span>

                        {/* Delete button */}
                        <button
                          onClick={() => deleteTransaction(tx.id)}
                          className="shrink-0 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                          aria-label={`Delete transaction ${tx.merchant || tx.description || ""}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 active:bg-primary-700"
        aria-label="Add new transaction"
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
