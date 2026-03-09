"use client";

import type { ReactNode } from "react";
import { GlobalSidebar } from "./global-sidebar";

interface AppShellProps {
  projectId?: string;
  secondaryNav?: ReactNode;
  children: ReactNode;
  contextPanel?: ReactNode;
  bottomDock?: ReactNode;
}

export function AppShell({
  projectId,
  secondaryNav,
  children,
  contextPanel,
  bottomDock,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-app)]">
      <GlobalSidebar projectId={projectId} />

      {secondaryNav}

      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="relative flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
          {contextPanel}
        </main>
        {bottomDock}
      </div>
    </div>
  );
}
