"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Vendor, PurchaseOrder } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn, formatCurrency } from "@/lib/utils";
import { ClipboardList, Factory } from "lucide-react";

type Tab = "vendors" | "purchase-orders";

function statusVariant(status: string): "default" | "warning" | "error" | "info" {
  switch (status) {
    case "active":
    case "preferred":
    case "received":
    case "approved":
      return "default";
    case "inactive":
    case "pending":
    case "draft":
      return "warning";
    case "cancelled":
    case "rejected":
      return "error";
    default:
      return "info";
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={star <= rating ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          className={star <= rating ? "text-amber-400" : "text-neutral-300"}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function VendorsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("vendors");

  // Vendors state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorsError, setVendorsError] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorModal, setShowVendorModal] = useState(false);

  // Purchase Orders state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [posLoading, setPosLoading] = useState(true);
  const [posError, setPosError] = useState("");
  const [showPoModal, setShowPoModal] = useState(false);

  // Vendor form
  const [vendorForm, setVendorForm] = useState({
    name: "", contactName: "", email: "", phone: "", address: "", website: "",
    category: "", paymentTerms: "", status: "active", notes: "",
  });
  const [vendorFormLoading, setVendorFormLoading] = useState(false);
  const [vendorFormError, setVendorFormError] = useState("");

  // PO form
  const [poForm, setPoForm] = useState({
    poNumber: "", vendorId: "", items: "", subtotal: "", tax: "",
    expectedDate: "", notes: "",
  });
  const [poFormLoading, setPoFormLoading] = useState(false);
  const [poFormError, setPoFormError] = useState("");

  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);

  const loadVendors = useCallback(async () => {
    setVendorsLoading(true);
    setVendorsError("");
    const res = await api.vendors.list();
    if (res.success && res.data) {
      setVendors(res.data as unknown as Vendor[]);
    } else {
      setVendorsError(res.error || "Failed to load vendors");
    }
    setVendorsLoading(false);
  }, []);

  const loadPurchaseOrders = useCallback(async () => {
    setPosLoading(true);
    setPosError("");
    const res = await api.vendors.purchaseOrders.list();
    if (res.success && res.data) {
      setPurchaseOrders(res.data as unknown as PurchaseOrder[]);
    } else {
      setPosError(res.error || "Failed to load purchase orders");
    }
    setPosLoading(false);
  }, []);

  useEffect(() => {
    loadVendors();
    loadPurchaseOrders();
  }, [loadVendors, loadPurchaseOrders]);

  const handleCreateVendor = useCallback(async () => {
    if (!vendorForm.name.trim()) {
      setVendorFormError("Vendor name is required");
      return;
    }
    setVendorFormLoading(true);
    setVendorFormError("");
    const res = await api.vendors.create(vendorForm);
    if (res.success && res.data) {
      setVendors((prev) => [res.data as unknown as Vendor, ...prev]);
      setShowVendorModal(false);
      setVendorForm({ name: "", contactName: "", email: "", phone: "", address: "", website: "", category: "", paymentTerms: "", status: "active", notes: "" });
    } else {
      setVendorFormError(res.error || "Failed to create vendor");
    }
    setVendorFormLoading(false);
  }, [vendorForm]);

  const handleCreatePO = useCallback(async () => {
    if (!poForm.poNumber.trim()) {
      setPoFormError("PO number is required");
      return;
    }
    setPoFormLoading(true);
    setPoFormError("");
    const subtotal = parseFloat(poForm.subtotal) || 0;
    const tax = parseFloat(poForm.tax) || 0;
    const payload = {
      ...poForm,
      subtotal,
      tax,
      total: subtotal + tax,
    };
    const res = await api.vendors.purchaseOrders.create(payload);
    if (res.success && res.data) {
      setPurchaseOrders((prev) => [res.data as unknown as PurchaseOrder, ...prev]);
      setShowPoModal(false);
      setPoForm({ poNumber: "", vendorId: "", items: "", subtotal: "", tax: "", expectedDate: "", notes: "" });
    } else {
      setPoFormError(res.error || "Failed to create purchase order");
    }
    setPoFormLoading(false);
  }, [poForm]);

  const filteredVendors = vendors.filter((v) => {
    const q = vendorSearch.toLowerCase();
    if (!q) return true;
    return (
      v.name.toLowerCase().includes(q) ||
      (v.category || "").toLowerCase().includes(q) ||
      (v.contactName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <p className="text-sm text-primary-500 font-medium">Enterprise</p>
          <h1 className="text-2xl font-bold text-neutral-900">Vendors & Suppliers</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage vendors and purchase orders</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("vendors")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-colors",
              tab === "vendors" ? "bg-primary-500 text-white" : "bg-sage-100 text-neutral-600 hover:bg-sage-200"
            )}
          >
            Vendors
          </button>
          <button
            onClick={() => setTab("purchase-orders")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-colors",
              tab === "purchase-orders" ? "bg-primary-500 text-white" : "bg-sage-100 text-neutral-600 hover:bg-sage-200"
            )}
          >
            Purchase Orders
          </button>
        </div>

        {/* Vendors Tab */}
        {tab === "vendors" && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search vendors..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  }
                />
              </div>
              <Button onClick={() => setShowVendorModal(true)}>Add Vendor</Button>
            </div>

            {vendorsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-500" />
              </div>
            ) : vendorsError ? (
              <Card>
                <div className="text-center py-8">
                  <p className="text-sm text-red-600 mb-3">{vendorsError}</p>
                  <Button variant="secondary" size="sm" onClick={loadVendors}>Retry</Button>
                </div>
              </Card>
            ) : filteredVendors.length === 0 ? (
              <Card variant="elevated" className="overflow-hidden">
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl shadow-sm"><Factory className="w-8 h-8 text-primary-500" /></div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-700">
                      {vendorSearch ? "No vendors match your search." : "Build your vendor network"}
                    </p>
                    {!vendorSearch && (
                      <p className="mt-1 text-xs text-neutral-400">
                        Manage suppliers, track contacts, and issue purchase orders — all from one place.
                      </p>
                    )}
                  </div>
                  {!vendorSearch && (
                    <>
                      <div className="w-full space-y-2">
                        {[
                          { name: "TechParts Co.", contact: "John Wu", status: "Active" },
                          { name: "Global Supply Ltd", contact: "Maria Santos", status: "Active" },
                          { name: "FastShip Logistics", contact: "David Kim", status: "Inactive" },
                        ].map((v, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-xl bg-sage-50 p-2.5 text-left opacity-75">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-700">
                              {v.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-neutral-800">{v.name}</p>
                              <p className="text-[10px] text-neutral-400">{v.contact}</p>
                            </div>
                            <span className={`text-[10px] font-semibold ${v.status === "Active" ? "text-primary-600" : "text-neutral-400"}`}>{v.status}</span>
                          </div>
                        ))}
                      </div>
                      <Button variant="primary" size="sm" className="w-full" onClick={() => setShowVendorModal(true)}>
                        Add First Vendor
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVendors.map((vendor) => (
                  <Card
                    key={vendor.id}
                    variant={expandedVendor === vendor.id ? "elevated" : "outlined"}
                    onClick={() => setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-neutral-800">{vendor.name}</h3>
                      <Badge variant={statusVariant(vendor.status)}>{vendor.status}</Badge>
                    </div>
                    {vendor.contactName && (
                      <p className="text-sm text-neutral-600">{vendor.contactName}</p>
                    )}
                    {vendor.email && (
                      <p className="text-sm text-neutral-500">{vendor.email}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      {vendor.category && (
                        <span className="text-xs bg-sage-100 text-neutral-600 rounded-full px-2 py-0.5">{vendor.category}</span>
                      )}
                      <StarRating rating={vendor.rating || 0} />
                    </div>

                    {expandedVendor === vendor.id && (
                      <div className="mt-4 pt-4 border-t border-sage-200 space-y-2">
                        {vendor.phone && (
                          <p className="text-sm text-neutral-500">Phone: {vendor.phone}</p>
                        )}
                        {vendor.address && (
                          <p className="text-sm text-neutral-500">Address: {vendor.address}</p>
                        )}
                        {vendor.website && (
                          <p className="text-sm text-primary-500">{vendor.website}</p>
                        )}
                        {vendor.paymentTerms && (
                          <p className="text-sm text-neutral-500">Payment Terms: {vendor.paymentTerms}</p>
                        )}
                        {vendor.notes && (
                          <p className="text-sm text-neutral-400 mt-2">{vendor.notes}</p>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Purchase Orders Tab */}
        {tab === "purchase-orders" && (
          <div>
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowPoModal(true)}>New Purchase Order</Button>
            </div>

            {posLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-500" />
              </div>
            ) : posError ? (
              <Card>
                <div className="text-center py-8">
                  <p className="text-sm text-red-600 mb-3">{posError}</p>
                  <Button variant="secondary" size="sm" onClick={loadPurchaseOrders}>Retry</Button>
                </div>
              </Card>
            ) : purchaseOrders.length === 0 ? (
              <Card variant="elevated" className="overflow-hidden">
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl shadow-sm"><ClipboardList className="w-8 h-8 text-primary-500" /></div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-700">No purchase orders yet</p>
                    <p className="mt-1 text-xs text-neutral-400">Issue POs to vendors, track delivery status, and maintain a complete procurement audit trail.</p>
                  </div>
                  <div className="w-full space-y-2">
                    {[
                      { ref: "PO-001", vendor: "TechParts Co.", total: "$4,800", status: "Approved" },
                      { ref: "PO-002", vendor: "Global Supply Ltd", total: "$12,200", status: "Pending" },
                      { ref: "PO-003", vendor: "FastShip Logistics", total: "$2,100", status: "Received" },
                    ].map((po, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl bg-sage-50 p-2.5 text-left opacity-75">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-neutral-800">{po.ref} · {po.vendor}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-neutral-700">{po.total}</p>
                          <p className={`text-[10px] font-semibold ${po.status === "Received" || po.status === "Approved" ? "text-primary-600" : "text-amber-500"}`}>{po.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="primary" size="sm" className="w-full" onClick={() => setShowPoModal(true)}>
                    Create First PO
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {purchaseOrders.map((po) => {
                  const vendorName = vendors.find((v) => v.id === po.vendorId)?.name || po.vendorId;
                  let items: unknown[] = [];
                  try {
                    items = po.items ? JSON.parse(po.items) : [];
                  } catch { /* ignore */ }

                  return (
                    <Card key={po.id} variant="outlined">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-neutral-800 font-mono">{po.poNumber}</h3>
                          <p className="text-sm text-neutral-500">Vendor: {vendorName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant(po.status)}>{po.status}</Badge>
                          <span className="text-lg font-bold text-primary-600">{formatCurrency(po.total)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-neutral-500 mt-2">
                        <span>Subtotal: {formatCurrency(po.subtotal)}</span>
                        <span>Tax: {formatCurrency(po.tax)}</span>
                        {po.expectedDate && (
                          <span>Expected: {new Date(po.expectedDate).toLocaleDateString()}</span>
                        )}
                      </div>
                      {items.length > 0 && (
                        <div className="mt-3 text-xs text-neutral-400">
                          {items.length} item(s)
                        </div>
                      )}
                      {po.notes && (
                        <p className="text-sm text-neutral-400 mt-2">{po.notes}</p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4">Add Vendor</h2>
            {vendorFormError && (
              <p className="text-sm text-red-600 mb-3">{vendorFormError}</p>
            )}
            <div className="space-y-3">
              <Input label="Vendor Name" value={vendorForm.name} onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))} required />
              <Input label="Contact Name" value={vendorForm.contactName} onChange={(e) => setVendorForm((f) => ({ ...f, contactName: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Email" type="email" value={vendorForm.email} onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))} />
                <Input label="Phone" value={vendorForm.phone} onChange={(e) => setVendorForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <Input label="Address" value={vendorForm.address} onChange={(e) => setVendorForm((f) => ({ ...f, address: e.target.value }))} />
              <Input label="Website" value={vendorForm.website} onChange={(e) => setVendorForm((f) => ({ ...f, website: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Category" value={vendorForm.category} onChange={(e) => setVendorForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Supplies" />
                <Input label="Payment Terms" value={vendorForm.paymentTerms} onChange={(e) => setVendorForm((f) => ({ ...f, paymentTerms: e.target.value }))} placeholder="e.g. Net 30" />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">Status</label>
                <select
                  value={vendorForm.status}
                  onChange={(e) => setVendorForm((f) => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="preferred">Preferred</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">Notes</label>
                <textarea
                  value={vendorForm.notes}
                  onChange={(e) => setVendorForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowVendorModal(false)}>Cancel</Button>
              <Button loading={vendorFormLoading} onClick={handleCreateVendor}>Create Vendor</Button>
            </div>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4">New Purchase Order</h2>
            {poFormError && (
              <p className="text-sm text-red-600 mb-3">{poFormError}</p>
            )}
            <div className="space-y-3">
              <Input label="PO Number" value={poForm.poNumber} onChange={(e) => setPoForm((f) => ({ ...f, poNumber: e.target.value }))} required />
              <div>
                <label className="text-sm font-medium text-neutral-700">Vendor</label>
                <select
                  value={poForm.vendorId}
                  onChange={(e) => setPoForm((f) => ({ ...f, vendorId: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">Select vendor...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">Items (JSON)</label>
                <textarea
                  value={poForm.items}
                  onChange={(e) => setPoForm((f) => ({ ...f, items: e.target.value }))}
                  rows={3}
                  placeholder='[{"name": "Item 1", "qty": 10, "price": 25.00}]'
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 font-mono focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Subtotal" type="number" value={poForm.subtotal} onChange={(e) => setPoForm((f) => ({ ...f, subtotal: e.target.value }))} />
                <Input label="Tax" type="number" value={poForm.tax} onChange={(e) => setPoForm((f) => ({ ...f, tax: e.target.value }))} />
              </div>
              {(poForm.subtotal || poForm.tax) && (
                <div className="bg-primary-50 rounded-xl p-3 text-center">
                  <p className="text-sm text-neutral-500">Total</p>
                  <p className="text-xl font-bold text-primary-700">
                    {formatCurrency((parseFloat(poForm.subtotal) || 0) + (parseFloat(poForm.tax) || 0))}
                  </p>
                </div>
              )}
              <Input label="Expected Date" type="date" value={poForm.expectedDate} onChange={(e) => setPoForm((f) => ({ ...f, expectedDate: e.target.value }))} />
              <div>
                <label className="text-sm font-medium text-neutral-700">Notes</label>
                <textarea
                  value={poForm.notes}
                  onChange={(e) => setPoForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowPoModal(false)}>Cancel</Button>
              <Button loading={poFormLoading} onClick={handleCreatePO}>Create PO</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
