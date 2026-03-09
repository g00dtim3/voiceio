"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  getBaseChartOptions,
  getTooltipStyle,
  getAxisLabelStyle,
  getGridLineStyle,
  SENTIMENT_COLORS,
} from "./chart-config";

echarts.use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

interface StackedSentimentBarProps {
  categories: string[];
  positive: number[];
  neutral: number[];
  negative: number[];
  height?: number;
}

export function StackedSentimentBar({
  categories,
  positive,
  neutral,
  negative,
  height = 300,
}: StackedSentimentBarProps) {
  const option = {
    ...getBaseChartOptions(),
    tooltip: {
      trigger: "axis" as const,
      axisPointer: { type: "shadow" as const },
      ...getTooltipStyle(),
    },
    legend: {
      top: 0,
      textStyle: getAxisLabelStyle(),
    },
    grid: { top: 40, right: 16, bottom: 16, left: 48, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: categories,
      axisLabel: getAxisLabelStyle(),
    },
    yAxis: {
      type: "value" as const,
      axisLabel: getAxisLabelStyle(),
      splitLine: { lineStyle: getGridLineStyle() },
    },
    series: [
      {
        name: "Positive",
        type: "bar" as const,
        stack: "sentiment",
        data: positive,
        itemStyle: { color: SENTIMENT_COLORS.positive },
      },
      {
        name: "Neutral",
        type: "bar" as const,
        stack: "sentiment",
        data: neutral,
        itemStyle: { color: SENTIMENT_COLORS.neutral },
      },
      {
        name: "Negative",
        type: "bar" as const,
        stack: "sentiment",
        data: negative,
        itemStyle: { color: SENTIMENT_COLORS.negative },
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
