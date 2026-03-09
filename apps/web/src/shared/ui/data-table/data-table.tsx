"use client";

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  emptyMessage?: string;
  emptyState?: ReactNode;
  onRowClick?: (row: TData) => void;
  className?: string;
};

export function DataTable<TData>({
  columns,
  data,
  emptyMessage = "No data available.",
  emptyState,
  onRowClick,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (!data.length) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] p-6 text-sm text-[var(--text-secondary)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)]", className)}>
      <table className="w-full border-collapse">
        <thead className="bg-[var(--bg-surface-subtle)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-[var(--border-default)]">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]",
                    header.column.getCanSort() && "cursor-pointer select-none"
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <ArrowUpDown size={12} className="text-[var(--icon-muted)]" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "border-b border-[var(--border-default)] last:border-b-0 transition-colors duration-[120ms] ease-out hover:bg-[var(--bg-hover)]",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-sm text-[var(--text-primary)]">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
