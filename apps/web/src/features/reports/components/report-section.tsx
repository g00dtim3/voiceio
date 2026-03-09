"use client";

import type { ReportSection as ReportSectionType } from "@/shared/types/api";
import { StateEmpty } from "@/shared/ui";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/shared/ui";
import { Button } from "@/shared/ui";
import { InsightElementRenderer } from "./insight-element-renderer";

interface ReportSectionProps {
  section: ReportSectionType;
  onAddElement: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
}

export function ReportSectionCard({
  section,
  onAddElement,
  onDeleteSection,
}: ReportSectionProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
      {/* Section header */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {section.name}
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Section actions">
              ...
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onAddElement(section.id)}>
              Add element
            </DropdownMenuItem>
            {onDeleteSection && (
              <DropdownMenuItem
                onSelect={() => onDeleteSection(section.id)}
                className="text-[var(--color-danger-500)]"
              >
                Delete section
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Elements */}
      <div className="space-y-4 p-4">
        {section.elements.length === 0 ? (
          <StateEmpty
            title="No elements yet"
            description="Add an element to get started."
            cta={{ label: "Add element", onClick: () => onAddElement(section.id) }}
          />
        ) : (
          section.elements
            .sort((a, b) => a.order - b.order)
            .map((element) => (
              <InsightElementRenderer key={element.id} element={element} />
            ))
        )}
      </div>
    </div>
  );
}
