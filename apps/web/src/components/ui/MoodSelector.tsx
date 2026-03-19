"use client";

import { cn } from "@/lib/utils";
import { Frown, Meh, Smile, SmilePlus, Laugh } from "lucide-react";
import type { ReactNode } from "react";

type Mood = "stressed" | "okay" | "good" | "calm" | "great";

interface MoodOption {
  value: Mood;
  icon: ReactNode;
  label: string;
}

const moods: MoodOption[] = [
  { value: "stressed", icon: <Frown className="w-6 h-6" />, label: "Stressed" },
  { value: "okay", icon: <Meh className="w-6 h-6" />, label: "Okay" },
  { value: "good", icon: <Smile className="w-6 h-6" />, label: "Good" },
  { value: "calm", icon: <SmilePlus className="w-6 h-6" />, label: "Calm" },
  { value: "great", icon: <Laugh className="w-6 h-6" />, label: "Great" },
];

interface MoodSelectorProps {
  value: Mood | null;
  onChange: (mood: Mood) => void;
  className?: string;
}

export default function MoodSelector({
  value,
  onChange,
  className,
}: MoodSelectorProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      {moods.map((mood) => {
        const isSelected = value === mood.value;
        return (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(mood.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all",
              isSelected
                ? "scale-110 bg-primary-50 ring-2 ring-primary-500 text-primary-600"
                : "text-neutral-400 hover:bg-sage-50 hover:text-neutral-600"
            )}
          >
            {mood.icon}
            <span
              className={cn(
                "text-xs font-medium",
                isSelected ? "text-primary-600" : "text-neutral-500"
              )}
            >
              {mood.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type { Mood };
