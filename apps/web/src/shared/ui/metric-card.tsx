import { cn } from "@/shared/utils/cn";

type MetricCardProps = {
  label: string;
  value: string;
  subtext?: string;
  delta?: string;
  status?: "success" | "warning" | "danger" | "info";
  className?: string;
};

const STATUS_COLORS = {
  success: "text-[var(--color-success-500)]",
  warning: "text-[var(--color-warning-500)]",
  danger: "text-[var(--color-danger-500)]",
  info: "text-[var(--color-info-500)]",
} as const;

export function MetricCard({ label, value, subtext, delta, status, className }: MetricCardProps) {
  return (
    <section
      className={cn(
        "min-h-[112px] min-w-[220px] rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]",
        className
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">{label}</h3>
        {delta && (
          <span className={cn("text-xs font-medium", status ? STATUS_COLORS[status] : STATUS_COLORS.success)}>
            {delta}
          </span>
        )}
      </div>
      <div className="text-[28px] font-semibold leading-tight text-[var(--text-primary)]">
        {value}
      </div>
      {subtext && (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">{subtext}</p>
      )}
    </section>
  );
}
