import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

interface ChartFrameProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  emptyState?: ReactNode;
  errorState?: ReactNode;
  className?: string;
}

export function ChartFrame({
  title,
  actions,
  children,
  emptyState,
  errorState,
  className,
}: ChartFrameProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-4">
        {errorState || emptyState || children}
      </div>
    </div>
  );
}
