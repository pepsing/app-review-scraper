import { NextResponse } from "next/server"
import { scrapeAllReviews } from "@/lib/scraper-service"

export async function POST(request: Request) {
  try {
    const { appConfig } = await request.json()

    if (!appConfig) {
      return NextResponse.json({ error: "App configuration is required" }, { status: 400 })
    }

    const reviews = await scrapeAllReviews(appConfig)

    // In a real application, you would store these reviews in a database

    return NextResponse.json({
      success: true,
      reviewsCount: reviews.length,
      message: `Successfully scraped ${reviews.length} reviews`,
    })
  } catch (error) {
    console.error("Error scraping reviews:", error)
    return NextResponse.json({ error: "Failed to scrape reviews" }, { status: 500 })
  }
}

