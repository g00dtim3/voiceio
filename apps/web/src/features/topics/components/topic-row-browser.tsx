"use client";

import { useState, useCallback } from "react";
import { Search, Filter, ArrowUpDown, Eye } from "lucide-react";
import {
  Checkbox,
  TextInput,
  Button,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Toggle,
} from "@/shared/ui";
import { VirtualizedRowList } from "@/shared/ui/data-table/virtualized-row-list";
import { StateLoading, StateEmpty, StateError } from "@/shared/ui";
import { TopicRowItem } from "./topic-row-item";
import { useRows } from "../hooks/use-topics";
import type { FetchRowsParams } from "../api/topics-api";

interface TopicRowBrowserProps {
  projectId: string;
}

export function TopicRowBrowser({ projectId }: TopicRowBrowserProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [reviewed, setReviewed] = useState<string>("all");
  const [focusMode, setFocusMode] = useState(false);
  const [sortBy, setSortBy] = useState<string>("default");

  const params: FetchRowsParams = {
    search: search || undefined,
    reviewed: reviewed === "all" ? undefined : reviewed === "reviewed",
    focusMode: focusMode || undefined,
    sortBy: sortBy !== "default" ? sortBy : undefined,
  };

  const { data, isLoading, isError, refetch } = useRows(projectId, params);
  const rows = data?.items ?? [];
  const total = data?.meta?.total ?? 0;

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  const handleSelectAll = useCallback(
    (_id: string, checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(rows.map((r) => r.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [rows],
  );

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleCopy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
  }, []);

  return (
    <div className="flex h-full flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-4 py-3">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => handleSelectAll("", !!checked)}
          aria-label="Select all rows"
        />
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--icon-muted)]"
          />
          <input
            type="text"
            placeholder="Search rows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors duration-[120ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          />
        </div>
        <span className="shrink-0 text-xs text-[var(--text-secondary)]">
          {total} rows
        </span>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-4 py-2">
        <Select value={reviewed} onValueChange={setReviewed}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Reviewed" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="unreviewed">Unreviewed</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Eye size={14} className="text-[var(--icon-muted)]" />
          <Toggle
            checked={focusMode}
            onCheckedChange={setFocusMode}
            aria-label="Focus mode"
          />
          <span className="text-xs text-[var(--text-secondary)]">Focus</span>
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <ArrowUpDown size={12} className="mr-1" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="assignments">Assignments</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row list */}
      <div className="flex-1 overflow-hidden">
        {isLoading && <StateLoading variant="list" rows={6} />}
        {isError && <StateError message="Failed to load rows." onRetry={() => refetch()} />}
        {!isLoading && !isError && rows.length === 0 && (
          <StateEmpty title="No rows found" description="Try adjusting your filters." />
        )}
        {!isLoading && !isError && rows.length > 0 && (
          <VirtualizedRowList
            items={rows}
            estimateSize={88}
            className="h-full"
            renderRow={(row) => (
              <TopicRowItem
                key={row.id}
                row={row}
                selected={selectedIds.has(row.id)}
                onSelect={handleSelectRow}
                onCopy={handleCopy}
              />
            )}
          />
        )}
      </div>
    </div>
  );
}
