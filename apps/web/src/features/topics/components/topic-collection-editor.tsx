"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Toggle } from "@/shared/ui";
import { StateLoading, StateEmpty, StateError } from "@/shared/ui";
import { useCollection } from "../hooks/use-topics";
import { CategoryCreationDialog } from "./category-creation-dialog";
import { TopicCreationDialog } from "./topic-creation-dialog";
import type { Category, Topic } from "@/shared/types/api";

interface TopicCollectionEditorProps {
  projectId: string;
  collectionId: string;
}

export function TopicCollectionEditor({
  projectId,
  collectionId,
}: TopicCollectionEditorProps) {
  const { data: collection, isLoading, isError, refetch } = useCollection(
    projectId,
    collectionId,
  );

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  if (isLoading) {
    return <StateLoading variant="list" rows={4} />;
  }

  if (isError) {
    return (
      <StateError
        message="Failed to load collection."
        onRetry={() => refetch()}
      />
    );
  }

  if (!collection) {
    return (
      <StateEmpty
        title="No collection selected"
        description="Select a topic collection to start editing."
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-surface)]">
      {/* Collection header */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">
            {collection.name}
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {collection.categories.length} categories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Toggle
            checked={collection.sentimentEnabled}
            aria-label="Toggle sentiment"
            label="Sentiment"
            disabled
          />
        </div>
      </div>

      {/* New Category button */}
      <div className="border-b border-[var(--border-default)] px-4 py-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setCategoryDialogOpen(true)}
        >
          <Plus size={14} />
          New Category
        </Button>
      </div>

      {/* Categories list */}
      <div className="flex-1 overflow-y-auto">
        {collection.categories.length === 0 && (
          <div className="px-4 py-8">
            <StateEmpty
              title="No categories yet"
              description="Create a category to organize your topics."
            />
          </div>
        )}

        {collection.categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            onAddTopic={() => {
              setActiveCategoryId(category.id);
              setTopicDialogOpen(true);
            }}
          />
        ))}
      </div>

      {/* Dialogs */}
      <CategoryCreationDialog
        projectId={projectId}
        collectionId={collectionId}
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
      />

      {activeCategoryId && (
        <TopicCreationDialog
          projectId={projectId}
          categoryId={activeCategoryId}
          open={topicDialogOpen}
          onOpenChange={setTopicDialogOpen}
        />
      )}
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

interface CategorySectionProps {
  category: Category;
  onAddTopic: () => void;
}

function CategorySection({ category, onAddTopic }: CategorySectionProps) {
  return (
    <div className="border-b border-[var(--border-default)]">
      {/* Category header */}
      <div className="flex items-center justify-between bg-[var(--bg-muted)] px-4 py-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {category.label}
        </h3>
        <span className="text-xs text-[var(--text-secondary)]">
          {category.topics.length} topics
        </span>
      </div>

      {/* Topic rows */}
      {category.topics.map((topic) => (
        <TopicRow key={topic.id} topic={topic} />
      ))}

      {/* Add topic button */}
      <div className="px-4 py-2">
        <button
          type="button"
          onClick={onAddTopic}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-brand-500)] transition-colors duration-[120ms] ease-out hover:text-[var(--color-brand-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
        >
          <Plus size={12} />
          Add topic
        </button>
      </div>
    </div>
  );
}

// ─── Topic row ────────────────────────────────────────────────────────────────

interface TopicRowProps {
  topic: Topic;
}

function TopicRow({ topic }: TopicRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-2.5 transition-colors duration-[120ms] ease-out hover:bg-[var(--bg-muted)]">
      <div className="min-w-0">
        <p className="truncate text-sm text-[var(--text-primary)]">
          {topic.label}
        </p>
        {topic.description && (
          <p className="truncate text-xs text-[var(--text-secondary)]">
            {topic.description}
          </p>
        )}
      </div>
      <Toggle
        checked={topic.sentimentEnabled}
        aria-label={`Toggle sentiment for ${topic.label}`}
        disabled
      />
    </div>
  );
}
