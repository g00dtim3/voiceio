import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/cn";

const chipVariants = cva(
  "inline-flex h-7 items-center gap-1 rounded-[var(--radius-pill)] px-2.5 text-xs font-medium transition-colors duration-[120ms] ease-out",
  {
    variants: {
      variant: {
        topic:
          "border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]",
        segment:
          "border border-[var(--color-brand-500)]/30 bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]",
        filter:
          "border border-[var(--border-default)] bg-[var(--bg-muted)] text-[var(--text-primary)]",
        sentiment_positive:
          "bg-[var(--color-sentiment-positive)]/10 text-[var(--color-sentiment-positive)]",
        sentiment_neutral:
          "bg-[var(--color-sentiment-neutral)]/10 text-[var(--color-sentiment-neutral)]",
        sentiment_negative:
          "bg-[var(--color-sentiment-negative)]/10 text-[var(--color-sentiment-negative)]",
        status_success:
          "bg-[var(--color-success-500)]/10 text-[var(--color-success-500)]",
        status_warning:
          "bg-[var(--color-warning-500)]/10 text-[var(--color-warning-500)]",
        status_danger:
          "bg-[var(--color-danger-500)]/10 text-[var(--color-danger-500)]",
        status_info:
          "bg-[var(--color-info-500)]/10 text-[var(--color-info-500)]",
      },
    },
    defaultVariants: {
      variant: "topic",
    },
  }
);

export interface ChipProps extends VariantProps<typeof chipVariants> {
  label: string;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function Chip({ label, variant, removable, onRemove, className }: ChipProps) {
  return (
    <span className={cn(chipVariants({ variant }), className)}>
      {label}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full p-0.5 opacity-70 transition-opacity duration-[120ms] ease-out hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand-500)]"
          aria-label={`Remove ${label}`}
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}
