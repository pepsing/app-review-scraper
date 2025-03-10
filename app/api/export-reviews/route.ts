import { NextResponse } from "next/server"
import type { Review } from "@/lib/types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reviewsParam = searchParams.get("reviews")

    if (!reviewsParam) {
      return NextResponse.json({ error: "No reviews provided" }, { status: 400 })
    }

    const reviews: Review[] = JSON.parse(decodeURIComponent(reviewsParam))

    // Create CSV content
    let csv = "ID,User,Rating,Date,Store,Region,Version,Review\n"

    reviews.forEach((review) => {
      // Escape quotes in the review text
      const escapedText = review.text.replace(/"/g, '""')

      csv += `${review.id},"${review.userName}",${review.rating},${review.date},${review.store},${review.region},${review.version},"${escapedText}"\n`
    })

    // Set headers for file download
    const headers = new Headers()
    headers.set("Content-Type", "text/csv")
    headers.set("Content-Disposition", `attachment; filename="filtered_reviews.csv"`)

    return new NextResponse(csv, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Error exporting reviews:", error)
    return NextResponse.json({ error: "Failed to export reviews" }, { status: 500 })
  }
}

