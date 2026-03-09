import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

interface TopBarActionsProps {
  children: ReactNode;
  className?: string;
}

export function TopBarActions({ children, className }: TopBarActionsProps) {
  return (
    <div className={cn("flex h-9 items-center gap-2", className)}>
      {children}
    </div>
  );
}
