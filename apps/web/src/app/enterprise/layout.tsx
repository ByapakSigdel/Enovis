"use client";

import AppShell from "@/components/layout/AppShell";
import AuthGuard from "@/components/layout/AuthGuard";

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell mode="enterprise">{children}</AppShell>
    </AuthGuard>
  );
}
