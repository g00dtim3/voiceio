"use client";

import { useRouter } from "next/navigation";
import { Button, StateLoading, StateEmpty, StateError } from "@/shared/ui";
import { PageHeader } from "@/shared/ui/layout";
import type { Job } from "@/shared/types/api";
import { useSmartColumn, useComputeSmartColumn } from "../hooks/use-smart-columns";
import { SmartColumnConfigForm, type SmartColumnFormValues } from "../components/smart-column-config-form";
import { SmartColumnPreviewPanel } from "../components/smart-column-preview-panel";
import { SmartColumnJobStatus } from "../components/smart-column-job-status";

// ─── Component ───────────────────────────────────────────────────────────────

interface SmartColumnDetailScreenProps {
  projectId: string;
  smartColumnId: string;
}

export function SmartColumnDetailScreen({
  projectId,
  smartColumnId,
}: SmartColumnDetailScreenProps) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useSmartColumn(
    projectId,
    smartColumnId
  );
  const compute = useComputeSmartColumn(projectId, smartColumnId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <StateLoading variant="page" label="Loading smart column..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <StateError
          message={error?.message ?? "Failed to load smart column."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <StateEmpty
          title="Smart column not found"
          description="This smart column may have been deleted."
          cta={{
            label: "Back to Smart Columns",
            onClick: () =>
              router.push(`/projects/${projectId}/smart-columns`),
          }}
        />
      </div>
    );
  }

  // Map detail to form defaults
  const formDefaults: Partial<SmartColumnFormValues> = {
    name: data.name,
    computationType: data.computationType,
    outputType: data.outputType,
    prompt: data.config.prompt,
    inputVariables: data.config.inputVariables,
    fallbackValue: data.config.fallbackValue ?? "",
  };

  // Derive a mock job from the detail status for display
  const jobFromStatus: Job | null =
    data.status !== "draft"
      ? {
          id: data.id,
          type: "smart-column",
          status:
            data.status === "outdated"
              ? "completed"
              : data.status === "draft"
                ? "queued"
                : data.status,
          progress: data.status === "completed" ? 100 : 0,
          rowsAffected: 0,
          createdAt: "",
          updatedAt: "",
        }
      : null;

  const handleSubmit = (_values: SmartColumnFormValues) => {
    // Form submission is handled by parent / create flow
  };

  const handleCreateAndFill = () => {
    compute.mutate("all");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        title={data.name}
        subtitle={`${data.computationType.toUpperCase()} column`}
        actions={
          <Button
            onClick={() =>
              router.push(`/projects/${projectId}/smart-columns`)
            }
            variant="secondary"
          >
            Back
          </Button>
        }
      />

      {/* Split view: config left, preview right */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left panel — 40% */}
        <div className="w-full lg:w-2/5">
          <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]">
            <SmartColumnConfigForm
              defaultValues={formDefaults}
              onSubmit={handleSubmit}
            />
          </div>
        </div>

        {/* Right panel — 60% */}
        <div className="w-full lg:w-3/5">
          <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]">
            <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
              Preview
            </h3>
            <SmartColumnPreviewPanel
              projectId={projectId}
              smartColumnId={smartColumnId}
            />
          </div>
        </div>
      </div>

      {/* Bottom: Job status + Create & Fill */}
      <div className="space-y-4">
        <SmartColumnJobStatus job={jobFromStatus} />

        <div className="flex justify-end">
          <Button
            onClick={handleCreateAndFill}
            loading={compute.isPending}
          >
            Create & Fill
          </Button>
        </div>
      </div>
    </div>
  );
}
