"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/ui/layout";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/ui";
import { StateLoading, StateEmpty, StateError } from "@/shared/ui";
import { TopicRowBrowser } from "../components/topic-row-browser";
import { TopicCollectionEditor } from "../components/topic-collection-editor";
import { AiQualityScorePanel } from "../components/ai-quality-score-panel";
import { AiTopicSuggestionPanel } from "../components/ai-topic-suggestion-panel";
import { useCollection } from "../hooks/use-topics";
import {
  generateTopics,
  fetchGenerationResult,
} from "../api/topics-api";
import type { TopicGenerationResult } from "@/shared/types/api";

interface TopicsScreenProps {
  projectId: string;
  collectionId: string;
}

export function TopicsScreen({ projectId, collectionId }: TopicsScreenProps) {
  const {
    data: collection,
    isLoading,
    isError,
    refetch,
  } = useCollection(projectId, collectionId);

  const [generationResult, setGenerationResult] =
    useState<TopicGenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRegenerate = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const job = await generateTopics(projectId, collectionId, prompt);
      const result = await fetchGenerationResult(projectId, job.id);
      setGenerationResult(result);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptSuggestion = (label: string, description?: string) => {
    // Remove accepted suggestion from result
    if (!generationResult) return;
    setGenerationResult({
      ...generationResult,
      groups: {
        ...generationResult.groups,
        new: generationResult.groups.new.filter((s) => s.label !== label),
        similar: generationResult.groups.similar.filter(
          (s) => s.label !== label,
        ),
      },
    });
  };

  const handleDiscardSuggestion = (label: string) => {
    if (!generationResult) return;
    setGenerationResult({
      ...generationResult,
      groups: {
        ...generationResult.groups,
        new: generationResult.groups.new.filter((s) => s.label !== label),
        similar: generationResult.groups.similar.filter(
          (s) => s.label !== label,
        ),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Topics" />
        <StateLoading variant="page" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Topics" />
        <StateError
          message="Failed to load topics."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Topics" />
        <StateEmpty
          title="No collection found"
          description="Create a topic collection to get started."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-6 pt-6">
        <PageHeader
          title="Topics"
          subtitle="Manage topic collections and assignments"
        />
      </div>

      {/* Split layout */}
      <div className="mt-4 flex min-h-0 flex-1">
        {/* Left: Row browser */}
        <div className="w-1/2 min-w-0">
          <TopicRowBrowser projectId={projectId} />
        </div>

        {/* Right: Tabbed panel */}
        <div className="w-1/2 min-w-0 border-l border-[var(--border-default)]">
          <Tabs defaultValue="collection" className="flex h-full flex-col">
            <div className="shrink-0 px-4">
              <TabsList>
                <TabsTrigger value="collection">Collection</TabsTrigger>
                <TabsTrigger value="quality">AI Score</TabsTrigger>
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="collection"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <TopicCollectionEditor
                projectId={projectId}
                collectionId={collectionId}
              />
            </TabsContent>

            <TabsContent
              value="quality"
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <AiQualityScorePanel
                projectId={projectId}
                collectionId={collectionId}
              />
            </TabsContent>

            <TabsContent
              value="suggestions"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <AiTopicSuggestionPanel
                result={generationResult}
                isLoading={isGenerating}
                onRegenerate={handleRegenerate}
                onAccept={handleAcceptSuggestion}
                onDiscard={handleDiscardSuggestion}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
