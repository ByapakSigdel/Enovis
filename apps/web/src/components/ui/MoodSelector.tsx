"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { MoodIcon } from "./MoodIcons";

type Mood = "stressed" | "sad" | "tired" | "okay" | "focused" | "calm" | "happy" | "excited";

const MOODS: { value: Mood; label: string }[] = [
  { value: "stressed", label: "Stressed" },
  { value: "sad", label: "Sad" },
  { value: "tired", label: "Tired" },
  { value: "okay", label: "Okay" },
  { value: "focused", label: "Focused" },
  { value: "calm", label: "Calm" },
  { value: "happy", label: "Happy" },
  { value: "excited", label: "Excited" },
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
  const [hoveredMood, setHoveredMood] = useState<Mood | null>(null);

  return (
    <div className={cn("flex items-center justify-center gap-1 sm:gap-4 flex-wrap", className)}>
      {MOODS.map((mood) => {
        const isSelected = value === mood.value;
        const isHovered = hoveredMood === mood.value;
        
        return (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(mood.value)}
            onMouseEnter={() => setHoveredMood(mood.value)}
            onMouseLeave={() => setHoveredMood(null)}
            className={cn(
              "group flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all",
              isSelected
                ? "scale-110 text-primary-600 -translate-y-1"
                : "text-neutral-400 hover:scale-105 hover:text-neutral-600"
            )}
          >
            <MoodIcon 
              mood={mood.value} 
              isHovered={isHovered}
              className={cn(
                "w-[52px] h-[52px] drop-shadow-sm transition-transform", 
                (isHovered || isSelected) && "scale-110"
              )} 
            />
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
