"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Invoice, InvoicePayment } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ProgressBar from "@/components/ui/ProgressBar";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type BadgeVariant = "default" | "warning" | "error" | "info";

const STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
  paid: "default",
  draft: "warning",
  sent: "info",
  overdue: "error",
  partial: "warning",
  cancelled: "error",
};

const INVOICE_STATUSES = [
  "all",
  "draft",
  "sent",
  "paid",
  "partial",
  "overdue",
  "cancelled",
] as const;

const PAYMENT_METHODS = [
  "cash",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "check",
  "paypal",
  "other",
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Create Invoice form state                                          */
/* ------------------------------------------------------------------ */

interface CreateFormState {
  customerName: string;
  customerEmail: string;
  invoiceNumber: string;
  subtotal: string;
  taxAmount: string;
  discount: string;
  dueDate: string;
  paymentTerms: string;
  notes: string;
}

const INITIAL_CREATE_FORM: CreateFormState = {
  customerName: "",
  customerEmail: "",
  invoiceNumber: "",
  subtotal: "0",
  taxAmount: "0",
  discount: "0",
  dueDate: "",
  paymentTerms: "",
  notes: "",
};

/* ------------------------------------------------------------------ */
/*  Record Payment form state                                          */
/* ------------------------------------------------------------------ */

interface PaymentFormState {
  amount: string;
  method: string;
  reference: string;
  date: string;
  notes: string;
}

const INITIAL_PAYMENT_FORM: PaymentFormState = {
  amount: "",
  method: "bank_transfer",
  reference: "",
  date: "",
  notes: "",
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function InvoicesPage() {
  const { user } = useAuth();

  /* ---- Invoice list state ----------------------------------------- */
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Search & filter -------------------------------------------- */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  /* ---- Expanded row ----------------------------------------------- */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ---- Create Invoice modal --------------------------------------- */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(INITIAL_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /* ---- Record Payment modal --------------------------------------- */
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(INITIAL_PAYMENT_FORM);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  /* ---- Action loading states -------------------------------------- */
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /*  Fetch invoices                                                    */
  /* ------------------------------------------------------------------ */

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.invoices.list();
      if (res.success && res.data) {
        setInvoices(res.data as unknown as Invoice[]);
      } else {
        setError(res.error || "Failed to load invoices");
      }
    } catch {
      setError("Network error loading invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  /* ------------------------------------------------------------------ */
  /*  Summary stats                                                     */
  /* ------------------------------------------------------------------ */

  const stats = useMemo(() => {
    const totalCount = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const amountPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const outstanding = totalAmount - amountPaid;
    return { totalCount, totalAmount, amountPaid, outstanding };
  }, [invoices]);

  /* ------------------------------------------------------------------ */
  /*  Filtered invoices                                                 */
  /* ------------------------------------------------------------------ */

  const filteredInvoices = useMemo(() => {
    let result = invoices;

    if (statusFilter !== "all") {
      result = result.filter((inv) => inv.status === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          (inv.customerEmail && inv.customerEmail.toLowerCase().includes(q))
      );
    }

    return result;
  }, [invoices, search, statusFilter]);

  /* ------------------------------------------------------------------ */
  /*  Create invoice                                                    */
  /* ------------------------------------------------------------------ */

  const computedTotal = useMemo(() => {
    const sub = parseFloat(createForm.subtotal) || 0;
    const tax = parseFloat(createForm.taxAmount) || 0;
    const disc = parseFloat(createForm.discount) || 0;
    return Math.max(0, sub + tax - disc);
  }, [createForm.subtotal, createForm.taxAmount, createForm.discount]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.customerName.trim()) return;

    setCreating(true);
    setCreateError(null);

    try {
      const payload: Record<string, unknown> = {
        customerName: createForm.customerName.trim(),
        customerEmail: createForm.customerEmail.trim() || null,
        invoiceNumber: createForm.invoiceNumber.trim() || undefined,
        subtotal: parseFloat(createForm.subtotal) || 0,
        taxAmount: parseFloat(createForm.taxAmount) || 0,
        discount: parseFloat(createForm.discount) || 0,
        total: computedTotal,
        dueDate: createForm.dueDate || null,
        paymentTerms: createForm.paymentTerms.trim() || null,
        notes: createForm.notes.trim() || null,
      };

      const res = await api.invoices.create(payload);
      if (res.success) {
        resetCreateModal();
        await fetchInvoices();
      } else {
        setCreateError(res.error || "Failed to create invoice");
      }
    } catch {
      setCreateError("Network error creating invoice");
    } finally {
      setCreating(false);
    }
  };

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm(INITIAL_CREATE_FORM);
    setCreateError(null);
  };

  /* ------------------------------------------------------------------ */
  /*  Send invoice                                                      */
  /* ------------------------------------------------------------------ */

  const handleSend = async (id: string) => {
    setSendingId(id);
    try {
      const res = await api.invoices.send(id);
      if (res.success) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === id ? { ...inv, status: "sent" } : inv
          )
        );
      }
    } catch {
      // Silently fail - user can retry
    } finally {
      setSendingId(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Delete invoice                                                    */
  /* ------------------------------------------------------------------ */

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await api.invoices.delete(id);
      if (res.success) {
        setInvoices((prev) => prev.filter((inv) => inv.id !== id));
        if (expandedId === id) setExpandedId(null);
      }
    } catch {
      // Silently fail - user can retry
    } finally {
      setDeletingId(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Record payment                                                    */
  /* ------------------------------------------------------------------ */

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoiceId) return;

    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      setPaymentError("Please enter a valid payment amount");
      return;
    }

    setRecordingPayment(true);
    setPaymentError(null);

    try {
      const payload: Record<string, unknown> = {
        amount,
        method: paymentForm.method,
        reference: paymentForm.reference.trim() || null,
        date: paymentForm.date || null,
        notes: paymentForm.notes.trim() || null,
      };

      const res = await api.invoices.payments.add(paymentInvoiceId, payload);
      if (res.success) {
        resetPaymentModal();
        await fetchInvoices();
      } else {
        setPaymentError(res.error || "Failed to record payment");
      }
    } catch {
      setPaymentError("Network error recording payment");
    } finally {
      setRecordingPayment(false);
    }
  };

  const openPaymentModal = (invoiceId: string) => {
    setPaymentInvoiceId(invoiceId);
    setPaymentForm(INITIAL_PAYMENT_FORM);
    setPaymentError(null);
  };

  const resetPaymentModal = () => {
    setPaymentInvoiceId(null);
    setPaymentForm(INITIAL_PAYMENT_FORM);
    setPaymentError(null);
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-[#fafdf7]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ============================================================ */}
        {/*  Header                                                      */}
        {/* ============================================================ */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-400">
              Enterprise
            </p>
            <h1 className="text-2xl font-bold text-neutral-800">
              Invoices &amp; Billing
            </h1>
            {!loading && (
              <p className="mt-0.5 text-sm text-neutral-500">
                {filteredInvoices.length}{" "}
                {filteredInvoices.length === 1 ? "invoice" : "invoices"}
                {statusFilter !== "all" && (
                  <span className="text-neutral-400">
                    {" "}
                    &middot; filtered by {formatLabel(statusFilter)}
                  </span>
                )}
              </p>
            )}
          </div>

          <Button onClick={() => setShowCreateModal(true)}>
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
            New Invoice
          </Button>
        </div>

        {/* ============================================================ */}
        {/*  Summary Stats                                                */}
        {/* ============================================================ */}
        {!loading && !error && (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* Total Invoices */}
            <Card variant="outlined">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-neutral-500">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-neutral-500">
                    Total Invoices
                  </p>
                  <p className="text-xl font-bold text-neutral-800">
                    {stats.totalCount}
                  </p>
                </div>
              </div>
            </Card>

            {/* Total Amount */}
            <Card variant="outlined">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-neutral-500">
                    Total Amount
                  </p>
                  <p className="text-xl font-bold text-neutral-800">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Amount Paid */}
            <Card variant="outlined">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-neutral-500">
                    Amount Paid
                  </p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatCurrency(stats.amountPaid)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Outstanding */}
            <Card variant="outlined">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-neutral-500">
                    Outstanding
                  </p>
                  <p className={cn(
                    "text-xl font-bold",
                    stats.outstanding > 0 ? "text-amber-600" : "text-neutral-800"
                  )}>
                    {formatCurrency(stats.outstanding)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ============================================================ */}
        {/*  Search / Filter bar                                         */}
        {/* ============================================================ */}
        <Card variant="outlined" className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Search"
                placeholder="Invoice number, customer name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={
                  <svg
                    width="16"
                    height="16"
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
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:w-48"
              >
                {INVOICE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All Statuses" : formatLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* ============================================================ */}
        {/*  Invoice List                                                 */}
        {/* ============================================================ */}
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-24">
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
            <p className="text-sm text-neutral-500">Loading invoices...</p>
          </div>
        ) : error ? (
          <Card variant="outlined" className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-400">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              onClick={fetchInvoices}
              className="mt-3 text-sm font-medium text-primary-500 hover:underline"
            >
              Retry
            </button>
          </Card>
        ) : filteredInvoices.length === 0 ? (
          <Card variant="outlined" className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-100 text-neutral-400">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <p className="text-base font-semibold text-neutral-700">
              {search || statusFilter !== "all"
                ? "No matching invoices"
                : "No invoices yet"}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Create your first invoice to get started."}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredInvoices.map((invoice) => {
              const isExpanded = expandedId === invoice.id;
              const paymentProgress =
                invoice.total > 0
                  ? (invoice.amountPaid / invoice.total) * 100
                  : 0;

              return (
                <Card key={invoice.id} variant="outlined" padding={false}>
                  {/* ---- Invoice summary row -------------------------- */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : invoice.id)
                    }
                    className="flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-sage-50/50 sm:flex-row sm:items-center"
                  >
                    {/* Left: invoice identity */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-neutral-800">
                          #{invoice.invoiceNumber}
                        </span>
                        <Badge
                          variant={
                            STATUS_BADGE_VARIANT[invoice.status] ?? "warning"
                          }
                        >
                          {formatLabel(invoice.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-neutral-700">
                        {invoice.customerName}
                        {invoice.customerEmail && (
                          <span className="ml-2 text-neutral-400">
                            {invoice.customerEmail}
                          </span>
                        )}
                      </p>
                      {/* Payment progress */}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="w-32">
                          <ProgressBar
                            value={paymentProgress}
                            size="sm"
                          />
                        </div>
                        <span className="text-xs text-neutral-500">
                          {formatCurrency(invoice.amountPaid)} of{" "}
                          {formatCurrency(invoice.total)}
                        </span>
                      </div>
                    </div>

                    {/* Right: amount, due date, chevron */}
                    <div className="flex shrink-0 items-center gap-4">
                      {invoice.dueDate && (
                        <span className="hidden text-xs text-neutral-400 sm:inline">
                          Due {formatDate(invoice.dueDate)}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-primary-600">
                        {formatCurrency(invoice.total)}
                      </span>
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
                          "shrink-0 text-neutral-400 transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {/* ---- Expanded detail ------------------------------ */}
                  {isExpanded && (
                    <div className="border-t border-sage-100 bg-sage-50/30 px-5 py-4">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Invoice details */}
                        <div className="space-y-2 text-sm">
                          <h4 className="font-semibold text-neutral-700">
                            Invoice Details
                          </h4>
                          <div className="space-y-1 text-neutral-600">
                            <p>
                              <span className="text-neutral-400">Issued:</span>{" "}
                              {formatDate(invoice.issuedDate)}
                            </p>
                            <p>
                              <span className="text-neutral-400">Due:</span>{" "}
                              {formatDate(invoice.dueDate)}
                            </p>
                            {invoice.paymentTerms && (
                              <p>
                                <span className="text-neutral-400">Terms:</span>{" "}
                                {invoice.paymentTerms}
                              </p>
                            )}
                            {invoice.customerAddress && (
                              <p>
                                <span className="text-neutral-400">Address:</span>{" "}
                                {invoice.customerAddress}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Financial breakdown */}
                        <div className="space-y-2 text-sm">
                          <h4 className="font-semibold text-neutral-700">
                            Financial
                          </h4>
                          <div className="space-y-1 text-neutral-600">
                            <p>
                              <span className="text-neutral-400">Subtotal:</span>{" "}
                              {formatCurrency(invoice.subtotal)}
                            </p>
                            <p>
                              <span className="text-neutral-400">Tax:</span>{" "}
                              {formatCurrency(invoice.taxAmount)}
                            </p>
                            <p>
                              <span className="text-neutral-400">Discount:</span>{" "}
                              {formatCurrency(invoice.discount)}
                            </p>
                            <p className="font-medium text-neutral-800">
                              <span className="text-neutral-400">Total:</span>{" "}
                              {formatCurrency(invoice.total)}
                            </p>
                            <p>
                              <span className="text-neutral-400">Paid:</span>{" "}
                              <span className="text-emerald-600">
                                {formatCurrency(invoice.amountPaid)}
                              </span>
                            </p>
                            <p className="font-medium">
                              <span className="text-neutral-400">Outstanding:</span>{" "}
                              <span className={cn(
                                invoice.total - invoice.amountPaid > 0
                                  ? "text-amber-600"
                                  : "text-neutral-800"
                              )}>
                                {formatCurrency(invoice.total - invoice.amountPaid)}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Notes & metadata */}
                        <div className="space-y-2 text-sm">
                          <h4 className="font-semibold text-neutral-700">
                            Notes
                          </h4>
                          <div className="space-y-1 text-neutral-600">
                            {invoice.notes ? (
                              <p>{invoice.notes}</p>
                            ) : (
                              <p className="text-neutral-400">No notes</p>
                            )}
                            {invoice.createdBy && (
                              <p className="mt-2">
                                <span className="text-neutral-400">Created by:</span>{" "}
                                {invoice.createdBy}
                              </p>
                            )}
                            {invoice.createdAt && (
                              <p>
                                <span className="text-neutral-400">Created:</span>{" "}
                                {formatDate(invoice.createdAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ---- Payment progress bar full width ---------- */}
                      <div className="mt-4 rounded-xl bg-white p-4">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium text-neutral-700">
                            Payment Progress
                          </span>
                          <span className="text-xs text-neutral-500">
                            {Math.round(paymentProgress)}%
                          </span>
                        </div>
                        <ProgressBar value={paymentProgress} size="md" />
                      </div>

                      {/* ---- Actions ---------------------------------- */}
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-sage-100 pt-4">
                        {/* Send - only for draft invoices */}
                        {invoice.status === "draft" && (
                          <Button
                            variant="primary"
                            size="sm"
                            loading={sendingId === invoice.id}
                            onClick={() => handleSend(invoice.id)}
                          >
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
                              <line x1="22" y1="2" x2="11" y2="13" />
                              <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                            Send Invoice
                          </Button>
                        )}

                        {/* Record Payment - not for paid/cancelled */}
                        {invoice.status !== "paid" &&
                          invoice.status !== "cancelled" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openPaymentModal(invoice.id)}
                            >
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
                                <rect
                                  x="1"
                                  y="4"
                                  width="22"
                                  height="16"
                                  rx="2"
                                  ry="2"
                                />
                                <line x1="1" y1="10" x2="23" y2="10" />
                              </svg>
                              Record Payment
                            </Button>
                          )}

                        {/* Delete */}
                        <Button
                          variant="danger"
                          size="sm"
                          loading={deletingId === invoice.id}
                          onClick={() => handleDelete(invoice.id)}
                        >
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
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/*  CREATE INVOICE MODAL                                          */}
      {/* ============================================================== */}
      {showCreateModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={resetCreateModal}
          />

          {/* Modal */}
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-3xl bg-white p-6 shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
            <div className="max-h-[80vh] overflow-y-auto">
              <h2 className="mb-1 text-lg font-bold text-neutral-800">
                New Invoice
              </h2>
              <p className="mb-5 text-sm text-neutral-500">
                Create a new invoice for a customer.
              </p>

              <form
                onSubmit={handleCreateSubmit}
                className="flex flex-col gap-4"
              >
                {/* Customer info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Customer Name *"
                    placeholder="John Doe"
                    value={createForm.customerName}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        customerName: e.target.value,
                      }))
                    }
                    required
                    autoFocus
                  />
                  <Input
                    label="Customer Email"
                    placeholder="john@example.com"
                    type="email"
                    value={createForm.customerEmail}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        customerEmail: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Invoice number */}
                <Input
                  label="Invoice Number"
                  placeholder="INV-001 (auto-generated if blank)"
                  value={createForm.invoiceNumber}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      invoiceNumber: e.target.value,
                    }))
                  }
                />

                {/* Pricing */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    label="Subtotal"
                    type="number"
                    step="0.01"
                    value={createForm.subtotal}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        subtotal: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Tax Amount"
                    type="number"
                    step="0.01"
                    value={createForm.taxAmount}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        taxAmount: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Discount"
                    type="number"
                    step="0.01"
                    value={createForm.discount}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        discount: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Computed total */}
                <div className="flex items-center justify-between rounded-xl bg-primary-50 px-4 py-3">
                  <span className="text-sm font-medium text-primary-700">
                    Total Amount
                  </span>
                  <span className="text-lg font-bold text-primary-600">
                    {formatCurrency(computedTotal)}
                  </span>
                </div>

                {/* Due date & Payment terms */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Due Date"
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        dueDate: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Payment Terms"
                    placeholder="e.g. Net 30"
                    value={createForm.paymentTerms}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        paymentTerms: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    Notes
                  </label>
                  <textarea
                    value={createForm.notes}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="Any additional notes for this invoice..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                {/* Error */}
                {createError && (
                  <p className="text-xs text-red-500">{createError}</p>
                )}

                {/* Actions */}
                <div className="mt-2 flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={resetCreateModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    loading={creating}
                    disabled={!createForm.customerName.trim()}
                  >
                    Create Invoice
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/*  RECORD PAYMENT MODAL                                          */}
      {/* ============================================================== */}
      {paymentInvoiceId !== null && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={resetPaymentModal}
          />

          {/* Modal */}
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
            <div className="max-h-[80vh] overflow-y-auto">
              <h2 className="mb-1 text-lg font-bold text-neutral-800">
                Record Payment
              </h2>
              {(() => {
                const inv = invoices.find((i) => i.id === paymentInvoiceId);
                if (inv) {
                  return (
                    <p className="mb-5 text-sm text-neutral-500">
                      Invoice #{inv.invoiceNumber} &middot; Outstanding:{" "}
                      <span className="font-medium text-amber-600">
                        {formatCurrency(inv.total - inv.amountPaid)}
                      </span>
                    </p>
                  );
                }
                return (
                  <p className="mb-5 text-sm text-neutral-500">
                    Record a payment for this invoice.
                  </p>
                );
              })()}

              <form
                onSubmit={handlePaymentSubmit}
                className="flex flex-col gap-4"
              >
                {/* Amount */}
                <Input
                  label="Amount *"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((f) => ({
                      ...f,
                      amount: e.target.value,
                    }))
                  }
                  required
                  autoFocus
                />

                {/* Payment method */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) =>
                      setPaymentForm((f) => ({
                        ...f,
                        method: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m
                          .split("_")
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reference */}
                <Input
                  label="Reference"
                  placeholder="Check #, transaction ID, etc."
                  value={paymentForm.reference}
                  onChange={(e) =>
                    setPaymentForm((f) => ({
                      ...f,
                      reference: e.target.value,
                    }))
                  }
                />

                {/* Date */}
                <Input
                  label="Payment Date"
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) =>
                    setPaymentForm((f) => ({
                      ...f,
                      date: e.target.value,
                    }))
                  }
                />

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    Notes
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) =>
                      setPaymentForm((f) => ({
                        ...f,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Optional payment notes..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                {/* Error */}
                {paymentError && (
                  <p className="text-xs text-red-500">{paymentError}</p>
                )}

                {/* Actions */}
                <div className="mt-2 flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={resetPaymentModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    loading={recordingPayment}
                    disabled={!paymentForm.amount}
                  >
                    Record Payment
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
