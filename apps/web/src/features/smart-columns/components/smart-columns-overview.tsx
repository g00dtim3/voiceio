"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Button,
  MetricCard,
  DataTable,
  Chip,
  StateLoading,
  StateEmpty,
  StateError,
} from "@/shared/ui";
import { PageHeader } from "@/shared/ui/layout";
import type {
  SmartColumnListItem,
  SmartColumnComputationType,
  SmartColumnStatus,
} from "@/shared/types/api";
import { useSmartColumns } from "../hooks/use-smart-columns";

// ─── Status chip mapping ─────────────────────────────────────────────────────

const STATUS_VARIANT: Record<SmartColumnStatus, "status_success" | "status_warning" | "status_danger" | "status_info"> = {
  draft: "status_info",
  queued: "status_info",
  running: "status_warning",
  completed: "status_success",
  failed: "status_danger",
  outdated: "status_warning",
};

const TYPE_LABELS: Record<SmartColumnComputationType, string> = {
  mapping: "Mapping",
  formula: "Formula",
  llm: "LLM",
};

// ─── Table columns ───────────────────────────────────────────────────────────

const columns: ColumnDef<SmartColumnListItem, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium text-[var(--text-primary)]">
        {row.original.name}
      </span>
    ),
  },
  {
    accessorKey: "computationType",
    header: "Type",
    cell: ({ row }) => TYPE_LABELS[row.original.computationType],
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Chip
        label={row.original.status}
        variant={STATUS_VARIANT[row.original.status]}
      />
    ),
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface SmartColumnsOverviewProps {
  projectId: string;
}

export function SmartColumnsOverview({ projectId }: SmartColumnsOverviewProps) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useSmartColumns(projectId);

  if (isLoading) {
    return <StateLoading variant="page" label="Loading smart columns..." />;
  }

  if (isError) {
    return (
      <StateError
        message={error?.message ?? "Failed to load smart columns."}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return (
      <StateEmpty
        title="No smart columns"
        description="Create your first smart column to enrich your data."
        cta={{
          label: "New Smart Column",
          onClick: () => router.push(`/projects/${projectId}/smart-columns/new`),
        }}
      />
    );
  }

  const { stats, items } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Columns"
        actions={
          <Button
            onClick={() => router.push(`/projects/${projectId}/smart-columns/new`)}
          >
            <Plus size={16} aria-hidden />
            New Smart Column
          </Button>
        }
      />

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="TTA Slots"
          value={`${stats.ttaSlotsUsed} / ${stats.ttaSlotsTotal}`}
          subtext="Text-to-anything slots used"
          status={
            stats.ttaSlotsUsed >= stats.ttaSlotsTotal ? "danger" : "info"
          }
        />
        <MetricCard
          label="Non-TTA Slots"
          value={`${stats.nonTtaSlotsUsed} / ${stats.nonTtaSlotsTotal}`}
          subtext="Formula & mapping slots used"
          status={
            stats.nonTtaSlotsUsed >= stats.nonTtaSlotsTotal
              ? "danger"
              : "info"
          }
        />
        <MetricCard
          label="Rows Computed"
          value={stats.rowsComputed.toLocaleString()}
          subtext="Total rows processed"
          status="success"
        />
      </div>

      {/* Data table */}
      {items.length === 0 ? (
        <StateEmpty
          title="No smart columns yet"
          description="Create a smart column to get started."
          cta={{
            label: "New Smart Column",
            onClick: () =>
              router.push(`/projects/${projectId}/smart-columns/new`),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          onRowClick={(row) =>
            router.push(
              `/projects/${projectId}/smart-columns/${row.id}`
            )
          }
        />
      )}
    </div>
  );
}
