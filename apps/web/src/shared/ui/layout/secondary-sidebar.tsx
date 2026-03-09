"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

interface SecondarySidebarProps {
  children: ReactNode;
  className?: string;
}

export function SecondarySidebar({ children, className }: SecondarySidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-[240px] flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)]",
        className
      )}
    >
      {children}
    </aside>
  );
}

interface SidebarSectionProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function SidebarSection({ title, actions, children }: SidebarSectionProps) {
  return (
    <div className="px-3 py-3">
      <div className="mb-2 flex items-center justify-between px-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          {title}
        </h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

interface SidebarNavItemProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
}

export function SidebarNavItem({ label, active, onClick, icon }: SidebarNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm transition-colors duration-[120ms] ease-out",
        active
          ? "bg-[var(--bg-hover)] font-medium text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
