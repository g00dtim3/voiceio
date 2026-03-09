import { PageHeader } from "@/shared/ui/layout";
import { MetricCard } from "@/shared/ui";

export default function ProjectOverview() {
  return (
    <div className="space-y-6">
      <PageHeader title="Project Overview" subtitle="Customer Feedback Q2" />
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Rows" value="957" subtext="Imported 2 days ago" />
        <MetricCard label="Topics Assigned" value="847" delta="+12%" />
        <MetricCard label="AI Coverage" value="89%" subtext="91 unreviewed rows" />
      </div>
    </div>
  );
}
