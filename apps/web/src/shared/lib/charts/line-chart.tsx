"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart as ELineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  getBaseChartOptions,
  getTooltipStyle,
  getAxisLabelStyle,
  getGridLineStyle,
  CHART_PALETTE,
} from "./chart-config";

echarts.use([ELineChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface LineChartProps {
  labels: string[];
  data: number[];
  seriesName?: string;
  color?: string;
  height?: number;
}

export function LineChart({
  labels,
  data,
  seriesName = "Value",
  color = CHART_PALETTE[0],
  height = 300,
}: LineChartProps) {
  const option = {
    ...getBaseChartOptions(),
    tooltip: {
      trigger: "axis" as const,
      ...getTooltipStyle(),
    },
    grid: { top: 16, right: 16, bottom: 24, left: 32, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: labels,
      axisLabel: getAxisLabelStyle(),
    },
    yAxis: {
      type: "value" as const,
      axisLabel: getAxisLabelStyle(),
      splitLine: { lineStyle: getGridLineStyle() },
    },
    series: [
      {
        name: seriesName,
        type: "line" as const,
        smooth: true,
        data,
        symbolSize: 6,
        lineStyle: { width: 3, color },
        itemStyle: { color },
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
