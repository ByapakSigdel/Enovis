"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { InventoryProduct, StockMovement } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ProgressBar from "@/components/ui/ProgressBar";
import { Package } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type BadgeVariant = "default" | "warning" | "error" | "info";

const STATUS_OPTIONS = ["active", "discontinued", "out_of_stock"] as const;
const MOVEMENT_TYPES = ["in", "out", "transfer", "adjustment"] as const;

const statusBadgeVariant: Record<string, BadgeVariant> = {
  active: "default",
  discontinued: "error",
  out_of_stock: "warning",
};

function formatLabel(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
/*  Initial form states                                                */
/* ------------------------------------------------------------------ */

interface CreateProductForm {
  name: string;
  sku: string;
  description: string;
  category: string;
  brand: string;
  costPrice: string;
  sellingPrice: string;
  stockLevel: string;
  reorderPoint: string;
  unit: string;
  location: string;
  status: string;
}

const INITIAL_PRODUCT_FORM: CreateProductForm = {
  name: "",
  sku: "",
  description: "",
  category: "",
  brand: "",
  costPrice: "0",
  sellingPrice: "0",
  stockLevel: "0",
  reorderPoint: "0",
  unit: "",
  location: "",
  status: "active",
};

interface CreateMovementForm {
  type: string;
  quantity: string;
  reason: string;
  fromLocation: string;
  toLocation: string;
}

const INITIAL_MOVEMENT_FORM: CreateMovementForm = {
  type: "in",
  quantity: "0",
  reason: "",
  fromLocation: "",
  toLocation: "",
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function InventoryPage() {
  const { user } = useAuth();

  /* ---- Product list state ------------------------------------------ */
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Search / filter ---------------------------------------------- */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  /* ---- Expanded product detail -------------------------------------- */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);

  /* ---- Create product modal ----------------------------------------- */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<CreateProductForm>(INITIAL_PRODUCT_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /* ---- Add movement form -------------------------------------------- */
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementForm, setMovementForm] = useState<CreateMovementForm>(INITIAL_MOVEMENT_FORM);
  const [creatingMovement, setCreatingMovement] = useState(false);
  const [movementError, setMovementError] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /*  Fetch products                                                    */
  /* ------------------------------------------------------------------ */

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.inventory.list();
      if (res.success && res.data) {
        setProducts(res.data as unknown as InventoryProduct[]);
      } else {
        setError(res.error || "Failed to load inventory");
      }
    } catch {
      setError("Network error loading inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* ------------------------------------------------------------------ */
  /*  Fetch stock movements for expanded product                        */
  /* ------------------------------------------------------------------ */

  const fetchMovements = useCallback(async (productId: string) => {
    setMovementsLoading(true);
    setMovementsError(null);
    try {
      const res = await api.inventory.stock.list(productId);
      if (res.success && res.data) {
        setMovements(res.data as unknown as StockMovement[]);
      } else {
        setMovementsError(res.error || "Failed to load stock movements");
      }
    } catch {
      setMovementsError("Network error loading stock movements");
    } finally {
      setMovementsLoading(false);
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Handle expand / collapse                                          */
  /* ------------------------------------------------------------------ */

  const handleToggleExpand = useCallback(
    (productId: string) => {
      if (expandedId === productId) {
        setExpandedId(null);
        setMovements([]);
        setShowMovementForm(false);
        setMovementForm(INITIAL_MOVEMENT_FORM);
        setMovementError(null);
      } else {
        setExpandedId(productId);
        setShowMovementForm(false);
        setMovementForm(INITIAL_MOVEMENT_FORM);
        setMovementError(null);
        fetchMovements(productId);
      }
    },
    [expandedId, fetchMovements]
  );

  /* ------------------------------------------------------------------ */
  /*  Filtered products                                                 */
  /* ------------------------------------------------------------------ */

  const filteredProducts = useMemo(() => {
    let result = products;

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }

    return result;
  }, [products, search, statusFilter]);

  /* ------------------------------------------------------------------ */
  /*  Create product                                                    */
  /* ------------------------------------------------------------------ */

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) return;

    setCreating(true);
    setCreateError(null);

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        brand: form.brand.trim() || null,
        costPrice: parseFloat(form.costPrice) || 0,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        stockLevel: parseInt(form.stockLevel, 10) || 0,
        reorderPoint: parseInt(form.reorderPoint, 10) || 0,
        unit: form.unit.trim() || null,
        location: form.location.trim() || null,
        status: form.status,
      };

      const res = await api.inventory.create(payload);
      if (res.success) {
        resetCreateModal();
        await fetchProducts();
      } else {
        setCreateError(res.error || "Failed to create product");
      }
    } catch {
      setCreateError("Network error creating product");
    } finally {
      setCreating(false);
    }
  };

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setForm(INITIAL_PRODUCT_FORM);
    setCreateError(null);
  };

  /* ------------------------------------------------------------------ */
  /*  Create stock movement                                             */
  /* ------------------------------------------------------------------ */

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedId) return;

    const qty = parseInt(movementForm.quantity, 10);
    if (!qty || qty <= 0) return;

    setCreatingMovement(true);
    setMovementError(null);

    try {
      const payload: Record<string, unknown> = {
        type: movementForm.type,
        quantity: qty,
        reason: movementForm.reason.trim() || null,
        fromLocation: movementForm.fromLocation.trim() || null,
        toLocation: movementForm.toLocation.trim() || null,
      };

      const res = await api.inventory.stock.create(expandedId, payload);
      if (res.success) {
        setShowMovementForm(false);
        setMovementForm(INITIAL_MOVEMENT_FORM);
        setMovementError(null);
        await fetchMovements(expandedId);
        await fetchProducts();
      } else {
        setMovementError(res.error || "Failed to create movement");
      }
    } catch {
      setMovementError("Network error creating movement");
    } finally {
      setCreatingMovement(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Stock level helpers                                                */
  /* ------------------------------------------------------------------ */

  function getStockPercent(product: InventoryProduct): number {
    if (product.reorderPoint <= 0) return 100;
    // Scale from 0 to 2x reorder point as 0-100%
    const max = product.reorderPoint * 2;
    return Math.min(100, Math.max(0, (product.stockLevel / max) * 100));
  }

  function getStockColor(product: InventoryProduct): string {
    if (product.stockLevel <= 0) return "#ef4444"; // red
    if (product.stockLevel <= product.reorderPoint) return "#f59e0b"; // amber
    return "#4ade80"; // green
  }

  function isLowStock(product: InventoryProduct): boolean {
    return product.stockLevel <= product.reorderPoint;
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
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
            <h1 className="text-2xl font-bold text-neutral-800">Inventory</h1>
            {!loading && (
              <p className="mt-0.5 text-sm text-neutral-500">
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "product" : "products"}
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
            Add Product
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
                placeholder="Search by product name or SKU..."
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
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {formatLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* ============================================================ */}
        {/*  Product grid                                                */}
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
            <p className="text-sm text-neutral-500">Loading inventory...</p>
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
              onClick={fetchProducts}
              className="mt-3 text-sm font-medium text-primary-500 hover:underline"
            >
              Retry
            </button>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card variant="elevated" className="overflow-hidden py-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl shadow-sm"><Package className="w-8 h-8 text-primary-500" /></div>
              <div>
                <p className="text-base font-semibold text-neutral-700">
                  {search || statusFilter !== "all"
                    ? "No matching products"
                    : "Stock your inventory"}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {search || statusFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : "Track products, manage stock levels, get low-stock alerts, and record every movement."}
                </p>
              </div>
              {!(search || statusFilter !== "all") && (
                <div className="w-full max-w-sm space-y-2 px-4">
                  {[
                    { name: "Premium Laptop Stand", sku: "SKU-1042", qty: 24, status: "In Stock" },
                    { name: "Wireless Keyboard", sku: "SKU-2017", qty: 3, status: "Low Stock" },
                    { name: "USB-C Hub 7-port", sku: "SKU-3085", qty: 0, status: "Out of Stock" },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-sage-50 p-3 text-left opacity-75">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-neutral-800">{p.name}</p>
                        <p className="text-[10px] text-neutral-400">{p.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-neutral-700">{p.qty} units</p>
                        <p className={`text-[10px] font-semibold ${p.status === "In Stock" ? "text-primary-600" : p.status === "Low Stock" ? "text-amber-500" : "text-red-500"}`}>{p.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
              const isExpanded = expandedId === product.id;
              const lowStock = isLowStock(product);

              return (
                <div key={product.id} className={cn("flex flex-col", isExpanded && "sm:col-span-2 lg:col-span-3")}>
                  <Card variant="outlined" padding={false}>
                    {/* ---- Product card header ------------------------- */}
                    <button
                      type="button"
                      onClick={() => handleToggleExpand(product.id)}
                      className="flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-sage-50/50"
                    >
                      {/* Top row: name, badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-neutral-800 truncate">
                              {product.name}
                            </h3>
                            <Badge variant={statusBadgeVariant[product.status] ?? "warning"}>
                              {formatLabel(product.status)}
                            </Badge>
                            {lowStock && (
                              <Badge variant="warning">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="mr-1"
                                >
                                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                  <line x1="12" y1="9" x2="12" y2="13" />
                                  <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                Low Stock
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-neutral-400">
                            SKU: {product.sku}
                          </p>
                        </div>
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

                      {/* Category & brand */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                        {product.category && (
                          <span>
                            <span className="text-neutral-400">Category:</span>{" "}
                            {product.category}
                          </span>
                        )}
                        {product.brand && (
                          <span>
                            <span className="text-neutral-400">Brand:</span>{" "}
                            {product.brand}
                          </span>
                        )}
                        {product.location && (
                          <span>
                            <span className="text-neutral-400">Location:</span>{" "}
                            {product.location}
                          </span>
                        )}
                      </div>

                      {/* Stock level indicator */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-500">
                            Stock: <span className="font-semibold text-neutral-700">{product.stockLevel}</span>
                            {product.unit && <span className="text-neutral-400"> {product.unit}</span>}
                          </span>
                          <span className="text-neutral-400">
                            Reorder: {product.reorderPoint}
                          </span>
                        </div>
                        <ProgressBar
                          value={getStockPercent(product)}
                          color={getStockColor(product)}
                          size="sm"
                        />
                      </div>

                      {/* Pricing */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-400">
                          Cost: {formatCurrency(product.costPrice)}
                        </span>
                        <span className="text-sm font-semibold text-primary-600">
                          {formatCurrency(product.sellingPrice)}
                        </span>
                      </div>
                    </button>

                    {/* ---- Expanded detail ------------------------------ */}
                    {isExpanded && (
                      <div className="border-t border-sage-100 bg-sage-50/30 px-5 py-4">
                        {/* Product details grid */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-2 text-sm">
                            <h4 className="font-semibold text-neutral-700">
                              Product Details
                            </h4>
                            <div className="space-y-1 text-neutral-600">
                              <p>
                                <span className="text-neutral-400">SKU:</span>{" "}
                                {product.sku}
                              </p>
                              {product.description && (
                                <p>
                                  <span className="text-neutral-400">Description:</span>{" "}
                                  {product.description}
                                </p>
                              )}
                              {product.barcode && (
                                <p>
                                  <span className="text-neutral-400">Barcode:</span>{" "}
                                  {product.barcode}
                                </p>
                              )}
                              {product.primarySupplier && (
                                <p>
                                  <span className="text-neutral-400">Supplier:</span>{" "}
                                  {product.primarySupplier}
                                </p>
                              )}
                              {product.createdAt && (
                                <p>
                                  <span className="text-neutral-400">Added:</span>{" "}
                                  {formatDateTime(product.createdAt)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <h4 className="font-semibold text-neutral-700">
                              Stock Info
                            </h4>
                            <div className="space-y-1 text-neutral-600">
                              <p>
                                <span className="text-neutral-400">Stock Level:</span>{" "}
                                <span className="font-medium">{product.stockLevel}</span>
                                {product.unit && <span className="text-neutral-400"> {product.unit}</span>}
                              </p>
                              <p>
                                <span className="text-neutral-400">Reorder Point:</span>{" "}
                                {product.reorderPoint}
                              </p>
                              <p>
                                <span className="text-neutral-400">Cost Price:</span>{" "}
                                {formatCurrency(product.costPrice)}
                              </p>
                              <p>
                                <span className="text-neutral-400">Selling Price:</span>{" "}
                                {formatCurrency(product.sellingPrice)}
                              </p>
                              {product.location && (
                                <p>
                                  <span className="text-neutral-400">Location:</span>{" "}
                                  {product.location}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Stock Movements */}
                          <div className="space-y-2 text-sm sm:col-span-2 lg:col-span-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-neutral-700">
                                Stock Movements
                              </h4>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMovementForm(!showMovementForm);
                                  setMovementForm(INITIAL_MOVEMENT_FORM);
                                  setMovementError(null);
                                }}
                                className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-100"
                              >
                                <svg
                                  width="12"
                                  height="12"
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
                                Add Movement
                              </button>
                            </div>

                            {movementsLoading ? (
                              <div className="flex items-center gap-2 py-3 text-neutral-400">
                                <svg
                                  className="h-4 w-4 animate-spin"
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
                                <span className="text-xs">Loading movements...</span>
                              </div>
                            ) : movementsError ? (
                              <p className="text-xs text-red-500">{movementsError}</p>
                            ) : movements.length === 0 ? (
                              <p className="py-2 text-xs text-neutral-400">
                                No stock movements recorded.
                              </p>
                            ) : (
                              <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                                {movements.map((mv) => (
                                  <li
                                    key={mv.id}
                                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant={
                                            mv.type === "in"
                                              ? "default"
                                              : mv.type === "out"
                                              ? "error"
                                              : mv.type === "transfer"
                                              ? "info"
                                              : "warning"
                                          }
                                        >
                                          {formatLabel(mv.type)}
                                        </Badge>
                                        <span className="text-xs font-medium text-neutral-700">
                                          {mv.type === "in" ? "+" : mv.type === "out" ? "-" : ""}
                                          {mv.quantity}
                                        </span>
                                      </div>
                                      {mv.reason && (
                                        <p className="mt-0.5 truncate text-xs text-neutral-400">
                                          {mv.reason}
                                        </p>
                                      )}
                                      {(mv.fromLocation || mv.toLocation) && (
                                        <p className="mt-0.5 truncate text-xs text-neutral-400">
                                          {mv.fromLocation && (
                                            <span>From: {mv.fromLocation}</span>
                                          )}
                                          {mv.fromLocation && mv.toLocation && " → "}
                                          {mv.toLocation && (
                                            <span>To: {mv.toLocation}</span>
                                          )}
                                        </p>
                                      )}
                                    </div>
                                    <span className="shrink-0 text-xs text-neutral-400">
                                      {formatDateTime(mv.date || mv.createdAt)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* ---- Add Movement Form ----------------------- */}
                        {showMovementForm && (
                          <div className="mt-4 border-t border-sage-100 pt-4">
                            <h4 className="mb-3 text-sm font-semibold text-neutral-700">
                              New Stock Movement
                            </h4>
                            <form
                              onSubmit={handleMovementSubmit}
                              className="flex flex-col gap-3"
                            >
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-sm font-medium text-neutral-700">
                                    Type
                                  </label>
                                  <select
                                    value={movementForm.type}
                                    onChange={(e) =>
                                      setMovementForm((f) => ({
                                        ...f,
                                        type: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                  >
                                    {MOVEMENT_TYPES.map((t) => (
                                      <option key={t} value={t}>
                                        {formatLabel(t)}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <Input
                                  label="Quantity"
                                  type="number"
                                  value={movementForm.quantity}
                                  onChange={(e) =>
                                    setMovementForm((f) => ({
                                      ...f,
                                      quantity: e.target.value,
                                    }))
                                  }
                                  required
                                />

                                <Input
                                  label="From Location"
                                  placeholder="e.g. Warehouse A"
                                  value={movementForm.fromLocation}
                                  onChange={(e) =>
                                    setMovementForm((f) => ({
                                      ...f,
                                      fromLocation: e.target.value,
                                    }))
                                  }
                                />

                                <Input
                                  label="To Location"
                                  placeholder="e.g. Store Front"
                                  value={movementForm.toLocation}
                                  onChange={(e) =>
                                    setMovementForm((f) => ({
                                      ...f,
                                      toLocation: e.target.value,
                                    }))
                                  }
                                />
                              </div>

                              <Input
                                label="Reason"
                                placeholder="Reason for this stock movement..."
                                value={movementForm.reason}
                                onChange={(e) =>
                                  setMovementForm((f) => ({
                                    ...f,
                                    reason: e.target.value,
                                  }))
                                }
                              />

                              {movementError && (
                                <p className="text-xs text-red-500">{movementError}</p>
                              )}

                              <div className="flex gap-3">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setShowMovementForm(false);
                                    setMovementForm(INITIAL_MOVEMENT_FORM);
                                    setMovementError(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  variant="primary"
                                  size="sm"
                                  loading={creatingMovement}
                                  disabled={
                                    !movementForm.quantity ||
                                    parseInt(movementForm.quantity, 10) <= 0
                                  }
                                >
                                  Submit Movement
                                </Button>
                              </div>
                            </form>
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
      </div>

      {/* ============================================================== */}
      {/*  CREATE PRODUCT MODAL                                          */}
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
                Add Product
              </h2>
              <p className="mb-5 text-sm text-neutral-500">
                Add a new product to your inventory.
              </p>

              <form
                onSubmit={handleCreateSubmit}
                className="flex flex-col gap-4"
              >
                {/* Name & SKU */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Product Name *"
                    placeholder="e.g. Organic Lavender Oil"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                    autoFocus
                  />
                  <Input
                    label="SKU *"
                    placeholder="e.g. OLO-001"
                    value={form.sku}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sku: e.target.value }))
                    }
                    required
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Product description..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                {/* Category & Brand */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Category"
                    placeholder="e.g. Essential Oils"
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                  />
                  <Input
                    label="Brand"
                    placeholder="e.g. PureWellness"
                    value={form.brand}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, brand: e.target.value }))
                    }
                  />
                </div>

                {/* Pricing */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Cost Price"
                    type="number"
                    value={form.costPrice}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, costPrice: e.target.value }))
                    }
                  />
                  <Input
                    label="Selling Price"
                    type="number"
                    value={form.sellingPrice}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        sellingPrice: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Stock */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Stock Level"
                    type="number"
                    value={form.stockLevel}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        stockLevel: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Reorder Point"
                    type="number"
                    value={form.reorderPoint}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        reorderPoint: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Unit & Location */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Unit"
                    placeholder="e.g. pcs, kg, ml"
                    value={form.unit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, unit: e.target.value }))
                    }
                  />
                  <Input
                    label="Location"
                    placeholder="e.g. Warehouse A, Shelf B3"
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                  />
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                    className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {formatLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Margin preview */}
                {(parseFloat(form.sellingPrice) > 0 || parseFloat(form.costPrice) > 0) && (
                  <div className="flex items-center justify-between rounded-xl bg-primary-50 px-4 py-3">
                    <span className="text-sm font-medium text-primary-700">
                      Margin
                    </span>
                    <span className="text-lg font-bold text-primary-600">
                      {formatCurrency(
                        (parseFloat(form.sellingPrice) || 0) -
                          (parseFloat(form.costPrice) || 0)
                      )}
                    </span>
                  </div>
                )}

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
                    disabled={!form.name.trim() || !form.sku.trim()}
                  >
                    Add Product
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
