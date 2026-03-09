"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  getBaseChartOptions,
  getTooltipStyle,
  getAxisLabelStyle,
  getGridLineStyle,
  CHART_PALETTE,
} from "./chart-config";

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface HorizontalBarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export function HorizontalBarChart({
  data,
  color = CHART_PALETTE[0],
  height = 300,
}: HorizontalBarChartProps) {
  const option = {
    ...getBaseChartOptions(),
    grid: { top: 8, right: 16, bottom: 8, left: 120, containLabel: true },
    tooltip: {
      trigger: "axis" as const,
      axisPointer: { type: "shadow" as const },
      ...getTooltipStyle(),
    },
    xAxis: {
      type: "value" as const,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: getGridLineStyle() },
      axisLabel: getAxisLabelStyle(),
    },
    yAxis: {
      type: "category" as const,
      data: data.map((d) => d.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...getAxisLabelStyle(), color: "var(--text-primary)" },
    },
    series: [
      {
        type: "bar" as const,
        data: data.map((d) => d.value),
        barWidth: 18,
        itemStyle: {
          color,
          borderRadius: [0, 6, 6, 0],
        },
      },
    ],
  };

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ height }}
      notMerge
      lazyUpdate
    />
  );
}
