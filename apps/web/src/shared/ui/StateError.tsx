import { AlertCircle, RefreshCw } from "lucide-react";

interface StateErrorProps {
  code?: string;
  message?: string;
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
      className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-[var(--color-danger-500)]/30 bg-[var(--color-danger-500)]/5 px-6 py-12 text-center"
    >
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger-500)]/10 text-[var(--color-danger-500)]"
      >
        <AlertCircle size={24} />
      </span>

      <div className="max-w-sm space-y-1">
        <span className="inline-block rounded bg-[var(--color-danger-500)]/10 px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-danger-500)]">
          {code}
        </span>
        <p className="text-sm text-[var(--text-primary)]">{message}</p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-danger-500)] px-4 py-2 text-sm font-medium text-[var(--color-danger-500)] transition-colors duration-[120ms] ease-out hover:bg-[var(--color-danger-500)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger-500)] focus-visible:ring-offset-1"
        >
          <RefreshCw size={16} aria-hidden />
          Try again
        </button>
      )}
    </div>
  );
}
