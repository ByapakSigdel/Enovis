import { type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "elevated" | "outlined";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  padding?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-card shadow-sm",
  elevated: "bg-card shadow-md",
  outlined: "bg-card border border-sage-200",
};

export default function Card({
  children,
  className,
  variant = "default",
  padding = true,
  onClick,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        variantStyles[variant],
        padding && "p-5",
        onClick && "cursor-pointer hover:bg-card-hover",
        className
      )}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
}
