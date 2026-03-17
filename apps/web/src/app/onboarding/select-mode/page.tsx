"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { api, setToken } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { setEnterpriseId } from "@/lib/api";

type Mode = "individual" | "enterprise";
type Step = "select" | "company-setup";

export default function SelectModePage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [selected, setSelected] = useState<Mode | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Company setup fields
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");

  async function handleContinue() {
    if (!selected) return;

    setLoading(true);
    setError(null);

    try {
      if (selected === "individual") {
        // Update mode to individual
        const res = await api.auth.updateMode("individual");
        if (!res.success || !res.data) {
          setError(res.error || "Failed to update mode");
          setLoading(false);
          return;
        }

        // Update token with new mode
        const data = res.data as Record<string, unknown>;
        if (data.token) {
          setToken(data.token as string);
        }

        // Update user in context
        const userData = data.user as Record<string, unknown>;
        if (userData) {
          updateUser({ mode: "individual" });
        }

        router.push("/dashboard");
        return;
      }

      // Enterprise mode
      if (step === "select") {
        setLoading(false);
        setStep("company-setup");
        return;
      }

      // Company setup complete — create enterprise
      if (!companyName.trim()) {
        setError("Company name is required");
        setLoading(false);
        return;
      }

      const res = await api.enterprise.create({
        name: companyName.trim(),
        industry: industry || null,
        size: companySize || null,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to create enterprise");
        setLoading(false);
        return;
      }

      const data = res.data as Record<string, unknown>;

      // If backend returns a new token with enterprise context, use it
      if (data.token) {
        setToken(data.token as string);
      }

      // Set enterprise ID for subsequent API calls
      const enterprise = data.enterprise as Record<string, unknown> | undefined;
      if (enterprise?.id) {
        setEnterpriseId(enterprise.id as string);
        localStorage.setItem("enovis_enterprise_id", enterprise.id as string);
      }

      // Update user mode in context
      updateUser({ mode: "enterprise" });

      router.push("/enterprise/dashboard");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const industries = [
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Retail",
    "Manufacturing",
    "Consulting",
    "Real Estate",
    "Media",
    "Hospitality",
    "Other",
  ];

  const sizes = [
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "500+",
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#fafdf7]">
      {/* Top bar */}
      <div className="relative flex items-center justify-center px-6 pt-6">
        <button
          type="button"
          onClick={() => {
            if (step === "company-setup") {
              setStep("select");
            } else {
              window.history.back();
            }
          }}
          className="absolute left-6 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50"
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#4a7c59]" />
          <span className={cn("h-2.5 w-2.5 rounded-full", step === "company-setup" ? "bg-[#4a7c59]" : "bg-neutral-300")} />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {step === "select" && (
            <>
              <div className="mb-10 text-center">
                <h1 className="text-2xl font-bold text-neutral-900">
                  {user?.name ? `Welcome, ${user.name}!` : "Select Your Experience"}
                </h1>
                <p className="mt-2 text-sm text-neutral-500">
                  Tailor your workspace to your needs.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Individual card */}
                <button
                  type="button"
                  onClick={() => setSelected("individual")}
                  className={cn(
                    "relative flex items-center gap-4 rounded-2xl border-2 bg-white p-5 text-left transition-all",
                    selected === "individual"
                      ? "border-[#4a7c59] shadow-md shadow-[#4a7c59]/10"
                      : "border-neutral-200 hover:border-neutral-300"
                  )}
                >
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                    selected === "individual" ? "bg-[#4a7c59] text-white" : "bg-[#4a7c59]/10 text-[#4a7c59]"
                  )}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900">Individual</h3>
                    <p className="mt-0.5 text-sm text-neutral-500">
                      Manage habits, tasks, goals, health, and personal finances
                    </p>
                  </div>
                  {selected === "individual" && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4a7c59]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Enterprise card */}
                <button
                  type="button"
                  onClick={() => setSelected("enterprise")}
                  className={cn(
                    "relative flex items-center gap-4 rounded-2xl border-2 bg-white p-5 text-left transition-all",
                    selected === "enterprise"
                      ? "border-[#4a7c59] shadow-md shadow-[#4a7c59]/10"
                      : "border-neutral-200 hover:border-neutral-300"
                  )}
                >
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                    selected === "enterprise" ? "bg-[#4a7c59] text-white" : "bg-[#4a7c59]/10 text-[#4a7c59]"
                  )}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                      <line x1="2" y1="13" x2="22" y2="13" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900">Enterprise</h3>
                    <p className="mt-0.5 text-sm text-neutral-500">
                      Projects, CRM, invoicing, inventory, and team collaboration
                    </p>
                  </div>
                  {selected === "enterprise" && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4a7c59]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </>
          )}

          {step === "company-setup" && (
            <>
              <div className="mb-10 text-center">
                <h1 className="text-2xl font-bold text-neutral-900">
                  Set Up Your Organization
                </h1>
                <p className="mt-2 text-sm text-neutral-500">
                  Tell us about your company to get started.
                </p>
              </div>

              <div className="flex flex-col gap-5">
                <Input
                  label="Company Name"
                  placeholder="Acme Corporation"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  }
                />

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Industry
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none transition-colors focus:border-[#4a7c59] focus:ring-2 focus:ring-[#4a7c59]/20"
                  >
                    <option value="">Select industry...</option>
                    {industries.map((i) => (
                      <option key={i} value={i.toLowerCase()}>{i}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Company Size
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setCompanySize(s)}
                        className={cn(
                          "rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all",
                          companySize === s
                            ? "border-[#4a7c59] bg-[#4a7c59]/5 text-[#4a7c59]"
                            : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Continue button */}
          <div className="mt-10">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={step === "select" ? !selected : !companyName.trim()}
              loading={loading}
              onClick={handleContinue}
            >
              {step === "select" && selected === "enterprise"
                ? "Continue to Setup"
                : step === "company-setup"
                ? "Create Organization"
                : "Continue"}
            </Button>
          </div>

          {step === "select" && (
            <p className="mt-4 text-center text-xs text-neutral-400">
              You can switch modes anytime from settings.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
