import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  controls?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, controls, className }: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Title row — 40px height */}
      <div className="flex h-10 items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-[var(--text-primary)]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Controls row — 36px height */}
      {controls && (
        <div className="flex h-9 items-center gap-2">{controls}</div>
      )}
    </div>
  );
}
