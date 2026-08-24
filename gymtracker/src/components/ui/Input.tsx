import { type InputHTMLAttributes, type ReactNode, forwardRef } from "react";

// ── Component ───────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Optional label displayed above the input */
  label?: string;
  /** Optional icon rendered inside the input on the left */
  leftIcon?: ReactNode;
  /** Use "inline" for transparent, border-bottom-only inputs (e.g. exercise name) */
  variant?: "default" | "inline";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, leftIcon, variant = "default", className = "", ...rest }, ref) => {
    const baseDefault =
      "w-full bg-background border border-border rounded-xl text-sm font-semibold text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary transition-all";

    const baseInline =
      "w-full bg-transparent text-base sm:text-lg font-extrabold font-heading text-foreground placeholder-muted-foreground/50 border-b border-transparent hover:border-border focus:border-primary focus:outline-none pb-1 transition-colors";

    const paddingDefault = leftIcon ? "pl-10 pr-4 py-3" : "px-3.5 py-3";

    const inputClasses =
      variant === "inline"
        ? `${baseInline} ${className}`
        : `${baseDefault} ${paddingDefault} ${className}`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && variant === "default" && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input ref={ref} className={inputClasses} {...rest} />
        </div>
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
