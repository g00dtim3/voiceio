type LoadingVariant = "list" | "table" | "card" | "page" | "section" | "inline";

interface StateLoadingProps {
  variant?: LoadingVariant;
  rows?: number;
  cols?: number;
  label?: string;
}

export function StateLoading({
  variant = "list",
  rows = 4,
  cols = 3,
  label = "Loading…",
}: StateLoadingProps) {
  return (
    <div role="status" aria-label={label} aria-live="polite" className="w-full">
      {variant === "list" && <ListSkeleton rows={rows} />}
      {variant === "table" && <TableSkeleton rows={rows} cols={cols} />}
      {variant === "card" && <CardSkeleton />}
      {variant === "page" && <PageSkeleton />}
      {variant === "section" && <SectionSkeleton />}
      {variant === "inline" && <InlineSkeleton />}
      <span className="sr-only">{label}</span>
    </div>
  );
}

function SkeletonBar({ width = "w-full", height = "h-4" }: { width?: string; height?: string }) {
  return <span className={`skeleton block ${width} ${height}`} />;
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <ul className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <SkeletonBar width="w-8" height="h-8" />
          <div className="flex-1 space-y-2">
            <SkeletonBar width="w-2/5" height="h-4" />
            <SkeletonBar width="w-3/5" height="h-3" />
          </div>
          <SkeletonBar width="w-16" height="h-8" />
        </li>
      ))}
    </ul>
  );
}

function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)]" aria-hidden>
      <div
        className="grid gap-4 border-b border-[var(--border-default)] bg-[var(--bg-surface-subtle)] px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }).map((_, c) => (
          <SkeletonBar key={c} width="w-3/4" height="h-3" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-4 last:border-0"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBar key={c} width={c === 0 ? "w-full" : "w-4/5"} height="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-4" aria-hidden>
      <SkeletonBar width="w-1/3" height="h-5" />
      <SkeletonBar width="w-full" height="h-4" />
      <SkeletonBar width="w-5/6" height="h-4" />
      <SkeletonBar width="w-2/3" height="h-4" />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6" aria-hidden>
      <SkeletonBar width="w-1/4" height="h-7" />
      <div className="grid grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton rows={5} cols={4} />
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <SkeletonBar width="w-1/4" height="h-5" />
      <SkeletonBar width="w-full" height="h-4" />
      <SkeletonBar width="w-3/4" height="h-4" />
    </div>
  );
}

function InlineSkeleton() {
  return <SkeletonBar width="w-20" height="h-4" />;
}
