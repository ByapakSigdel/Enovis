"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { CrmContact, CrmDeal, CrmPipeline } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn, formatCurrency } from "@/lib/utils";
import { Handshake, Shuffle, User } from "lucide-react";

type Tab = "contacts" | "deals" | "pipelines";

function statusBadgeVariant(status: string): "default" | "warning" | "error" | "info" {
  switch (status) {
    case "customer":
    case "qualified":
    case "closed_won":
    case "approved":
    case "preferred":
      return "default";
    case "lead":
    case "new":
      return "info";
    case "churned":
    case "closed_lost":
    case "rejected":
      return "error";
    case "proposal":
    case "negotiation":
    case "pending":
    case "contacted":
      return "warning";
    default:
      return "info";
  }
}

export default function CrmPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("contacts");

  // Contacts state
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [showContactModal, setShowContactModal] = useState(false);

  // Deals state
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [dealsError, setDealsError] = useState("");
  const [showDealModal, setShowDealModal] = useState(false);

  // Pipelines state
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [pipelinesLoading, setPipelinesLoading] = useState(true);
  const [pipelinesError, setPipelinesError] = useState("");
  const [showPipelineModal, setShowPipelineModal] = useState(false);

  // Form state - contacts
  const [contactForm, setContactForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", companyName: "",
    type: "lead", source: "", status: "new", notes: "",
  });
  const [contactFormLoading, setContactFormLoading] = useState(false);
  const [contactFormError, setContactFormError] = useState("");

  // Form state - deals
  const [dealForm, setDealForm] = useState({
    dealName: "", stage: "lead", dealValue: "", probability: "", expectedCloseDate: "", notes: "",
  });
  const [dealFormLoading, setDealFormLoading] = useState(false);
  const [dealFormError, setDealFormError] = useState("");

  // Form state - pipelines
  const [pipelineForm, setPipelineForm] = useState({
    name: "", stages: "", isDefault: false,
  });
  const [pipelineFormLoading, setPipelineFormLoading] = useState(false);
  const [pipelineFormError, setPipelineFormError] = useState("");

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    setContactsError("");
    const res = await api.crm.contacts.list();
    if (res.success && res.data) {
      setContacts(res.data as unknown as CrmContact[]);
    } else {
      setContactsError(res.error || "Failed to load contacts");
    }
    setContactsLoading(false);
  }, []);

  const loadDeals = useCallback(async () => {
    setDealsLoading(true);
    setDealsError("");
    const res = await api.crm.deals.list();
    if (res.success && res.data) {
      setDeals(res.data as unknown as CrmDeal[]);
    } else {
      setDealsError(res.error || "Failed to load deals");
    }
    setDealsLoading(false);
  }, []);

  const loadPipelines = useCallback(async () => {
    setPipelinesLoading(true);
    setPipelinesError("");
    const res = await api.crm.pipelines.list();
    if (res.success && res.data) {
      setPipelines(res.data as unknown as CrmPipeline[]);
    } else {
      setPipelinesError(res.error || "Failed to load pipelines");
    }
    setPipelinesLoading(false);
  }, []);

  useEffect(() => {
    loadContacts();
    loadDeals();
    loadPipelines();
  }, [loadContacts, loadDeals, loadPipelines]);

  const handleCreateContact = useCallback(async () => {
    if (!contactForm.firstName.trim()) {
      setContactFormError("First name is required");
      return;
    }
    setContactFormLoading(true);
    setContactFormError("");
    const res = await api.crm.contacts.create(contactForm);
    if (res.success && res.data) {
      setContacts((prev) => [res.data as unknown as CrmContact, ...prev]);
      setShowContactModal(false);
      setContactForm({ firstName: "", lastName: "", email: "", phone: "", companyName: "", type: "lead", source: "", status: "new", notes: "" });
    } else {
      setContactFormError(res.error || "Failed to create contact");
    }
    setContactFormLoading(false);
  }, [contactForm]);

  const handleCreateDeal = useCallback(async () => {
    if (!dealForm.dealName.trim()) {
      setDealFormError("Deal name is required");
      return;
    }
    setDealFormLoading(true);
    setDealFormError("");
    const payload = {
      ...dealForm,
      dealValue: parseFloat(dealForm.dealValue) || 0,
      probability: parseFloat(dealForm.probability) || 0,
    };
    const res = await api.crm.deals.create(payload);
    if (res.success && res.data) {
      setDeals((prev) => [res.data as unknown as CrmDeal, ...prev]);
      setShowDealModal(false);
      setDealForm({ dealName: "", stage: "lead", dealValue: "", probability: "", expectedCloseDate: "", notes: "" });
    } else {
      setDealFormError(res.error || "Failed to create deal");
    }
    setDealFormLoading(false);
  }, [dealForm]);

  const handleCreatePipeline = useCallback(async () => {
    if (!pipelineForm.name.trim()) {
      setPipelineFormError("Pipeline name is required");
      return;
    }
    setPipelineFormLoading(true);
    setPipelineFormError("");
    const res = await api.crm.pipelines.create(pipelineForm);
    if (res.success && res.data) {
      setPipelines((prev) => [res.data as unknown as CrmPipeline, ...prev]);
      setShowPipelineModal(false);
      setPipelineForm({ name: "", stages: "", isDefault: false });
    } else {
      setPipelineFormError(res.error || "Failed to create pipeline");
    }
    setPipelineFormLoading(false);
  }, [pipelineForm]);

  const filteredContacts = contacts.filter((c) => {
    const q = contactSearch.toLowerCase();
    if (!q) return true;
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.companyName || "").toLowerCase().includes(q)
    );
  });

  const pipelineValue = deals.reduce((sum, d) => sum + (d.dealValue || 0), 0);
  const openDeals = deals.filter((d) => d.status !== "closed_won" && d.status !== "closed_lost");

  const tabs: { key: Tab; label: string }[] = [
    { key: "contacts", label: "Contacts" },
    { key: "deals", label: "Deals" },
    { key: "pipelines", label: "Pipelines" },
  ];

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <p className="text-sm text-primary-500 font-medium">Enterprise</p>
          <h1 className="text-2xl font-bold text-neutral-900">CRM</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage contacts, deals, and sales pipelines</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-colors",
                tab === t.key
                  ? "bg-primary-500 text-white"
                  : "bg-sage-100 text-neutral-600 hover:bg-sage-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contacts Tab */}
        {tab === "contacts" && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  }
                />
              </div>
              <Button onClick={() => setShowContactModal(true)}>Add Contact</Button>
            </div>

            {contactsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-500" />
              </div>
            ) : contactsError ? (
              <Card>
                <div className="text-center py-8">
                  <p className="text-sm text-red-600 mb-3">{contactsError}</p>
                  <Button variant="secondary" size="sm" onClick={loadContacts}>Retry</Button>
                </div>
              </Card>
            ) : filteredContacts.length === 0 ? (
              <Card variant="elevated" className="overflow-hidden">
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl shadow-sm"><User className="w-8 h-8 text-primary-500" /></div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-700">
                      {contactSearch ? "No contacts match your search." : "Build your contact book"}
                    </p>
                    {!contactSearch && (
                      <p className="mt-1 text-xs text-neutral-400">Track leads, customers, and partners in one place with full interaction history.</p>
                    )}
                  </div>
                  {!contactSearch && (
                    <>
                      <div className="w-full space-y-2">
                        {[
                          { name: "Sarah Johnson", company: "Acme Corp", type: "Customer", score: 92 },
                          { name: "Michael Lee", company: "TechStart", type: "Lead", score: 74 },
                          { name: "Emma Davis", company: "BlueSky Ltd", type: "Partner", score: 88 },
                        ].map((c, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-xl bg-sage-50 p-2.5 text-left opacity-75">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                              {c.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-neutral-800">{c.name}</p>
                              <p className="text-[10px] text-neutral-400">{c.company} · {c.type}</p>
                            </div>
                            <span className="text-[10px] font-bold text-primary-600">{c.score}pts</span>
                          </div>
                        ))}
                      </div>
                      <Button variant="primary" size="sm" className="w-full" onClick={() => setShowContactModal(true)}>
                        Add First Contact
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts.map((contact) => (
                  <Card key={contact.id} variant="outlined">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-neutral-800">
                          {contact.firstName} {contact.lastName}
                        </h3>
                        {contact.companyName && (
                          <p className="text-xs text-neutral-500">{contact.companyName}</p>
                        )}
                      </div>
                      <Badge variant={statusBadgeVariant(contact.type)}>{contact.type}</Badge>
                    </div>
                    {contact.email && (
                      <p className="text-sm text-neutral-600 mb-1">{contact.email}</p>
                    )}
                    {contact.phone && (
                      <p className="text-sm text-neutral-500 mb-2">{contact.phone}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant={statusBadgeVariant(contact.status)}>{contact.status}</Badge>
                      {contact.leadScore > 0 && (
                        <span className="text-xs text-neutral-400">Score: {contact.leadScore}</span>
                      )}
                    </div>
                    {contact.source && (
                      <p className="text-xs text-neutral-400 mt-2">Source: {contact.source}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Deals Tab */}
        {tab === "deals" && (
          <div>
            {/* Pipeline Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card variant="elevated">
                <p className="text-sm text-neutral-500">Total Pipeline</p>
                <p className="text-2xl font-bold text-neutral-800">{formatCurrency(pipelineValue)}</p>
              </Card>
              <Card variant="elevated">
                <p className="text-sm text-neutral-500">Total Deals</p>
                <p className="text-2xl font-bold text-neutral-800">{deals.length}</p>
              </Card>
              <Card variant="elevated">
                <p className="text-sm text-neutral-500">Open Deals</p>
                <p className="text-2xl font-bold text-neutral-800">{openDeals.length}</p>
              </Card>
            </div>

            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowDealModal(true)}>New Deal</Button>
            </div>

            {dealsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-500" />
              </div>
            ) : dealsError ? (
              <Card>
                <div className="text-center py-8">
                  <p className="text-sm text-red-600 mb-3">{dealsError}</p>
                  <Button variant="secondary" size="sm" onClick={loadDeals}>Retry</Button>
                </div>
              </Card>
            ) : deals.length === 0 ? (
              <Card variant="elevated" className="overflow-hidden">
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl shadow-sm"><Handshake className="w-8 h-8 text-primary-500" /></div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-700">No deals in the pipeline</p>
                    <p className="mt-1 text-xs text-neutral-400">Track opportunities from first contact to closed deal. See probability, value, and expected close dates at a glance.</p>
                  </div>
                  <div className="w-full space-y-2">
                    {[
                      { name: "Enterprise License", value: "$48,000", stage: "Proposal", prob: "65%" },
                      { name: "Annual Support Plan", value: "$12,000", stage: "Negotiation", prob: "80%" },
                      { name: "Consulting Project", value: "$24,500", stage: "Discovery", prob: "40%" },
                    ].map((d, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl bg-sage-50 p-2.5 text-left opacity-75">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-neutral-800">{d.name}</p>
                          <p className="text-[10px] text-neutral-400">{d.stage} · {d.prob} probability</p>
                        </div>
                        <span className="text-xs font-bold text-primary-600">{d.value}</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="primary" size="sm" className="w-full" onClick={() => setShowDealModal(true)}>
                    Create First Deal
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deals.map((deal) => (
                  <Card key={deal.id} variant="outlined">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-neutral-800">{deal.dealName}</h3>
                      <Badge variant={statusBadgeVariant(deal.stage)}>{deal.stage}</Badge>
                    </div>
                    <p className="text-xl font-bold text-primary-600 mb-2">{formatCurrency(deal.dealValue)}</p>
                    <div className="flex items-center gap-4 text-sm text-neutral-500">
                      <span>Probability: {deal.probability}%</span>
                      {deal.expectedCloseDate && (
                        <span>Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant={statusBadgeVariant(deal.status)}>{deal.status}</Badge>
                    </div>
                    {deal.notes && (
                      <p className="text-xs text-neutral-400 mt-2 line-clamp-2">{deal.notes}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pipelines Tab */}
        {tab === "pipelines" && (
          <div>
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowPipelineModal(true)}>Create Pipeline</Button>
            </div>

            {pipelinesLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-500" />
              </div>
            ) : pipelinesError ? (
              <Card>
                <div className="text-center py-8">
                  <p className="text-sm text-red-600 mb-3">{pipelinesError}</p>
                  <Button variant="secondary" size="sm" onClick={loadPipelines}>Retry</Button>
                </div>
              </Card>
            ) : pipelines.length === 0 ? (
              <Card variant="elevated" className="overflow-hidden">
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl shadow-sm"><Shuffle className="w-8 h-8 text-primary-500" /></div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-700">No pipelines yet</p>
                    <p className="mt-1 text-xs text-neutral-400">Create a sales pipeline with custom stages to visualize and manage your deal flow from lead to close.</p>
                  </div>
                  <div className="flex w-full items-center gap-1.5">
                    {["Lead", "Qualify", "Propose", "Negotiate", "Close"].map((stage, i) => (
                      <div key={i} className="flex-1 rounded-lg bg-primary-50 px-1.5 py-2 text-center opacity-75">
                        <p className="text-[10px] font-semibold text-primary-700">{stage}</p>
                      </div>
                    ))}
                  </div>
                  <Button variant="primary" size="sm" className="w-full" onClick={() => setShowPipelineModal(true)}>
                    Create First Pipeline
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {pipelines.map((pipeline) => {
                  let stages: string[] = [];
                  try {
                    stages = pipeline.stages ? JSON.parse(pipeline.stages) : [];
                  } catch { /* ignore */ }

                  return (
                    <Card key={pipeline.id} variant="outlined">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-neutral-800">{pipeline.name}</h3>
                        {pipeline.isDefault && <Badge>Default</Badge>}
                      </div>
                      {stages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {stages.map((stage, i) => (
                            <span
                              key={i}
                              className="text-xs bg-sage-100 text-neutral-600 rounded-full px-3 py-1"
                            >
                              {String(stage)}
                            </span>
                          ))}
                        </div>
                      )}
                      {pipeline.createdAt && (
                        <p className="text-xs text-neutral-400 mt-2">
                          Created {new Date(pipeline.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4">Add Contact</h2>
            {contactFormError && (
              <p className="text-sm text-red-600 mb-3">{contactFormError}</p>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" value={contactForm.firstName} onChange={(e) => setContactForm((f) => ({ ...f, firstName: e.target.value }))} required />
                <Input label="Last Name" value={contactForm.lastName} onChange={(e) => setContactForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
              <Input label="Email" type="email" value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} />
              <Input label="Phone" value={contactForm.phone} onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))} />
              <Input label="Company" value={contactForm.companyName} onChange={(e) => setContactForm((f) => ({ ...f, companyName: e.target.value }))} />
              <div>
                <label className="text-sm font-medium text-neutral-700">Type</label>
                <select
                  value={contactForm.type}
                  onChange={(e) => setContactForm((f) => ({ ...f, type: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="lead">Lead</option>
                  <option value="customer">Customer</option>
                  <option value="partner">Partner</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              <Input label="Source" value={contactForm.source} onChange={(e) => setContactForm((f) => ({ ...f, source: e.target.value }))} placeholder="e.g. Website, Referral" />
              <div>
                <label className="text-sm font-medium text-neutral-700">Status</label>
                <select
                  value={contactForm.status}
                  onChange={(e) => setContactForm((f) => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="customer">Customer</option>
                  <option value="churned">Churned</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">Notes</label>
                <textarea
                  value={contactForm.notes}
                  onChange={(e) => setContactForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowContactModal(false)}>Cancel</Button>
              <Button loading={contactFormLoading} onClick={handleCreateContact}>Create Contact</Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Deal Modal */}
      {showDealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4">New Deal</h2>
            {dealFormError && (
              <p className="text-sm text-red-600 mb-3">{dealFormError}</p>
            )}
            <div className="space-y-3">
              <Input label="Deal Name" value={dealForm.dealName} onChange={(e) => setDealForm((f) => ({ ...f, dealName: e.target.value }))} required />
              <div>
                <label className="text-sm font-medium text-neutral-700">Stage</label>
                <select
                  value={dealForm.stage}
                  onChange={(e) => setDealForm((f) => ({ ...f, stage: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="lead">Lead</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                </select>
              </div>
              <Input label="Deal Value" type="number" value={dealForm.dealValue} onChange={(e) => setDealForm((f) => ({ ...f, dealValue: e.target.value }))} />
              <Input label="Probability (%)" type="number" value={dealForm.probability} onChange={(e) => setDealForm((f) => ({ ...f, probability: e.target.value }))} />
              <Input label="Expected Close Date" type="date" value={dealForm.expectedCloseDate} onChange={(e) => setDealForm((f) => ({ ...f, expectedCloseDate: e.target.value }))} />
              <div>
                <label className="text-sm font-medium text-neutral-700">Notes</label>
                <textarea
                  value={dealForm.notes}
                  onChange={(e) => setDealForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowDealModal(false)}>Cancel</Button>
              <Button loading={dealFormLoading} onClick={handleCreateDeal}>Create Deal</Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Pipeline Modal */}
      {showPipelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4">Create Pipeline</h2>
            {pipelineFormError && (
              <p className="text-sm text-red-600 mb-3">{pipelineFormError}</p>
            )}
            <div className="space-y-3">
              <Input label="Pipeline Name" value={pipelineForm.name} onChange={(e) => setPipelineForm((f) => ({ ...f, name: e.target.value }))} required />
              <div>
                <label className="text-sm font-medium text-neutral-700">Stages (JSON array)</label>
                <textarea
                  value={pipelineForm.stages}
                  onChange={(e) => setPipelineForm((f) => ({ ...f, stages: e.target.value }))}
                  rows={3}
                  placeholder='["Lead", "Qualified", "Proposal", "Negotiation", "Closed"]'
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 font-mono focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={pipelineForm.isDefault}
                  onChange={(e) => setPipelineForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  className="rounded border-sage-200 text-primary-500 focus:ring-primary-500"
                />
                Set as default pipeline
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowPipelineModal(false)}>Cancel</Button>
              <Button loading={pipelineFormLoading} onClick={handleCreatePipeline}>Create Pipeline</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
