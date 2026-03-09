"use client";

import { use } from "react";
import { SmartColumnDetailScreen } from "@/features/smart-columns";

interface PageProps {
  params: Promise<{ projectId: string; smartColumnId: string }>;
}

export default function SmartColumnDetailPage({ params }: PageProps) {
  const { projectId, smartColumnId } = use(params);
  return (
    <SmartColumnDetailScreen
      projectId={projectId}
      smartColumnId={smartColumnId}
    />
  );
}
