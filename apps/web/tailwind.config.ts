import type { Config } from "tailwindcss";

// Brand token palette — single source of truth (mirrors 07_UX_UI/TOKENS.md)
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",

  theme: {
    extend: {
      colors: {
        // ── Primary ──────────────────────────────────────────────
        primary: {
          DEFAULT: "#2563EB",
          hover:   "#1E4ED8",
        },

        // ── Semantic ─────────────────────────────────────────────
        success: "#10B981",
        warning: "#F59E0B",
        error:   "#EF4444",

        // ── Surface ──────────────────────────────────────────────
        background: "#F8FAFC",
        card:       "#FFFFFF",
        border:     "#E5E7EB",

        // ── Text ─────────────────────────────────────────────────
        text: {
          DEFAULT:   "#111827",
          secondary: "#6B7280",
        },

        // ── Sentiment ────────────────────────────────────────────
        sentiment: {
          positive: "#22C55E",
          neutral:  "#FACC15",
          negative: "#EF4444",
        },
      },

      // CSS-variable-driven tokens (enables runtime dark-mode switching)
      backgroundColor: {
        page: "var(--color-background)",
        card: "var(--color-card)",
      },
      textColor: {
        base:      "var(--color-text)",
        secondary: "var(--color-text-secondary)",
      },
      borderColor: {
        base: "var(--color-border)",
      },

      // Skeleton animation
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },

  plugins: [],
};

export default config;
