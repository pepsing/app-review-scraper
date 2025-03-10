import { ArrowDown, ArrowUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AppStatsCardProps {
  title: string
  value: string
  description: string
  trend: string
  trendUp: boolean
}

export function AppStatsCard({ title, value, description, trend, trendUp }: AppStatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {trendUp ? <ArrowUp className="h-4 w-4 text-green-500" /> : <ArrowDown className="h-4 w-4 text-red-500" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        <p className={`text-xs mt-1 ${trendUp ? "text-green-500" : "text-red-500"}`}>{trend}</p>
      </CardContent>
    </Card>
  )
}

