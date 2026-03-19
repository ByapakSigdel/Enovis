"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import type { ReactNode } from "react";

type Mood = "stressed" | "sad" | "tired" | "okay" | "focused" | "calm" | "happy" | "excited";

interface MoodOption {
  value: Mood;
  icon: ReactNode;
  label: string;
}

const moods: MoodOption[] = [
  { value: "stressed", icon: <Image src="/assets/moods/stressed.svg" width={52} height={52} alt="Stressed" className="drop-shadow-sm transition-transform group-hover:scale-110" />, label: "Stressed" },
  { value: "sad", icon: <Image src="/assets/moods/sad.svg" width={52} height={52} alt="Sad" className="drop-shadow-sm transition-transform group-hover:scale-110" />, label: "Sad" },
  { value: "tired", icon: <Image src="/assets/moods/tired.svg" width={52} height={52} alt="Tired" className="drop-shadow-sm transition-transform group-hover:scale-110" />, label: "Tired" },
  { value: "okay", icon: <Image src="/assets/moods/okay.svg" width={52} height={52} alt="Okay" className="drop-shadow-sm transition-transform group-hover:scale-110" />, label: "Okay" },
  { value: "focused", icon: <Image src="/assets/moods/focused.svg" width={52} height={52} alt="Focused" className="drop-shadow-sm transition-transform group-hover:scale-110" />, label: "Focused" },
  { value: "calm", icon: <Image src="/assets/moods/calm.svg" width={52} height={52} alt="Calm" className="drop-shadow-sm transition-transform group-hover:scale-110" />, label: "Calm" },
  { value: "happy", icon: <Image src="/assets/moods/happy.svg" width={52} height={52} alt="Happy" className="drop-shadow-sm transition-transform group-hover:scale-110" />, label: "Happy" },
  { value: "excited", icon: <Image src="/assets/moods/excited.svg" width={52} height={52} alt="Excited" className="drop-shadow-sm transition-transform group-hover:scale-110" />, label: "Excited" },
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
    <div className={cn("flex items-center justify-center gap-1 sm:gap-4 flex-wrap", className)}>
      {moods.map((mood) => {
        const isSelected = value === mood.value;
        return (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(mood.value)}
            className={cn(
              "group flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all",
              isSelected
                ? "scale-110 text-primary-600 -translate-y-1"
                : "text-neutral-400 hover:scale-105 hover:text-neutral-600"
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
