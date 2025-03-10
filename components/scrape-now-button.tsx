"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { scrapeAppReviews } from "@/lib/actions"

interface ScrapeNowButtonProps {
  appId: string
}

export function ScrapeNowButton({ appId }: ScrapeNowButtonProps) {
  const router = useRouter()
  const [isScraping, setIsScraping] = useState(false)

  const handleScrape = async () => {
    try {
      setIsScraping(true)
      const result = await scrapeAppReviews(appId)
      toast({
        title: "Success",
        description: `Scraped ${result.reviewsCount} new reviews`,
      })
      router.refresh()
    } catch (error) {
      console.error("Error scraping reviews:", error)
      toast({
        title: "Error",
        description: "Failed to scrape reviews",
        variant: "destructive",
      })
    } finally {
      setIsScraping(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleScrape} disabled={isScraping}>
      <RefreshCw className={`mr-2 h-4 w-4 ${isScraping ? "animate-spin" : ""}`} />
      {isScraping ? "Scraping..." : "Scrape Now"}
    </Button>
  )
}

