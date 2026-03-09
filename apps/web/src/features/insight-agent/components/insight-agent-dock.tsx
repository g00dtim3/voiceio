"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import type { InsightResponse } from "@/shared/types/api";
import { TextInput } from "@/shared/ui";
import { SuggestedQuestions } from "./suggested-questions";
import { InsightResponseCard } from "./insight-response-card";

type DockState = "idle" | "generating" | "answered";

const DEFAULT_SUGGESTIONS = [
  "What are the top themes?",
  "What drives negative sentiment?",
  "Show NPS trend over time",
];

interface InsightAgentDockProps {
  onSubmit: (question: string) => void;
  isLoading: boolean;
  response: InsightResponse | null;
}

export function InsightAgentDock({ onSubmit, isLoading, response }: InsightAgentDockProps) {
  const [question, setQuestion] = useState("");

  const dockState: DockState = isLoading
    ? "generating"
    : response
      ? "answered"
      : "idle";

  const handleSubmit = useCallback(() => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setQuestion("");
  }, [question, isLoading, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleSuggestedSelect = useCallback(
    (q: string) => {
      setQuestion(q);
      onSubmit(q);
    },
    [onSubmit],
  );

  return (
    <div
      className="border-t border-[var(--border-default)] bg-[var(--bg-surface)] transition-all duration-[160ms] ease-out"
      style={{
        minHeight: dockState === "idle" ? 168 : dockState === "answered" ? 320 : 168,
        maxHeight: dockState === "answered" ? 420 : undefined,
      }}
    >
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        {/* Input */}
        <TextInput
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question and press Enter..."
          disabled={isLoading}
          className="w-full"
        />

        {/* Generating state */}
        {dockState === "generating" && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--color-brand-500)]" />
            Analyzing your data...
          </div>
        )}

        {/* Idle state — suggested questions */}
        {dockState === "idle" && (
          <SuggestedQuestions questions={DEFAULT_SUGGESTIONS} onSelect={handleSuggestedSelect} />
        )}

        {/* Answered state — response card */}
        {dockState === "answered" && response && (
          <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
            <InsightResponseCard response={response} onFollowUp={handleSuggestedSelect} />
          </div>
        )}
      </div>
    </div>
  );
}
