"use client";

import { AppShell } from "@/shared/ui/layout";
import { useParams } from "next/navigation";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <AppShell projectId={projectId}>
      {children}
    </AppShell>
  );
}
