import { type ButtonHTMLAttributes, type ReactNode } from "react";

// ── Variant & Size Maps ─────────────────────────────────────────────────

const variantClasses: Record<string, string> = {
  primary:
    "bg-primary hover:bg-secondary text-on-primary shadow-lg shadow-primary/20 active:scale-[0.98]",
  secondary:
    "bg-muted hover:bg-muted/70 text-muted-foreground border border-border",
  danger:
    "bg-destructive hover:bg-destructive/90 text-foreground",
  ghost:
    "bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground",
  dashed:
    "border-2 border-dashed border-border hover:border-muted-foreground/40 text-muted-foreground/70 hover:text-muted-foreground hover:bg-white/[0.01]",
};

const sizeClasses: Record<string, string> = {
  sm: "py-2 px-3 text-xs rounded-lg",
  md: "py-3 px-4 text-xs rounded-xl",
  lg: "py-4 px-5 text-sm rounded-xl",
};

// ── Component ───────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "dashed";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  leftIcon,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    "font-heading font-bold tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer select-none";

  const disabledClasses = disabled
    ? "opacity-50 cursor-not-allowed pointer-events-none"
    : "";

  return (
    <button
      disabled={disabled}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${
        fullWidth ? "w-full" : ""
      } ${disabledClasses} ${className}`}
      {...rest}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
    </button>
  );
}
