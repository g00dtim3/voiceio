"use client";

import { useState } from "react";
import { Check, X, RefreshCw, Sparkles } from "lucide-react";
import { Button, Textarea } from "@/shared/ui";
import { StateLoading, StateEmpty } from "@/shared/ui";
import type { TopicGenerationResult } from "@/shared/types/api";

interface AiTopicSuggestionPanelProps {
  result: TopicGenerationResult | null;
  isLoading: boolean;
  onRegenerate: (prompt: string) => void;
  onAccept: (label: string, description?: string) => void;
  onDiscard: (label: string) => void;
}

export function AiTopicSuggestionPanel({
  result,
  isLoading,
  onRegenerate,
  onAccept,
  onDiscard,
}: AiTopicSuggestionPanelProps) {
  const [prompt, setPrompt] = useState("");

  const handleRegenerate = () => {
    if (prompt.trim()) {
      onRegenerate(prompt.trim());
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-surface)]">
      {/* Prompt input */}
      <div className="border-b border-[var(--border-default)] px-4 py-3">
        <Textarea
          label="Generation prompt"
          placeholder="Describe the topics you want to generate..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />
        <div className="mt-2 flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={handleRegenerate}
            loading={isLoading}
            disabled={!prompt.trim()}
          >
            <RefreshCw size={14} />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Suggestions */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <StateLoading variant="list" rows={4} />}

        {!isLoading && !result && (
          <div className="px-4 py-8">
            <StateEmpty
              icon={<Sparkles size={24} />}
              title="No suggestions yet"
              description="Enter a prompt and generate AI topic suggestions."
            />
          </div>
        )}

        {!isLoading && result && (
          <div className="space-y-4 p-4">
            {/* New suggestions */}
            {result.groups.new.length > 0 && (
              <SuggestionGroup title="New Topics" variant="new">
                {result.groups.new.map((suggestion) => (
                  <SuggestionItem
                    key={suggestion.label}
                    label={suggestion.label}
                    description={suggestion.description}
                    onAccept={() =>
                      onAccept(suggestion.label, suggestion.description)
                    }
                    onDiscard={() => onDiscard(suggestion.label)}
                  />
                ))}
              </SuggestionGroup>
            )}

            {/* Similar suggestions */}
            {result.groups.similar.length > 0 && (
              <SuggestionGroup title="Similar to Existing" variant="similar">
                {result.groups.similar.map((suggestion) => (
                  <SuggestionItem
                    key={suggestion.label}
                    label={suggestion.label}
                    description={`Matches topic: ${suggestion.matchesTopicId}`}
                    onAccept={() => onAccept(suggestion.label)}
                    onDiscard={() => onDiscard(suggestion.label)}
                  />
                ))}
              </SuggestionGroup>
            )}

            {/* Discarded */}
            {result.groups.discarded.length > 0 && (
              <SuggestionGroup title="Discarded" variant="discarded">
                {result.groups.discarded.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-muted)] px-3 py-2 text-sm text-[var(--text-secondary)] line-through"
                  >
                    {String(item)}
                  </div>
                ))}
              </SuggestionGroup>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Suggestion group ─────────────────────────────────────────────────────────

interface SuggestionGroupProps {
  title: string;
  variant: "new" | "similar" | "discarded";
  children: React.ReactNode;
}

function SuggestionGroup({ title, variant, children }: SuggestionGroupProps) {
  const badgeColors: Record<string, string> = {
    new: "bg-[var(--color-success-500)]/10 text-[var(--color-success-500)]",
    similar:
      "bg-[var(--color-warning-500)]/10 text-[var(--color-warning-500)]",
    discarded:
      "bg-[var(--color-danger-500)]/10 text-[var(--color-danger-500)]",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          {title}
        </h4>
        <span
          className={`rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-medium ${badgeColors[variant]}`}
        >
          {variant}
        </span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

// ─── Suggestion item ──────────────────────────────────────────────────────────

interface SuggestionItemProps {
  label: string;
  description?: string;
  onAccept: () => void;
  onDiscard: () => void;
}

function SuggestionItem({
  label,
  description,
  onAccept,
  onDiscard,
}: SuggestionItemProps) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 transition-colors duration-[120ms] ease-out hover:bg-[var(--bg-muted)]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
          {label}
        </p>
        {description && (
          <p className="truncate text-xs text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onAccept}
          className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-success-500)] transition-colors duration-[120ms] ease-out hover:bg-[var(--color-success-500)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          aria-label={`Accept ${label}`}
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-danger-500)] transition-colors duration-[120ms] ease-out hover:bg-[var(--color-danger-500)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          aria-label={`Discard ${label}`}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
