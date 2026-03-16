"use client";

import { INDIVIDUAL_NAV_ITEMS, ENTERPRISE_NAV_ITEMS } from "@/constants/navigation";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import type { NavItem } from "@/types";

interface AppShellProps {
  children: React.ReactNode;
  mode?: "individual" | "enterprise";
}

export default function AppShell({ children, mode = "individual" }: AppShellProps) {
  const navItems: NavItem[] = mode === "enterprise" ? ENTERPRISE_NAV_ITEMS : INDIVIDUAL_NAV_ITEMS;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <Sidebar items={navItems} />

      {/* Main content area — offset by sidebar width on desktop */}
      <main className="md:ml-60 min-h-screen pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav mode={mode} />
    </div>
  );
}
