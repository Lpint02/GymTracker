import { type ButtonHTMLAttributes, type ReactNode } from "react";

// ── Variant & Size Maps ─────────────────────────────────────────────────

const variantClasses: Record<string, string> = {
  ghost:
    "text-muted-foreground hover:text-foreground hover:bg-muted transition-all",
  danger:
    "text-muted-foreground hover:text-destructive hover:bg-background transition-all",
};

const sizeClasses: Record<string, string> = {
  sm: "w-7 h-7 rounded-md",
  md: "w-8 h-8 rounded-lg",
};

// ── Component ───────────────────────────────────────────────────────────

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ghost" | "danger";
  size?: "sm" | "md";
  icon: ReactNode;
}

export default function IconButton({
  variant = "ghost",
  size = "md",
  icon,
  className = "",
  ...rest
}: IconButtonProps) {
  return (
    <button
      className={`flex items-center justify-center cursor-pointer select-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  );
}
