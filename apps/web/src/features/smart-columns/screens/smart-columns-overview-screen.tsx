"use client";

import { SmartColumnsOverview } from "../components/smart-columns-overview";

interface SmartColumnsOverviewScreenProps {
  projectId: string;
}

export function SmartColumnsOverviewScreen({ projectId }: SmartColumnsOverviewScreenProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <SmartColumnsOverview projectId={projectId} />
    </div>
  );
}
