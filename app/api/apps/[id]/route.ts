import { NextResponse } from "next/server"
import { getAppById } from "@/lib/data-service"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const app = await getAppById(id)

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 })
    }

    return NextResponse.json(app)
  } catch (error) {
    console.error("Error fetching app:", error)
    return NextResponse.json({ error: "Failed to fetch app" }, { status: 500 })
  }
}