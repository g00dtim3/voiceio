import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] p-4">
      <div className="w-full max-w-[420px] rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-md)]">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[var(--color-brand-500)]">Voicio</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
