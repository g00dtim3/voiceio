"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { RadarChart as ERadarChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { getBaseChartOptions, getGridLineStyle, getAxisLabelStyle, CHART_PALETTE } from "./chart-config";

echarts.use([ERadarChart, TooltipComponent, CanvasRenderer]);

interface RadarChartProps {
  indicators: { name: string; max: number }[];
  values: number[];
  color?: string;
  height?: number;
}

export function RadarChart({
  indicators,
  values,
  color = CHART_PALETTE[0],
  height = 300,
}: RadarChartProps) {
  const option = {
    ...getBaseChartOptions(),
    radar: {
      indicator: indicators,
      splitLine: { lineStyle: getGridLineStyle() },
      splitArea: { areaStyle: { color: ["transparent"] } },
      axisName: getAxisLabelStyle(),
    },
    series: [
      {
        type: "radar" as const,
        data: [
          {
            value: values,
            areaStyle: { color: `${color}2E` },
            lineStyle: { color },
            itemStyle: { color },
          },
        ],
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
