"use client";

import { cn } from "@/lib/utils";

interface TopBarProps {
  title: string;
  subtitle?: string;
  showAvatar?: boolean;
}

export default function TopBar({
  title,
  subtitle,
  showAvatar = true,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-sage-200">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger placeholder */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-sage-100 text-neutral-600"
            aria-label="Toggle menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div>
            {subtitle && (
              <p className="text-xs font-medium text-primary-500 leading-tight">
                {subtitle}
              </p>
            )}
            <h1 className="text-lg md:text-xl font-bold text-foreground leading-tight">
              {title}
            </h1>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button
            className={cn(
              "relative flex items-center justify-center w-9 h-9 rounded-lg",
              "hover:bg-sage-100 text-neutral-500 hover:text-neutral-700"
            )}
            aria-label="Notifications"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {/* Notification dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
          </button>

          {/* Avatar */}
          {showAvatar && (
            <button
              className="hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-primary-200 text-primary-700 text-sm font-semibold hover:ring-2 hover:ring-primary-300"
              aria-label="User menu"
            >
              U
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
