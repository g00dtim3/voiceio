"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Play } from "lucide-react";
import {
  Button,
  Toggle,
  DataTable,
  StateLoading,
  StateEmpty,
} from "@/shared/ui";
import type { SmartColumnPreviewItem } from "@/shared/types/api";
import { usePreviewSmartColumn } from "../hooks/use-smart-columns";

// ─── Component ───────────────────────────────────────────────────────────────

interface SmartColumnPreviewPanelProps {
  projectId: string;
  smartColumnId: string;
}

export function SmartColumnPreviewPanel({
  projectId,
  smartColumnId,
}: SmartColumnPreviewPanelProps) {
  const [randomSample, setRandomSample] = useState(false);
  const preview = usePreviewSmartColumn(projectId, smartColumnId);

  const handleComputePreview = () => {
    preview.mutate({ sampleSize: 10, randomSample });
  };

  // Build columns dynamically from preview data
  const previewColumns: ColumnDef<SmartColumnPreviewItem, unknown>[] = [];

  if (preview.data && preview.data.length > 0) {
    const inputKeys = Object.keys(preview.data[0].inputs);
    inputKeys.forEach((key) => {
      previewColumns.push({
        id: `input-${key}`,
        header: key,
        accessorFn: (row) => row.inputs[key],
        cell: ({ getValue }) => (
          <span className="text-[var(--text-secondary)]">
            {getValue() as string}
          </span>
        ),
      });
    });

    previewColumns.push({
      accessorKey: "output",
      header: "Output",
      cell: ({ row }) => (
        <span className="font-medium text-[var(--text-primary)]">
          {row.original.output}
        </span>
      ),
    });
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Toggle
          label="Random sample"
          checked={randomSample}
          onCheckedChange={setRandomSample}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleComputePreview}
          loading={preview.isPending}
        >
          <Play size={14} aria-hidden />
          Compute Preview
        </Button>
      </div>

      {/* Preview results */}
      {preview.isPending && (
        <StateLoading variant="table" rows={5} cols={3} label="Computing preview..." />
      )}

      {!preview.isPending && !preview.data && (
        <StateEmpty
          title="No preview yet"
          description="Click 'Compute Preview' to see sample results."
        />
      )}

      {preview.data && preview.data.length > 0 && (
        <DataTable
          columns={previewColumns}
          data={preview.data}
          emptyMessage="No preview results."
        />
      )}

      {preview.data && preview.data.length === 0 && (
        <StateEmpty
          title="Empty preview"
          description="The preview returned no results. Check your configuration."
        />
      )}
    </div>
  );
}
