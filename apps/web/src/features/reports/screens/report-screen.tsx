"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AppShell, PageHeader } from "@/shared/ui/layout";
import {
  Button,
  Chip,
  StateLoading,
  StateEmpty,
  StateError,
} from "@/shared/ui";
import { useReport, useCreateSection } from "../hooks/use-reports";
import { ReportsSidebar } from "../components/reports-sidebar";
import { ReportCanvas } from "../components/report-canvas";
import { ShareReportDialog } from "../components/share-report-dialog";
import { AddSectionDialog } from "../components/add-section-dialog";
import { AddElementDialog } from "../components/add-element-dialog";
import type { ShareSettings, InsightElementType } from "@/shared/types/api";

export function ReportScreen() {
  const params = useParams<{ projectId: string; reportId: string }>();
  const projectId = params.projectId;
  const reportId = params.reportId;

  const { data: report, isLoading, error } = useReport(projectId, reportId);
  const createSection = useCreateSection(projectId, reportId);

  // UI state
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [addElementOpen, setAddElementOpen] = useState(false);
  const [_addElementSectionId, setAddElementSectionId] = useState<string | null>(null);

  // Placeholder share settings (would be fetched via sharing API)
  const [shareSettings] = useState<ShareSettings>({
    teamAccess: [],
    publicAccess: {
      enabled: false,
      shareToken: "",
      passwordEnabled: false,
      embedEnabled: false,
    },
  });

  const handleAddElement = useCallback((sectionId: string) => {
    setAddElementSectionId(sectionId);
    setAddElementOpen(true);
  }, []);

  const handleCreateSection = useCallback(
    (name: string) => {
      createSection.mutate(name);
    },
    [createSection],
  );

  const handleAddElementSubmit = useCallback(
    (_data: { category: string; type: InsightElementType; chartType: string; limit: number }) => {
      // Would call createElement API
      setAddElementOpen(false);
    },
    [],
  );

  // Loading / error states
  if (isLoading) {
    return (
      <AppShell projectId={projectId}>
        <StateLoading label="Loading report..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell projectId={projectId}>
        <StateError
          message={error instanceof Error ? error.message : "Failed to load report"}
        />
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell projectId={projectId}>
        <StateEmpty
          title="Report not found"
          description="The report you are looking for does not exist."
        />
      </AppShell>
    );
  }

  return (
    <>
      <AppShell
        projectId={projectId}
        secondaryNav={
          <ReportsSidebar
            views={report.views}
            sections={report.sections}
            activeViewId={activeViewId}
            activeSectionId={activeSectionId}
            onViewSelect={setActiveViewId}
            onSectionSelect={setActiveSectionId}
            onNewView={() => {}}
            onNewSection={() => setAddSectionOpen(true)}
          />
        }
      >
        <PageHeader
          title={report.name}
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
              >
                {mode === "edit" ? "Preview" : "Edit"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShareOpen(true)}
              >
                Share
              </Button>
            </>
          }
          controls={
            <div className="flex items-center gap-2">
              {/* Segment chips */}
              {report.views
                .find((v) => v.id === activeViewId)
                ?.segments.map((segment) => (
                  <Chip key={segment.id} label={segment.label} />
                ))}

              {/* Filters button */}
              <Button variant="ghost" size="sm">
                Filters
              </Button>

              {/* Date range placeholder */}
              <Button variant="ghost" size="sm">
                Date range
              </Button>
            </div>
          }
        />

        <ReportCanvas
          sections={report.sections}
          mode={mode}
          onAddElement={handleAddElement}
        />
      </AppShell>

      {/* Dialogs */}
      <ShareReportDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        settings={shareSettings}
        onUpdateTeamAccess={() => {}}
        onUpdatePublicAccess={() => {}}
      />

      <AddSectionDialog
        open={addSectionOpen}
        onOpenChange={setAddSectionOpen}
        onSubmit={handleCreateSection}
      />

      <AddElementDialog
        open={addElementOpen}
        onOpenChange={setAddElementOpen}
        onSubmit={handleAddElementSubmit}
      />
    </>
  );
}
