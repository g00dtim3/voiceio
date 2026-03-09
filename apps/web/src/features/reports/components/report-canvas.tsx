"use client";

import type { ReportSection } from "@/shared/types/api";
import { ReportSectionCard } from "./report-section";

interface ReportCanvasProps {
  sections: ReportSection[];
  mode: "edit" | "preview";
  onAddElement: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
}

export function ReportCanvas({
  sections,
  mode,
  onAddElement,
  onDeleteSection,
}: ReportCanvasProps) {
  const sorted = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4 p-6">
      {sorted.map((section) => (
        <ReportSectionCard
          key={section.id}
          section={section}
          onAddElement={mode === "edit" ? onAddElement : () => {}}
          onDeleteSection={mode === "edit" ? onDeleteSection : undefined}
        />
      ))}
    </div>
  );
}
