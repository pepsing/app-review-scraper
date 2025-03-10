import Link from "next/link"
import { PlusCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AppStatsCard } from "@/components/app-stats-card"
import { RecentReviewsList } from "@/components/recent-reviews-list"
import { getApps, getRecentReviews, getStats } from "@/lib/data-service"

export default async function Dashboard() {
  const apps = await getApps()
  const stats = await getStats()
  const recentReviews = await getRecentReviews()

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">App Review Dashboard</h1>
          <p className="text-muted-foreground">Monitor and analyze reviews from App Store and Google Play Store</p>
        </div>
        <Link href="/apps/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New App
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <AppStatsCard
          title="Total Apps"
          value={stats.totalApps.toString()}
          description="Apps being monitored"
          trend={stats.appsTrend}
          trendUp={stats.appsTrendUp}
        />
        <AppStatsCard
          title="Total Reviews"
          value={stats.totalReviews.toString()}
          description="Across all apps"
          trend={stats.reviewsTrend}
          trendUp={stats.reviewsTrendUp}
        />
        <AppStatsCard
          title="Average Rating"
          value={stats.averageRating.toFixed(1)}
          description="Across all apps"
          trend={stats.ratingTrend}
          trendUp={stats.ratingTrendUp}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {apps.map((app) => (
          <Card key={app.id}>
            <CardHeader className="flex flex-row items-center gap-4">
              <img
                src={app.icon || "/placeholder.svg?height=60&width=60"}
                alt={`${app.name} icon`}
                className="w-12 h-12 rounded-xl"
              />
              <div>
                <CardTitle>{app.name}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  {app.appStoreId && (
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      App Store
                    </span>
                  )}
                  {app.playStoreId && (
                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                      Play Store
                    </span>
                  )}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Rating</span>
                <span className="font-medium">{app.rating.toFixed(1)} ★</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Reviews</span>
                <span className="font-medium">{app.reviewCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Regions</span>
                <span className="font-medium">
                  {[...(app.appStoreRegions || []), ...(app.playStoreRegions || [])].slice(0, 3).join(", ")}
                  {[...(app.appStoreRegions || []), ...(app.playStoreRegions || [])].length > 3 && "..."}
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Link href={`/apps/${app.id}`} className="w-full">
                <Button variant="outline" className="w-full">
                  View Details
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Recent Reviews</h2>
        <RecentReviewsList reviews={recentReviews} />
      </div>
    </div>
  )
}

