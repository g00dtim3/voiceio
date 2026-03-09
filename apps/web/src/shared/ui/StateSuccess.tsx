import type { ReactNode } from "react";

interface StateSuccessProps {
  children: ReactNode;
  sampleSize?: number;
  label?: string;
}

export function StateSuccess({ children, sampleSize, label = "Content loaded" }: StateSuccessProps) {
  return (
    <div role="region" aria-label={label} className="w-full space-y-3">
      {sampleSize !== undefined && <SampleSizeBadge n={sampleSize} />}
      {children}
    </div>
  );
}

interface SampleSizeBadgeProps {
  n: number;
}

export function SampleSizeBadge({ n }: SampleSizeBadgeProps) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
      <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-[var(--color-success-500)]" />
      <span>
        <span className="font-semibold text-[var(--text-primary)]">n={n.toLocaleString()}</span>
        {" "}responses analysed
      </span>
    </p>
  );
}
