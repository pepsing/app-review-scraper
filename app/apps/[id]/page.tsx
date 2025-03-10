import Link from "next/link"
import { ArrowLeft, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReviewsTable } from "@/components/reviews-table"
import { RatingChart } from "@/components/rating-chart"
import { RegionDistribution } from "@/components/region-distribution"
import { getAppById, getAppReviews, getAppRatingHistory, getAppRegionDistribution } from "@/lib/data-service"
import { DeleteAppButton } from "@/components/delete-app-button"
import { ScrapeNowButton } from "@/components/scrape-now-button"

export default async function AppDetailsPage({ params }: { params: { id: string } }) {
  const app = await getAppById(params.id)

  if (!app) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Link href="/" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">App Not Found</h1>
        </div>
        <p>The requested app could not be found.</p>
      </div>
    )
  }

  const reviews = await getAppReviews(params.id)
  const ratingHistory = await getAppRatingHistory(params.id)
  const regionDistribution = await getAppRegionDistribution(params.id)

  const appStoreReviews = reviews.filter((review) => review.store === "app-store")
  const playStoreReviews = reviews.filter((review) => review.store === "play-store")

  const appStoreRating =
    appStoreReviews.length > 0
      ? appStoreReviews.reduce((sum, review) => sum + review.rating, 0) / appStoreReviews.length
      : 0

  const playStoreRating =
    playStoreReviews.length > 0
      ? playStoreReviews.reduce((sum, review) => sum + review.rating, 0) / playStoreReviews.length
      : 0

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Link href="/" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center">
          <img
            src={app.icon || "/placeholder.svg?height=60&width=60"}
            alt={`${app.name} icon`}
            className="w-12 h-12 rounded-xl mr-4"
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
            <p className="text-muted-foreground">Last updated: {new Date(app.lastUpdated).toLocaleString()}</p>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <ScrapeNowButton appId={app.id} />
          <Button variant="outline" asChild>
            <Link href={`/api/export/${app.id}`}>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Link>
          </Button>
          <DeleteAppButton appId={app.id} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{app.rating.toFixed(1)} ★</div>
            <p className="text-xs text-muted-foreground">Based on {app.reviewCount} reviews</p>
          </CardContent>
        </Card>
        {app.appStoreId && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">App Store Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{appStoreRating.toFixed(1)} ★</div>
              <p className="text-xs text-muted-foreground">Based on {appStoreReviews.length} reviews</p>
            </CardContent>
          </Card>
        )}
        {app.playStoreId && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Play Store Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{playStoreRating.toFixed(1)} ★</div>
              <p className="text-xs text-muted-foreground">Based on {playStoreReviews.length} reviews</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Rating Trend</CardTitle>
            <CardDescription>Average rating over time</CardDescription>
          </CardHeader>
          <CardContent>
            <RatingChart data={ratingHistory} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Region Distribution</CardTitle>
            <CardDescription>Reviews by region</CardDescription>
          </CardHeader>
          <CardContent>
            <RegionDistribution data={regionDistribution} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
          <CardDescription>All reviews for {app.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Reviews</TabsTrigger>
              {app.appStoreId && <TabsTrigger value="app-store">App Store</TabsTrigger>}
              {app.playStoreId && <TabsTrigger value="play-store">Play Store</TabsTrigger>}
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <ReviewsTable reviews={reviews} />
            </TabsContent>
            {app.appStoreId && (
              <TabsContent value="app-store" className="mt-4">
                <ReviewsTable reviews={appStoreReviews} />
              </TabsContent>
            )}
            {app.playStoreId && (
              <TabsContent value="play-store" className="mt-4">
                <ReviewsTable reviews={playStoreReviews} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

