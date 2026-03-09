"use client";

import { use } from "react";
import { SmartColumnsOverviewScreen } from "@/features/smart-columns";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function SmartColumnsPage({ params }: PageProps) {
  const { projectId } = use(params);
  return <SmartColumnsOverviewScreen projectId={projectId} />;
}
