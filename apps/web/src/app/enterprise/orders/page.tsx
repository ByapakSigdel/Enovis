"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Order } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type BadgeVariant = "default" | "warning" | "error" | "info";

const FULFILLMENT_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "partial",
  "refunded",
  "failed",
] as const;

const ORDER_TYPES = ["sales", "return", "exchange"] as const;

const fulfillmentBadgeVariant: Record<string, BadgeVariant> = {
  pending: "warning",
  processing: "info",
  shipped: "info",
  delivered: "default",
  cancelled: "error",
};

const paymentBadgeVariant: Record<string, BadgeVariant> = {
  pending: "warning",
  paid: "default",
  partial: "info",
  refunded: "error",
  failed: "error",
};

function formatLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Initial form state                                                 */
/* ------------------------------------------------------------------ */

interface CreateFormState {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  type: string;
  items: string;
  subtotal: string;
  taxTotal: string;
  shippingCost: string;
  discount: string;
  paymentMethod: string;
  channel: string;
  notes: string;
}

const INITIAL_FORM: CreateFormState = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  customerAddress: "",
  type: "sales",
  items: "",
  subtotal: "0",
  taxTotal: "0",
  shippingCost: "0",
  discount: "0",
  paymentMethod: "",
  channel: "",
  notes: "",
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function OrdersPage() {
  const { user } = useAuth();

  /* ---- Orders list state ------------------------------------------- */
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Search and filter ------------------------------------------- */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  /* ---- Expanded order detail --------------------------------------- */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ---- Create modal ------------------------------------------------ */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /* ---- Inline status update ---------------------------------------- */
  const [updatingFulfillment, setUpdatingFulfillment] = useState<string | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /*  Fetch orders                                                      */
  /* ------------------------------------------------------------------ */

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.orders.list();
      if (res.success && res.data) {
        setOrders(res.data as unknown as Order[]);
      } else {
        setError(res.error || "Failed to load orders");
      }
    } catch {
      setError("Network error loading orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ------------------------------------------------------------------ */
  /*  Filtered orders                                                   */
  /* ------------------------------------------------------------------ */

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (statusFilter !== "all") {
      result = result.filter((o) => o.fulfillmentStatus === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, search, statusFilter]);

  /* ------------------------------------------------------------------ */
  /*  Create order                                                      */
  /* ------------------------------------------------------------------ */

  const computedTotal = useMemo(() => {
    const sub = parseFloat(form.subtotal) || 0;
    const tax = parseFloat(form.taxTotal) || 0;
    const ship = parseFloat(form.shippingCost) || 0;
    const disc = parseFloat(form.discount) || 0;
    return Math.max(0, sub + tax + ship - disc);
  }, [form.subtotal, form.taxTotal, form.shippingCost, form.discount]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim()) return;

    setCreating(true);
    setCreateError(null);

    let parsedItems: unknown = null;
    if (form.items.trim()) {
      try {
        parsedItems = JSON.parse(form.items);
      } catch {
        setCreateError("Items must be valid JSON");
        setCreating(false);
        return;
      }
    }

    try {
      const payload: Record<string, unknown> = {
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim() || null,
        customerPhone: form.customerPhone.trim() || null,
        customerAddress: form.customerAddress.trim() || null,
        type: form.type,
        items: parsedItems ? JSON.stringify(parsedItems) : null,
        subtotal: parseFloat(form.subtotal) || 0,
        taxTotal: parseFloat(form.taxTotal) || 0,
        shippingCost: parseFloat(form.shippingCost) || 0,
        discount: parseFloat(form.discount) || 0,
        totalAmount: computedTotal,
        paymentMethod: form.paymentMethod.trim() || null,
        channel: form.channel.trim() || null,
        notes: form.notes.trim() || null,
      };

      const res = await api.orders.create(payload);
      if (res.success) {
        resetCreateModal();
        await fetchOrders();
      } else {
        setCreateError(res.error || "Failed to create order");
      }
    } catch {
      setCreateError("Network error creating order");
    } finally {
      setCreating(false);
    }
  };

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setForm(INITIAL_FORM);
    setCreateError(null);
  };

  /* ------------------------------------------------------------------ */
  /*  Update fulfillment status                                         */
  /* ------------------------------------------------------------------ */

  const handleUpdateFulfillment = async (orderId: string, status: string) => {
    setUpdatingFulfillment(orderId);
    try {
      const res = await api.orders.updateFulfillment(orderId, {
        fulfillmentStatus: status,
      });
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, fulfillmentStatus: status } : o
          )
        );
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setUpdatingFulfillment(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Update payment status                                             */
  /* ------------------------------------------------------------------ */

  const handleUpdatePayment = async (orderId: string, status: string) => {
    setUpdatingPayment(orderId);
    try {
      const res = await api.orders.updatePayment(orderId, {
        paymentStatus: status,
      });
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, paymentStatus: status } : o
          )
        );
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setUpdatingPayment(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Parse items JSON safely                                           */
  /* ------------------------------------------------------------------ */

  function parseItems(items?: string | null): Record<string, unknown>[] | null {
    if (!items) return null;
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

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
            <h1 className="text-2xl font-bold text-neutral-800">Orders</h1>
            {!loading && (
              <p className="mt-0.5 text-sm text-neutral-500">
                {filteredOrders.length}{" "}
                {filteredOrders.length === 1 ? "order" : "orders"}
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
            New Order
          </Button>
        </div>

        {/* ============================================================ */}
        {/*  Search / Filter bar                                         */}
        {/* ============================================================ */}
        <Card variant="outlined" className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Search"
                placeholder="Order number or customer name..."
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
                Fulfillment Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:w-48"
              >
                <option value="all">All Statuses</option>
                {FULFILLMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {formatLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* ============================================================ */}
        {/*  Orders list                                                  */}
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
            <p className="text-sm text-neutral-500">Loading orders...</p>
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
              onClick={fetchOrders}
              className="mt-3 text-sm font-medium text-primary-500 hover:underline"
            >
              Retry
            </button>
          </Card>
        ) : filteredOrders.length === 0 ? (
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
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <p className="text-base font-semibold text-neutral-700">
              {search || statusFilter !== "all"
                ? "No matching orders"
                : "No orders yet"}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Create your first order to get started."}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredOrders.map((order) => {
              const isExpanded = expandedId === order.id;
              const items = parseItems(order.items);

              return (
                <Card key={order.id} variant="outlined" padding={false}>
                  {/* ---- Order summary row ------------------------------ */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : order.id)
                    }
                    className="flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-sage-50/50 sm:flex-row sm:items-center"
                  >
                    {/* Left: order identity */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-neutral-800">
                          #{order.orderNumber}
                        </span>
                        <Badge
                          variant={
                            fulfillmentBadgeVariant[order.fulfillmentStatus] ??
                            "warning"
                          }
                        >
                          {formatLabel(order.fulfillmentStatus)}
                        </Badge>
                        <Badge
                          variant={
                            paymentBadgeVariant[order.paymentStatus] ??
                            "warning"
                          }
                        >
                          {formatLabel(order.paymentStatus)}
                        </Badge>
                        {order.type && order.type !== "sales" && (
                          <Badge variant="info">
                            {formatLabel(order.type)}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-neutral-700">
                        {order.customerName}
                        {order.customerEmail && (
                          <span className="ml-2 text-neutral-400">
                            {order.customerEmail}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Right: amount, channel, date, chevron */}
                    <div className="flex shrink-0 items-center gap-4">
                      {order.channel && (
                        <span className="hidden text-xs text-neutral-500 sm:inline">
                          {order.channel}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-primary-600">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      <span className="hidden text-xs text-neutral-400 sm:inline">
                        {formatDateTime(order.createdAt)}
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

                  {/* ---- Expanded detail -------------------------------- */}
                  {isExpanded && (
                    <div className="border-t border-sage-100 bg-sage-50/30 px-5 py-4">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Order details */}
                        <div className="space-y-2 text-sm">
                          <h4 className="font-semibold text-neutral-700">
                            Order Details
                          </h4>
                          <div className="space-y-1 text-neutral-600">
                            <p>
                              <span className="text-neutral-400">Type:</span>{" "}
                              {formatLabel(order.type || "sales")}
                            </p>
                            <p>
                              <span className="text-neutral-400">
                                Subtotal:
                              </span>{" "}
                              {formatCurrency(order.subtotal)}
                            </p>
                            <p>
                              <span className="text-neutral-400">Tax:</span>{" "}
                              {formatCurrency(order.taxTotal)}
                            </p>
                            <p>
                              <span className="text-neutral-400">
                                Shipping:
                              </span>{" "}
                              {formatCurrency(order.shippingCost)}
                            </p>
                            <p>
                              <span className="text-neutral-400">
                                Discount:
                              </span>{" "}
                              {formatCurrency(order.discount)}
                            </p>
                            <p className="font-medium text-neutral-800">
                              <span className="text-neutral-400">Total:</span>{" "}
                              {formatCurrency(order.totalAmount)}
                            </p>
                            {order.paymentMethod && (
                              <p>
                                <span className="text-neutral-400">
                                  Payment:
                                </span>{" "}
                                {order.paymentMethod}
                              </p>
                            )}
                            {order.channel && (
                              <p>
                                <span className="text-neutral-400">
                                  Channel:
                                </span>{" "}
                                {order.channel}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Shipping & tracking */}
                        <div className="space-y-2 text-sm">
                          <h4 className="font-semibold text-neutral-700">
                            Shipping
                          </h4>
                          <div className="space-y-1 text-neutral-600">
                            <p>
                              <span className="text-neutral-400">
                                Address:
                              </span>{" "}
                              {order.shippingAddress || order.customerAddress || "-"}
                            </p>
                            <p>
                              <span className="text-neutral-400">
                                Tracking:
                              </span>{" "}
                              {order.trackingNumber || "-"}
                            </p>
                            {order.customerPhone && (
                              <p>
                                <span className="text-neutral-400">
                                  Phone:
                                </span>{" "}
                                {order.customerPhone}
                              </p>
                            )}
                            {order.notes && (
                              <p>
                                <span className="text-neutral-400">
                                  Notes:
                                </span>{" "}
                                {order.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2 text-sm">
                          <h4 className="font-semibold text-neutral-700">
                            Items
                          </h4>
                          {items && items.length > 0 ? (
                            <ul className="space-y-1.5">
                              {items.map((item, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-neutral-600"
                                >
                                  <span className="truncate">
                                    {String((item as Record<string, unknown>).name || (item as Record<string, unknown>).sku || `Item ${idx + 1}`)}
                                    {(item as Record<string, unknown>).quantity ? (
                                      <span className="ml-1 text-neutral-400">
                                        x{String((item as Record<string, unknown>).quantity)}
                                      </span>
                                    ) : null}
                                  </span>
                                  {(item as Record<string, unknown>).price != null && (
                                    <span className="ml-2 shrink-0 font-medium text-neutral-700">
                                      {formatCurrency(
                                        Number((item as Record<string, unknown>).price)
                                      )}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-neutral-400">No items listed</p>
                          )}
                        </div>
                      </div>

                      {/* ---- Status update actions ---------------------- */}
                      <div className="mt-5 flex flex-col gap-3 border-t border-sage-100 pt-4 sm:flex-row sm:items-end">
                        {/* Fulfillment status update */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-neutral-500">
                            Update Fulfillment
                          </label>
                          <select
                            value={order.fulfillmentStatus}
                            onChange={(e) =>
                              handleUpdateFulfillment(order.id, e.target.value)
                            }
                            disabled={updatingFulfillment === order.id}
                            className={cn(
                              "rounded-xl border border-sage-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
                              updatingFulfillment === order.id &&
                                "opacity-50 pointer-events-none"
                            )}
                          >
                            {FULFILLMENT_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {formatLabel(s)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Payment status update */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-neutral-500">
                            Update Payment
                          </label>
                          <select
                            value={order.paymentStatus}
                            onChange={(e) =>
                              handleUpdatePayment(order.id, e.target.value)
                            }
                            disabled={updatingPayment === order.id}
                            className={cn(
                              "rounded-xl border border-sage-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
                              updatingPayment === order.id &&
                                "opacity-50 pointer-events-none"
                            )}
                          >
                            {PAYMENT_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {formatLabel(s)}
                              </option>
                            ))}
                          </select>
                        </div>
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
      {/*  CREATE ORDER MODAL                                            */}
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
                New Order
              </h2>
              <p className="mb-5 text-sm text-neutral-500">
                Create a new order for a customer.
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
                    value={form.customerName}
                    onChange={(e) =>
                      setForm((f) => ({
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
                    value={form.customerEmail}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        customerEmail: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Phone"
                    placeholder="+1 (555) 000-0000"
                    value={form.customerPhone}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        customerPhone: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Address"
                    placeholder="123 Main St, City, State"
                    value={form.customerAddress}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        customerAddress: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Order type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    Order Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value }))
                    }
                    className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    {ORDER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {formatLabel(t)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Items */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    Items (JSON)
                  </label>
                  <textarea
                    value={form.items}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, items: e.target.value }))
                    }
                    placeholder='[{"name": "Widget", "quantity": 2, "price": 19.99}]'
                    rows={3}
                    className="w-full resize-none rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 font-mono text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                {/* Pricing */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    label="Subtotal"
                    type="number"
                    value={form.subtotal}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, subtotal: e.target.value }))
                    }
                  />
                  <Input
                    label="Tax"
                    type="number"
                    value={form.taxTotal}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, taxTotal: e.target.value }))
                    }
                  />
                  <Input
                    label="Shipping"
                    type="number"
                    value={form.shippingCost}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        shippingCost: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Discount"
                    type="number"
                    value={form.discount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discount: e.target.value }))
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

                {/* Payment & channel */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Payment Method"
                    placeholder="e.g. credit_card, cash, paypal"
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        paymentMethod: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Channel"
                    placeholder="e.g. online, in-store, phone"
                    value={form.channel}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, channel: e.target.value }))
                    }
                  />
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="Any additional notes for this order..."
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
                    disabled={!form.customerName.trim()}
                  >
                    Create Order
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
