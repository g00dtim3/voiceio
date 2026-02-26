/**
 * StateEmpty — Global empty state (00_UI_STATES.md)
 *
 * Rules:
 *  - Short explanation of why the list is empty
 *  - Primary CTA (e.g., "Start analysis", "Clear filters", "Create smart column")
 *
 * Usage:
 *   <StateEmpty
 *     icon={<BarChartIcon />}
 *     title="No answers yet"
 *     description="Ask the insight agent a question to get started."
 *     cta={{ label: "Ask a question", onClick: () => setOpen(true) }}
 *   />
 */

import type { ReactNode } from "react";

interface EmptyCTA {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface StateEmptyProps {
  /** Optional icon / illustration */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Primary call-to-action */
  cta?: EmptyCTA;
}

export function StateEmpty({ icon, title, description, cta }: StateEmptyProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-6 py-16 text-center"
    >
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-background)] text-[var(--color-text-secondary)]">
          {icon}
        </span>
      )}

      <div className="max-w-xs space-y-1">
        <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
        {description && (
          <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
        )}
      </div>

      {cta && (
        cta.href ? (
          <a
            href={cta.href}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 transition-colors"
          >
            {cta.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={cta.onClick}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 transition-colors"
          >
            {cta.label}
          </button>
        )
      )}
    </div>
  );
}
