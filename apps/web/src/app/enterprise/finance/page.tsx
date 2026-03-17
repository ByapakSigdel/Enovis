"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { ChartOfAccount, AccountingEntry } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type Tab = "accounts" | "entries";

const tabs: { value: Tab; label: string }[] = [
  { value: "accounts", label: "Chart of Accounts" },
  { value: "entries", label: "Journal Entries" },
];

const accountTypes = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
] as const;

/* ------------------------------------------------------------------ */
/*  Badge variant helpers                                              */
/* ------------------------------------------------------------------ */

function accountTypeBadgeVariant(
  type: ChartOfAccount["type"]
): "info" | "error" | "default" | "warning" | "custom" {
  switch (type) {
    case "asset":
      return "info";
    case "liability":
      return "error";
    case "equity":
      return "default";
    case "revenue":
      return "custom";
    case "expense":
      return "warning";
    default:
      return "default";
  }
}

function entryStatusBadgeVariant(
  status: string
): "warning" | "info" | "default" {
  switch (status) {
    case "draft":
      return "warning";
    case "posted":
      return "info";
    case "approved":
      return "default";
    default:
      return "default";
  }
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function parseLineItems(raw: string | null | undefined): string {
  if (!raw) return "--";
  try {
    const items = JSON.parse(raw);
    if (Array.isArray(items)) {
      return items
        .map(
          (li: { account?: string; description?: string; debit?: number; credit?: number }) =>
            `${li.account ?? li.description ?? "?"}: Dr ${li.debit ?? 0} / Cr ${li.credit ?? 0}`
        )
        .join("; ");
    }
    return raw;
  } catch {
    return raw;
  }
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function FinancePage() {
  const { user } = useAuth();

  /* --- State ------------------------------------------------------- */
  const [activeTab, setActiveTab] = useState<Tab>("accounts");

  // Accounts state
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // Entries state
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  // Account form modal
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountForm, setAccountForm] = useState({
    code: "",
    name: "",
    type: "asset" as ChartOfAccount["type"],
    description: "",
    currency: "USD",
    isActive: true,
  });
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountFormError, setAccountFormError] = useState<string | null>(null);

  // Entry form modal
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryForm, setEntryForm] = useState({
    date: "",
    description: "",
    lineItems: "",
  });
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryFormError, setEntryFormError] = useState<string | null>(null);

  // Approve loading state
  const [approvingId, setApprovingId] = useState<string | null>(null);

  /* --- Data loading ------------------------------------------------ */
  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    setAccountsError(null);
    const res = await api.finance.accounts.list();
    if (res.success && res.data) {
      setAccounts(res.data as unknown as ChartOfAccount[]);
    } else {
      setAccountsError(res.error ?? "Failed to load chart of accounts.");
    }
    setLoadingAccounts(false);
  }, []);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    setEntriesError(null);
    const res = await api.finance.entries.list();
    if (res.success && res.data) {
      setEntries(res.data as unknown as AccountingEntry[]);
    } else {
      setEntriesError(res.error ?? "Failed to load journal entries.");
    }
    setLoadingEntries(false);
  }, []);

  useEffect(() => {
    loadAccounts();
    loadEntries();
  }, [loadAccounts, loadEntries]);

  /* --- Account form submission ------------------------------------- */
  const handleAccountSubmit = useCallback(async () => {
    if (!accountForm.code.trim() || !accountForm.name.trim()) {
      setAccountFormError("Account code and name are required.");
      return;
    }
    setAccountSubmitting(true);
    setAccountFormError(null);
    const res = await api.finance.accounts.create({
      code: accountForm.code.trim(),
      name: accountForm.name.trim(),
      type: accountForm.type,
      description: accountForm.description.trim() || undefined,
      currency: accountForm.currency || "USD",
      isActive: accountForm.isActive,
    });
    if (res.success && res.data) {
      setAccounts((prev) => [res.data as unknown as ChartOfAccount, ...prev]);
      setShowAccountForm(false);
      setAccountForm({
        code: "",
        name: "",
        type: "asset",
        description: "",
        currency: "USD",
        isActive: true,
      });
    } else {
      setAccountFormError(res.error ?? "Failed to create account.");
    }
    setAccountSubmitting(false);
  }, [accountForm]);

  /* --- Entry form submission --------------------------------------- */
  const handleEntrySubmit = useCallback(async () => {
    if (!entryForm.date || !entryForm.description.trim()) {
      setEntryFormError("Date and description are required.");
      return;
    }
    // Validate line items JSON if provided
    if (entryForm.lineItems.trim()) {
      try {
        JSON.parse(entryForm.lineItems);
      } catch {
        setEntryFormError("Line items must be valid JSON.");
        return;
      }
    }
    setEntrySubmitting(true);
    setEntryFormError(null);
    const res = await api.finance.entries.create({
      date: entryForm.date,
      description: entryForm.description.trim(),
      lineItems: entryForm.lineItems.trim() || undefined,
    });
    if (res.success && res.data) {
      setEntries((prev) => [res.data as unknown as AccountingEntry, ...prev]);
      setShowEntryForm(false);
      setEntryForm({ date: "", description: "", lineItems: "" });
    } else {
      setEntryFormError(res.error ?? "Failed to create journal entry.");
    }
    setEntrySubmitting(false);
  }, [entryForm]);

  /* --- Approve entry ----------------------------------------------- */
  const handleApprove = useCallback(async (id: string) => {
    setApprovingId(id);
    const res = await api.finance.entries.approve(id);
    if (res.success && res.data) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? (res.data as unknown as AccountingEntry) : e
        )
      );
    } else {
      setEntriesError(res.error ?? "Failed to approve entry.");
    }
    setApprovingId(null);
  }, []);

  /* --- Render ------------------------------------------------------ */
  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">
            ENTERPRISE
          </p>
          <h1 className="text-2xl font-bold text-neutral-900">
            Finance &amp; Accounting
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your chart of accounts and journal entries
          </p>
        </div>

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
        {/*  Chart of Accounts Tab                                      */}
        {/* ---------------------------------------------------------- */}
        {activeTab === "accounts" && (
          <>
            {/* Action bar */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                {!loadingAccounts && `${accounts.length} account${accounts.length !== 1 ? "s" : ""}`}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAccountForm(true)}
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
                Add Account
              </Button>
            </div>

            {/* Error */}
            {accountsError && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {accountsError}
              </div>
            )}

            {loadingAccounts ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-primary-500" />
                <p className="text-sm text-neutral-400">
                  Loading chart of accounts...
                </p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl shadow-sm">🏦</div>
                <div>
                  <p className="text-base font-semibold text-neutral-700">Set up your chart of accounts</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Define your assets, liabilities, revenue, and expense accounts to power accurate financial reporting.
                  </p>
                </div>
                <div className="w-full max-w-md space-y-2">
                  {[
                    { code: "1000", name: "Cash & Cash Equivalents", type: "Asset", balance: "$48,200" },
                    { code: "2000", name: "Accounts Payable", type: "Liability", balance: "$12,500" },
                    { code: "4000", name: "Sales Revenue", type: "Revenue", balance: "$182,000" },
                    { code: "5000", name: "Operating Expenses", type: "Expense", balance: "$64,300" },
                  ].map((a, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-sage-50 p-3 text-left opacity-75">
                      <span className="font-mono text-xs font-bold text-primary-600 w-10">{a.code}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-semibold text-neutral-800">{a.name}</p>
                        <p className="text-[10px] text-neutral-400">{a.type}</p>
                      </div>
                      <span className="text-xs font-bold text-neutral-700">{a.balance}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Card variant="outlined" padding={false}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-sage-200 bg-sage-50">
                        <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Code
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Name
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Type
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Balance
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sage-100">
                      {accounts.map((account) => (
                        <tr
                          key={account.id}
                          className="transition-colors hover:bg-sage-50/50"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-neutral-700">
                            {account.code}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-neutral-800">
                              {account.name}
                            </p>
                            {account.description && (
                              <p className="mt-0.5 text-xs text-neutral-400 line-clamp-1">
                                {account.description}
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Badge
                              variant={accountTypeBadgeVariant(account.type)}
                              className={
                                account.type === "revenue"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : undefined
                              }
                            >
                              {account.type}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm font-semibold text-neutral-800">
                            {formatCurrency(
                              account.balance,
                              account.currency ?? "USD"
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <span
                              className={cn(
                                "inline-block h-2 w-2 rounded-full",
                                account.isActive
                                  ? "bg-primary-500"
                                  : "bg-neutral-300"
                              )}
                              title={
                                account.isActive ? "Active" : "Inactive"
                              }
                            />
                            <span className="ml-1.5 text-xs text-neutral-500">
                              {account.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ---------------------------------------------------------- */}
        {/*  Journal Entries Tab                                         */}
        {/* ---------------------------------------------------------- */}
        {activeTab === "entries" && (
          <>
            {/* Action bar */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                {!loadingEntries && `${entries.length} entr${entries.length !== 1 ? "ies" : "y"}`}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowEntryForm(true)}
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
                New Entry
              </Button>
            </div>

            {/* Error */}
            {entriesError && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {entriesError}
              </div>
            )}

            {loadingEntries ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-primary-500" />
                <p className="text-sm text-neutral-400">
                  Loading journal entries...
                </p>
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl shadow-sm">📒</div>
                <div>
                  <p className="text-base font-semibold text-neutral-700">No journal entries yet</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Record debits and credits to maintain accurate books. Every transaction tells the story of your business.
                  </p>
                </div>
                <div className="w-full max-w-md space-y-2">
                  {[
                    { ref: "JE-001", desc: "Office supplies purchase", debit: "Expenses $450", credit: "Cash $450", status: "Posted" },
                    { ref: "JE-002", desc: "Client invoice payment received", debit: "Cash $8,200", credit: "Revenue $8,200", status: "Posted" },
                    { ref: "JE-003", desc: "Monthly rent accrual", debit: "Rent $3,500", credit: "Payable $3,500", status: "Draft" },
                  ].map((e, i) => (
                    <div key={i} className="rounded-xl bg-sage-50 p-3 text-left opacity-75">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] font-bold text-primary-600">{e.ref}</span>
                        <span className={`text-[10px] font-semibold ${e.status === "Posted" ? "text-primary-600" : "text-amber-500"}`}>{e.status}</span>
                      </div>
                      <p className="text-xs font-medium text-neutral-700">{e.desc}</p>
                      <p className="mt-0.5 text-[10px] text-neutral-400">{e.debit} · {e.credit}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {entries.map((entry) => (
                  <Card key={entry.id} variant="outlined">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      {/* Left: entry details */}
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex items-center gap-2 flex-wrap">
                          <p className="font-mono text-xs font-semibold text-primary-600">
                            {entry.entryNumber}
                          </p>
                          <Badge variant={entryStatusBadgeVariant(entry.status)}>
                            {entry.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-neutral-800">
                          {entry.description}
                        </p>
                        <div className="mt-1.5 flex items-center gap-4 text-xs text-neutral-500">
                          <span>{formatDate(entry.date)}</span>
                          {entry.createdBy && (
                            <span>By: {entry.createdBy}</span>
                          )}
                          {entry.approvedBy && (
                            <span className="text-primary-600">
                              Approved by: {entry.approvedBy}
                            </span>
                          )}
                        </div>
                        {entry.lineItems && (
                          <p className="mt-2 rounded-lg bg-sage-50 px-3 py-2 font-mono text-xs text-neutral-600 line-clamp-2">
                            {parseLineItems(entry.lineItems)}
                          </p>
                        )}
                      </div>

                      {/* Right: approve action */}
                      <div className="flex shrink-0 items-center gap-2">
                        {entry.status === "posted" && (
                          <Button
                            variant="primary"
                            size="sm"
                            loading={approvingId === entry.id}
                            onClick={() => handleApprove(entry.id)}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Approve
                          </Button>
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
      {/*  Add Account Modal                                              */}
      {/* -------------------------------------------------------------- */}
      {showAccountForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowAccountForm(false);
              setAccountFormError(null);
            }}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-bold text-neutral-900">
              Add Account
            </h2>

            <div className="flex flex-col gap-4">
              {/* Code */}
              <Input
                label="Account Code"
                placeholder="e.g. 1000"
                value={accountForm.code}
                onChange={(e) =>
                  setAccountForm((f) => ({ ...f, code: e.target.value }))
                }
              />

              {/* Name */}
              <Input
                label="Account Name"
                placeholder="e.g. Cash & Equivalents"
                value={accountForm.name}
                onChange={(e) =>
                  setAccountForm((f) => ({ ...f, name: e.target.value }))
                }
              />

              {/* Type */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="account-type"
                  className="text-sm font-medium text-neutral-700"
                >
                  Account Type
                </label>
                <select
                  id="account-type"
                  value={accountForm.type}
                  onChange={(e) =>
                    setAccountForm((f) => ({
                      ...f,
                      type: e.target.value as ChartOfAccount["type"],
                    }))
                  }
                  className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  {accountTypes.map((at) => (
                    <option key={at.value} value={at.value}>
                      {at.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="account-description"
                  className="text-sm font-medium text-neutral-700"
                >
                  Description
                </label>
                <textarea
                  id="account-description"
                  rows={2}
                  placeholder="Optional description..."
                  value={accountForm.description}
                  onChange={(e) =>
                    setAccountForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Currency */}
              <Input
                label="Currency"
                placeholder="USD"
                value={accountForm.currency}
                onChange={(e) =>
                  setAccountForm((f) => ({ ...f, currency: e.target.value }))
                }
              />

              {/* Is Active */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accountForm.isActive}
                  onChange={(e) =>
                    setAccountForm((f) => ({
                      ...f,
                      isActive: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-sage-300 text-primary-500 focus:ring-primary-500/20"
                />
                <span className="text-sm font-medium text-neutral-700">
                  Active Account
                </span>
              </label>

              {/* Error */}
              {accountFormError && (
                <p className="text-xs text-red-600">{accountFormError}</p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAccountForm(false);
                    setAccountFormError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={accountSubmitting}
                  onClick={handleAccountSubmit}
                >
                  Create Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/*  New Entry Modal                                                */}
      {/* -------------------------------------------------------------- */}
      {showEntryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowEntryForm(false);
              setEntryFormError(null);
            }}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-bold text-neutral-900">
              New Journal Entry
            </h2>

            <div className="flex flex-col gap-4">
              {/* Date */}
              <Input
                label="Date"
                type="date"
                value={entryForm.date}
                onChange={(e) =>
                  setEntryForm((f) => ({ ...f, date: e.target.value }))
                }
              />

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="entry-description"
                  className="text-sm font-medium text-neutral-700"
                >
                  Description
                </label>
                <textarea
                  id="entry-description"
                  rows={2}
                  placeholder="Describe this journal entry..."
                  value={entryForm.description}
                  onChange={(e) =>
                    setEntryForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Line Items (JSON) */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="entry-line-items"
                  className="text-sm font-medium text-neutral-700"
                >
                  Line Items (JSON)
                </label>
                <textarea
                  id="entry-line-items"
                  rows={5}
                  placeholder={`[{"account":"1000","description":"Cash","debit":500,"credit":0},{"account":"4000","description":"Revenue","debit":0,"credit":500}]`}
                  value={entryForm.lineItems}
                  onChange={(e) =>
                    setEntryForm((f) => ({
                      ...f,
                      lineItems: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 font-mono text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <p className="text-xs text-neutral-400">
                  Array of objects with account, description, debit, and credit
                  fields.
                </p>
              </div>

              {/* Error */}
              {entryFormError && (
                <p className="text-xs text-red-600">{entryFormError}</p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEntryForm(false);
                    setEntryFormError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={entrySubmitting}
                  onClick={handleEntrySubmit}
                >
                  Create Entry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
