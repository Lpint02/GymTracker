import { type HTMLAttributes, type ReactNode } from "react";

// ── Variant Map ─────────────────────────────────────────────────────────

const variantClasses: Record<string, string> = {
  surface:
    "bg-card border border-border rounded-2xl shadow-xl",
  elevated:
    "bg-background border border-border rounded-2xl shadow-md",
  dark:
    "bg-background/40 rounded-xl border border-border",
};

// ── Component ───────────────────────────────────────────────────────────

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "surface" | "elevated" | "dark";
  padding?: string;
  children: ReactNode;
}

export default function Card({
  variant = "surface",
  padding = "p-5",
  children,
  className = "",
  ...rest
}: CardProps) {
  return (
    <div className={`${variantClasses[variant]} ${padding} ${className}`} {...rest}>
      {children}
    </div>
  );
}
