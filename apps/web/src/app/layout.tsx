import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceIO — Qualitative Analytics",
  description: "AI-first qualitative analytics platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/*
       * Add class="dark" to <html> to activate dark-mode tokens.
       * Wire this to a ThemeProvider / localStorage in a follow-up step.
       */}
      <body>{children}</body>
    </html>
  );
}
