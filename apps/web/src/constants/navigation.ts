import { NavItem } from "@/types";

export const INDIVIDUAL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "layout-dashboard" },
  { label: "Tasks", href: "/tasks", icon: "check-square" },
  { label: "Calendar", href: "/calendar", icon: "calendar" },
  { label: "Finance", href: "/finance", icon: "wallet" },
  { label: "Goals", href: "/goals", icon: "target" },
  { label: "Habits", href: "/habits", icon: "repeat" },
  { label: "Health", href: "/health", icon: "heart-pulse" },
  { label: "Notes", href: "/notes", icon: "notebook" },
  { label: "Journal", href: "/journal", icon: "book-open" },
  { label: "Timer", href: "/timer", icon: "timer" },
];

export const ENTERPRISE_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/enterprise/dashboard", icon: "layout-dashboard" },
  { label: "Projects", href: "/enterprise/projects", icon: "folder-kanban" },
  { label: "Communication", href: "/enterprise/channels", icon: "message-circle" },
  { label: "Time & Attendance", href: "/enterprise/time-clock", icon: "clock" },
  { label: "Finance", href: "/enterprise/finance", icon: "wallet" },
  { label: "Orders", href: "/enterprise/orders", icon: "shopping-cart" },
  { label: "CRM", href: "/enterprise/crm", icon: "contact" },
  { label: "Invoices", href: "/enterprise/invoices", icon: "file-text" },
  { label: "Analytics", href: "/enterprise/analytics", icon: "bar-chart" },
  { label: "Inventory", href: "/enterprise/inventory", icon: "package" },
  { label: "Documents", href: "/enterprise/documents", icon: "files" },
  { label: "Vendors", href: "/enterprise/vendors", icon: "building" },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Plan", href: "/tasks", icon: "list-todo" },
  { label: "Stats", href: "/stats", icon: "bar-chart" },
  { label: "Profile", href: "/profile", icon: "user" },
];

export const ENTERPRISE_BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/enterprise/dashboard", icon: "home" },
  { label: "Projects", href: "/enterprise/projects", icon: "folder-kanban" },
  { label: "Analytics", href: "/enterprise/analytics", icon: "bar-chart" },
  { label: "More", href: "/enterprise/more", icon: "menu" },
];
