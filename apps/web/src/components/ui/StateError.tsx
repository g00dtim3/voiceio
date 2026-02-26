/**
 * StateError — Global error state (00_UI_STATES.md)
 *
 * Rules:
 *  - Show error code + human-readable message
 *  - Retry button that re-fires the failed operation
 *
 * Usage:
 *   <StateError
 *     code="NOT_FOUND"
 *     message="This report does not exist."
 *     onRetry={() => router.refresh()}
 *   />
 *
 *   // From an API error envelope { error: { code, message } }:
 *   <StateError code={error.code} message={error.message} onRetry={refetch} />
 */

interface StateErrorProps {
  /** Machine-readable error code (e.g. "NOT_FOUND", "INTERNAL_ERROR") */
  code?: string;
  /** Human-readable explanation */
  message?: string;
  /** Called when user clicks "Try again" */
  onRetry?: () => void;
}

export function StateError({
  code = "ERROR",
  message = "Something went wrong. Please try again.",
  onRetry,
}: StateErrorProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-6 py-12 text-center"
    >
      {/* Error icon */}
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)]"
      >
        <ErrorIcon />
      </span>

      <div className="max-w-sm space-y-1">
        {/* Code badge */}
        <span className="inline-block rounded bg-[var(--color-error)]/10 px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-error)]">
          {code}
        </span>
        <p className="text-sm text-[var(--color-text)]">{message}</p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--color-error)] px-4 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error)]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)] focus-visible:ring-offset-2 transition-colors"
        >
          <RetryIcon aria-hidden />
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Inline SVG icons (no external dependency) ───────────────────────────────

function ErrorIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12a8 8 0 0 1 13.66-5.66L21 10m-17 4 3.34 3.66A8 8 0 0 0 20 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
