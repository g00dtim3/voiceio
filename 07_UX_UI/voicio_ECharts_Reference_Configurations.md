
# — ECharts Reference Configurations
Version: 1.0
Purpose: Give frontend engineers concrete chart option examples aligned with the observed product UI.

---

# 1. Horizontal bar chart

Use case:
- Insight Agent
- Topic sentiment comparisons
- Most mentioned topics

```ts
export const horizontalBarOptions = {
  backgroundColor: "transparent",
  grid: { top: 8, right: 16, bottom: 8, left: 120, containLabel: true },
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    backgroundColor: "var(--bg-surface)",
    borderColor: "var(--border-default)",
    textStyle: { color: "var(--text-primary)" }
  },
  xAxis: {
    type: "value",
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: "var(--border-default)" } },
    axisLabel: { color: "var(--text-secondary)" }
  },
  yAxis: {
    type: "category",
    data: ["Customer support", "Pricing", "App stability"],
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "var(--text-primary)" }
  },
  series: [
    {
      type: "bar",
      data: [87, 64, 42],
      barWidth: 18,
      itemStyle: {
        color: "#3B82F6",
        borderRadius: [0, 6, 6, 0]
      }
    }
  ]
};
```

---

# 2. Stacked sentiment bar chart

Use case:
- topic sentiment breakdown
- report overview by category

```ts
export const stackedSentimentBarOptions = {
  backgroundColor: "transparent",
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" }
  },
  legend: {
    top: 0,
    textStyle: { color: "var(--text-secondary)" }
  },
  grid: { top: 40, right: 16, bottom: 16, left: 48, containLabel: true },
  xAxis: {
    type: "category",
    data: ["Battery life", "Support", "Pricing"],
    axisLabel: { color: "var(--text-secondary)" }
  },
  yAxis: {
    type: "value",
    axisLabel: { color: "var(--text-secondary)" },
    splitLine: { lineStyle: { color: "var(--border-default)" } }
  },
  series: [
    { name: "Positive", type: "bar", stack: "sentiment", data: [42, 12, 8], itemStyle: { color: "#22C55E" } },
    { name: "Neutral", type: "bar", stack: "sentiment", data: [10, 7, 5], itemStyle: { color: "#FACC15" } },
    { name: "Negative", type: "bar", stack: "sentiment", data: [5, 31, 44], itemStyle: { color: "#EF4444" } }
  ]
};
```

---

# 3. Radar chart

Use case:
- AI Quality Score

```ts
export const radarScoreOptions = {
  radar: {
    indicator: [
      { name: "Coverage", max: 100 },
      { name: "Consistency", max: 100 },
      { name: "Specificity", max: 100 },
      { name: "Balance", max: 100 }
    ],
    splitLine: { lineStyle: { color: "var(--border-default)" } },
    splitArea: { areaStyle: { color: ["transparent"] } },
    axisName: { color: "var(--text-secondary)" }
  },
  series: [
    {
      type: "radar",
      data: [
        {
          value: [81, 88, 79, 84],
          areaStyle: { color: "rgba(59, 130, 246, 0.18)" },
          lineStyle: { color: "#3B82F6" },
          itemStyle: { color: "#3B82F6" }
        }
      ]
    }
  ]
};
```

---

# 4. Line chart

Use case:
- NPS over time

```ts
export const npsOverTimeOptions = {
  backgroundColor: "transparent",
  tooltip: { trigger: "axis" },
  grid: { top: 16, right: 16, bottom: 24, left: 32, containLabel: true },
  xAxis: {
    type: "category",
    data: ["Jan", "Feb", "Mar", "Apr", "May"],
    axisLabel: { color: "var(--text-secondary)" }
  },
  yAxis: {
    type: "value",
    axisLabel: { color: "var(--text-secondary)" },
    splitLine: { lineStyle: { color: "var(--border-default)" } }
  },
  series: [
    {
      name: "NPS",
      type: "line",
      smooth: true,
      data: [21, 24, 19, 27, 31],
      symbolSize: 6,
      lineStyle: { width: 3, color: "#3B82F6" },
      itemStyle: { color: "#3B82F6" }
    }
  ]
};
```

---

# 5. Integration rules
- all charts render inside `ChartFrame`
- theme-sensitive values should be derived from tokens
- chart config builders should live in `shared/lib/charts` or feature-local chart builders
- do not embed raw option objects directly in page components
