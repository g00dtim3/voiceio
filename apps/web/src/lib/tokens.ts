/**
 * Brand tokens — JS/TS mirror of 07_UX_UI/TOKENS.md and globals.css.
 *
 * Use these constants when you need token values in non-CSS contexts
 * (e.g. canvas charts, SVG gradients, dynamic inline styles).
 * Prefer Tailwind classes or CSS custom properties for everything else.
 */

export const tokens = {
  color: {
    // Primary
    primary:      "#2563EB",
    primaryHover: "#1E4ED8",

    // Semantic
    success: "#10B981",
    warning: "#F59E0B",
    error:   "#EF4444",

    // Surface
    background: "#F8FAFC",
    card:       "#FFFFFF",
    border:     "#E5E7EB",

    // Text
    text:          "#111827",
    textSecondary: "#6B7280",

    // Sentiment
    sentiment: {
      positive: "#22C55E",
      neutral:  "#FACC15",
      negative: "#EF4444",
    },
  },
} as const;

export type Tokens = typeof tokens;
