import * as React from "react";
import { cn } from "@/shared/utils/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-[var(--text-primary)]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "min-h-[80px] w-full rounded-[var(--radius-sm)] border bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors duration-[120ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-[var(--color-danger-500)]"
              : "border-[var(--border-default)]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-[var(--color-danger-500)]">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
