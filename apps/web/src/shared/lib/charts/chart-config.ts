import type { EChartsOption } from "echarts";

export function getBaseChartOptions(): Partial<EChartsOption> {
  return {
    backgroundColor: "transparent",
    textStyle: {
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    },
  };
}

export function getTooltipStyle() {
  return {
    backgroundColor: "var(--bg-surface)",
    borderColor: "var(--border-default)",
    textStyle: { color: "var(--text-primary)", fontSize: 12 },
    extraCssText: "box-shadow: var(--shadow-md);",
  };
}

export function getAxisLabelStyle() {
  return { color: "var(--text-secondary)", fontSize: 12 };
}

export function getGridLineStyle() {
  return { color: "var(--border-default)" };
}

export const CHART_PALETTE = [
  "#3B82F6",
  "#8B5CF6",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#10B981",
  "#F43F5E",
  "#F59E0B",
];

export const SENTIMENT_COLORS = {
  positive: "#22C55E",
  neutral: "#FACC15",
  negative: "#EF4444",
} as const;
