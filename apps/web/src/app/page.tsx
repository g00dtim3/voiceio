/**
 * Homepage — UI state showcase
 *
 * Renders all 4 global UI states side-by-side so designers and reviewers
 * can validate tokens and component shapes without needing real data.
 *
 * "use client" because the showcase wires up onClick demo handlers.
 * Real pages that fetch data server-side use StateLoading/Empty/Error as RSC
 * and only promote to client where interactivity is needed.
 */
"use client";

import { StateLoading } from "@/components/ui/StateLoading";
import { StateEmpty } from "@/components/ui/StateEmpty";
import { StateError } from "@/components/ui/StateError";
import { StateSuccess } from "@/components/ui/StateSuccess";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--color-background)] p-8">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">VoiceIO</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          UI state showcase — all 4 global states
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── Loading ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <StateLabel name="Loading" color="var(--color-warning)" />
          <StateLoading variant="list" rows={3} />
        </section>

        {/* ── Loading (table) ──────────────────────────────────── */}
        <section className="space-y-3">
          <StateLabel name="Loading (table)" color="var(--color-warning)" />
          <StateLoading variant="table" rows={3} cols={3} />
        </section>

        {/* ── Empty ────────────────────────────────────────────── */}
        <section className="space-y-3">
          <StateLabel name="Empty" color="var(--color-text-secondary)" />
          <StateEmpty
            icon={<EmptyIcon />}
            title="No answers yet"
            description="Ask the insight agent a question to analyse your dataset."
            cta={{ label: "Ask a question", onClick: () => undefined }}
          />
        </section>

        {/* ── Error ────────────────────────────────────────────── */}
        <section className="space-y-3">
          <StateLabel name="Error" color="var(--color-error)" />
          <StateError
            code="NOT_FOUND"
            message="This report does not exist or you don't have access."
            onRetry={() => undefined}
          />
        </section>

        {/* ── Success ──────────────────────────────────────────── */}
        <section className="col-span-full space-y-3">
          <StateLabel name="Success (with n=)" color="var(--color-success)" />
          <StateSuccess sampleSize={120} label="Sample answer">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                What are the main themes?
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                The main themes are <strong>product quality</strong> and{" "}
                <strong>shipping speed</strong>. Positive mentions cluster around
                pricing and staff friendliness, while negative feedback focuses on
                billing issues and support responsiveness.
              </p>
              <div className="mt-4 flex gap-3">
                <Chip label="Product quality" sentiment="positive" />
                <Chip label="Shipping speed" sentiment="neutral" />
                <Chip label="Billing issues" sentiment="negative" />
              </div>
            </div>
          </StateSuccess>
        </section>
      </div>
    </main>
  );
}

// ─── Local helper components ──────────────────────────────────────────────────

function StateLabel({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
        {name}
      </h2>
    </div>
  );
}

type Sentiment = "positive" | "neutral" | "negative";

const sentimentStyles: Record<Sentiment, string> = {
  positive: "bg-[#22C55E]/10 text-[#22C55E]",
  neutral:  "bg-[#FACC15]/10 text-[#854D0E]",
  negative: "bg-[#EF4444]/10 text-[#EF4444]",
};

function Chip({ label, sentiment }: { label: string; sentiment: Sentiment }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sentimentStyles[sentiment]}`}>
      {label}
    </span>
  );
}

function EmptyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
