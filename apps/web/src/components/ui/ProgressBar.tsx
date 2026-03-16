import { cn } from "@/lib/utils";

type ProgressBarSize = "sm" | "md";

interface ProgressBarProps {
  value: number;
  color?: string;
  size?: ProgressBarSize;
  className?: string;
}

const sizeStyles: Record<ProgressBarSize, string> = {
  sm: "h-1.5",
  md: "h-2.5",
};

export default function ProgressBar({
  value,
  color,
  size = "md",
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-sage-100",
        sizeStyles[size],
        className
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500 ease-out",
          !color && "bg-primary-500"
        )}
        style={{
          width: `${clamped}%`,
          ...(color ? { backgroundColor: color } : {}),
        }}
      />
    </div>
  );
}
