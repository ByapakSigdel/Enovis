"use client";

import { cn } from "@/lib/utils";

type Mood = "stressed" | "okay" | "good" | "calm" | "great";

interface MoodOption {
  value: Mood;
  emoji: string;
  label: string;
}

const moods: MoodOption[] = [
  { value: "stressed", emoji: "😣", label: "Stressed" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "calm", emoji: "😌", label: "Calm" },
  { value: "great", emoji: "😄", label: "Great" },
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
                ? "scale-110 bg-primary-50 ring-2 ring-primary-500"
                : "hover:bg-sage-50"
            )}
          >
            <span className="text-2xl" role="img" aria-label={mood.label}>
              {mood.emoji}
            </span>
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
