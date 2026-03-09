import type { ReactNode } from "react";

interface EmptyCTA {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface StateEmptyProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  cta?: EmptyCTA;
  secondaryAction?: ReactNode;
}

export function StateEmpty({ icon, title, description, cta, secondaryAction }: StateEmptyProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-16 text-center"
    >
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]">
          {icon}
        </span>
      )}

      <div className="max-w-md">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        {description && (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
        )}
      </div>

      {cta && (
        cta.href ? (
          <a
            href={cta.href}
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-[var(--text-inverse)] transition-colors duration-[120ms] ease-out hover:bg-[var(--color-brand-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1"
          >
            {cta.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={cta.onClick}
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-[var(--text-inverse)] transition-colors duration-[120ms] ease-out hover:bg-[var(--color-brand-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1"
          >
            {cta.label}
          </button>
        )
      )}

      {secondaryAction && <div>{secondaryAction}</div>}
    </div>
  );
}
