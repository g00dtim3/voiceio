"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/shared/ui/layout";
import { PageHeader } from "@/shared/ui/layout";
import { useInsightQuery } from "../hooks/use-insight-agent";
import { InsightAgentDock } from "../components/insight-agent-dock";

export function InsightAgentScreen() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const mutation = useInsightQuery(projectId);

  const handleSubmit = (question: string) => {
    mutation.mutate({ question });
  };

  return (
    <AppShell
      projectId={projectId}
      bottomDock={
        <InsightAgentDock
          onSubmit={handleSubmit}
          isLoading={mutation.isPending}
          response={mutation.data ?? null}
        />
      }
    >
      <PageHeader
        title="Insight Agent"
        subtitle="Ask questions about your data"
      />

      {/* Main content area — history or empty state */}
      {!mutation.data && !mutation.isPending && (
        <div className="flex flex-1 items-center justify-center pt-24">
          <p className="text-sm text-[var(--text-secondary)]">
            Ask a question below to get started.
          </p>
        </div>
      )}
    </AppShell>
  );
}
