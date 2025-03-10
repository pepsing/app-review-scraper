"use client"

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { RatingHistory } from "@/lib/types"

interface RatingChartProps {
  data: RatingHistory[]
}

export function RatingChart({ data }: RatingChartProps) {
  return (
    <ChartContainer
      config={{
        appStore: {
          label: "App Store",
          color: "hsl(var(--chart-1))",
        },
        playStore: {
          label: "Play Store",
          color: "hsl(var(--chart-2))",
        },
      }}
      className="h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 10,
            left: 10,
            bottom: 0,
          }}
        >
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              const date = new Date(value)
              return `${date.toLocaleString("default", { month: "short" })}`
            }}
            tickMargin={10}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
            domain={[3.5, 5]}
            tickMargin={10}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="appStore"
            strokeWidth={2}
            activeDot={{
              r: 6,
              style: { fill: "var(--color-appStore)", opacity: 0.8 },
            }}
            style={{
              stroke: "var(--color-appStore)",
            }}
          />
          <Line
            type="monotone"
            dataKey="playStore"
            strokeWidth={2}
            activeDot={{
              r: 6,
              style: { fill: "var(--color-playStore)", opacity: 0.8 },
            }}
            style={{
              stroke: "var(--color-playStore)",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

