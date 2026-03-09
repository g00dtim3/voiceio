"use client";

import { StateLoading } from "@/shared/ui/StateLoading";
import { StateEmpty } from "@/shared/ui/StateEmpty";
import { StateError } from "@/shared/ui/StateError";
import { StateSuccess } from "@/shared/ui/StateSuccess";
import { MessageSquare } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--bg-app)] p-8">
      <header className="mb-10">
        <h1 className="text-[28px] font-semibold text-[var(--text-primary)]">Voicio</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          UI state showcase — all 4 global states
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <StateLabel name="Loading" />
          <StateLoading variant="list" rows={3} />
        </section>

        <section className="space-y-3">
          <StateLabel name="Loading (table)" />
          <StateLoading variant="table" rows={3} cols={3} />
        </section>

        <section className="space-y-3">
          <StateLabel name="Empty" />
          <StateEmpty
            icon={<MessageSquare size={24} />}
            title="No answers yet"
            description="Ask the insight agent a question to analyse your dataset."
            cta={{ label: "Ask a question", onClick: () => undefined }}
          />
        </section>

        <section className="space-y-3">
          <StateLabel name="Error" />
          <StateError
            code="NOT_FOUND"
            message="This report does not exist or you don't have access."
            onRetry={() => undefined}
          />
        </section>

        <section className="col-span-full space-y-3">
          <StateLabel name="Success (with n=)" />
          <StateSuccess sampleSize={120} label="Sample answer">
            <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                What are the main themes?
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                The main themes are <strong>product quality</strong> and{" "}
                <strong>shipping speed</strong>.
              </p>
            </div>
          </StateSuccess>
        </section>
      </div>
    </main>
  );
}

function StateLabel({ name }: { name: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
      {name}
    </h2>
  );
}
