"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState, useEffect, type ReactNode } from "react";
import { initMSW } from "@/shared/lib/msw-init";

export function Providers({ children }: { children: ReactNode }) {
  const [mswReady, setMswReady] = useState(
    process.env.NEXT_PUBLIC_MSW_ENABLED !== "true"
  );

  useEffect(() => {
    if (!mswReady) {
      initMSW().then(() => setMswReady(true));
    }
  }, [mswReady]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  if (!mswReady) return null;

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
