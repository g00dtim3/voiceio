"use client";

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {questions.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onSelect(question)}
          className="inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors duration-[120ms] ease-out hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
