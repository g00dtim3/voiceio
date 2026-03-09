"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface ContextPanelProps {
  children: ReactNode;
  open?: boolean;
  onClose?: () => void;
  className?: string;
}

export function ContextPanel({ children, open = true, onClose, className }: ContextPanelProps) {
  if (!open) return null;

  return (
    <aside
      className={cn(
        "flex h-full w-[420px] flex-col border-l border-[var(--border-default)] bg-[var(--bg-surface)] transition-all duration-[160ms] ease-out",
        className
      )}
    >
      {onClose && (
        <div className="flex items-center justify-end px-3 pt-3">
          <button
            onClick={onClose}
            className="rounded-[var(--radius-sm)] p-1 text-[var(--icon-muted)] transition-colors duration-[120ms] ease-out hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}
