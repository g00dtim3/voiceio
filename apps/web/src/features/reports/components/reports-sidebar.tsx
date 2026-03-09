"use client";

import type { ReportView, ReportSection } from "@/shared/types/api";
import { Button } from "@/shared/ui";
import {
  SecondarySidebar,
  SidebarSection,
  SidebarNavItem,
} from "@/shared/ui/layout";

interface ReportsSidebarProps {
  views: ReportView[];
  sections: ReportSection[];
  activeViewId: string | null;
  activeSectionId: string | null;
  onViewSelect: (viewId: string) => void;
  onSectionSelect: (sectionId: string) => void;
  onNewView: () => void;
  onNewSection: () => void;
}

export function ReportsSidebar({
  views,
  sections,
  activeViewId,
  activeSectionId,
  onViewSelect,
  onSectionSelect,
  onNewView,
  onNewSection,
}: ReportsSidebarProps) {
  return (
    <SecondarySidebar>
      {/* Views */}
      <SidebarSection
        title="Views"
        actions={
          <Button variant="ghost" size="sm" onClick={onNewView}>
            New View
          </Button>
        }
      >
        <nav className="space-y-0.5">
          {views.map((view) => (
            <SidebarNavItem
              key={view.id}
              label={view.name}
              active={view.id === activeViewId}
              onClick={() => onViewSelect(view.id)}
            />
          ))}
        </nav>
      </SidebarSection>

      {/* Divider */}
      <div className="mx-3 border-t border-[var(--border-default)]" />

      {/* Sections */}
      <SidebarSection
        title="Sections"
        actions={
          <Button variant="ghost" size="sm" onClick={onNewSection}>
            New Section
          </Button>
        }
      >
        <nav className="space-y-0.5">
          {sections.map((section) => (
            <SidebarNavItem
              key={section.id}
              label={section.name}
              active={section.id === activeSectionId}
              onClick={() => onSectionSelect(section.id)}
            />
          ))}
        </nav>
      </SidebarSection>
    </SecondarySidebar>
  );
}
