"use client";

import { Braces, FunctionSquare, Sparkles } from "lucide-react";
import type { SmartColumnComputationType } from "@/shared/types/api";
import { cn } from "@/shared/utils/cn";

interface TypeOption {
  type: SmartColumnComputationType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const OPTIONS: TypeOption[] = [
  {
    type: "mapping",
    label: "Mapping",
    description: "Map values from one column to another using a lookup table.",
    icon: <Braces size={24} aria-hidden />,
  },
  {
    type: "formula",
    label: "Formula",
    description: "Compute values using spreadsheet-style formulas and expressions.",
    icon: <FunctionSquare size={24} aria-hidden />,
  },
  {
    type: "llm",
    label: "LLM",
    description: "Use AI to generate column values from a prompt with input variables.",
    icon: <Sparkles size={24} aria-hidden />,
  },
];

interface SmartColumnTypePickerProps {
  value?: SmartColumnComputationType;
  onChange: (type: SmartColumnComputationType) => void;
}

export function SmartColumnTypePicker({ value, onChange }: SmartColumnTypePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {OPTIONS.map((option) => (
        <button
          key={option.type}
          type="button"
          onClick={() => onChange(option.type)}
          className={cn(
            "flex flex-col items-start gap-3 rounded-[var(--radius-md)] border p-5 text-left transition-all duration-[120ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1",
            value === option.type
              ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/5 shadow-[var(--shadow-sm)]"
              : "border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
          )}
        >
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)]",
              value === option.type
                ? "bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]"
                : "bg-[var(--bg-muted)] text-[var(--text-secondary)]"
            )}
          >
            {option.icon}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {option.label}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {option.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
