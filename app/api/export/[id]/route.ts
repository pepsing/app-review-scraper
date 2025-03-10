import { NextResponse } from "next/server"
import { getAppById, getAppReviews } from "@/lib/data-service"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const appId = params.id
    const app = await getAppById(appId)

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 })
    }

    const reviews = await getAppReviews(appId)

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
    headers.set("Content-Disposition", `attachment; filename="${app.name.replace(/\s+/g, "_")}_reviews.csv"`)

    return new NextResponse(csv, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Error exporting reviews:", error)
    return NextResponse.json({ error: "Failed to export reviews" }, { status: 500 })
  }
}

