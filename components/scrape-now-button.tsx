"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { scrapeAppReviews } from "@/lib/actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ScrapeNowButtonProps {
  appId: string
}

export function ScrapeNowButton({ appId }: ScrapeNowButtonProps) {
  const router = useRouter()
  const [isScraping, setIsScraping] = useState(false)
  const [fullScrape, setFullScrape] = useState(false)

  const handleScrape = async () => {
    try {
      setIsScraping(true)
      toast({
        title: fullScrape ? "Full Scrape Started" : "Scrape Started",
        description: fullScrape ? "Scraping all reviews, this may take a while..." : "Scraping latest reviews...",
      })
      const result = await scrapeAppReviews(appId, fullScrape)
      toast({
        title: "Success",
        description: `Scraped ${result?.reviewsCount ?? 0} ${fullScrape ? "total" : "new"} reviews`,
      })
      router.refresh()
    } catch (error) {
      console.error("Error scraping reviews:", error)
      toast({
        title: "Error",
        description: "Failed to scrape reviews. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsScraping(false)
    }
  }

  return (
    <div className="flex flex-row items-center gap-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="fullScrape" 
                checked={fullScrape} 
                onCheckedChange={(checked) => setFullScrape(checked as boolean)}
                disabled={isScraping}
                className="data-[state=checked]:bg-primary"
              />
              <Label htmlFor="fullScrape" className="text-sm font-medium cursor-pointer">
                Full Scrape
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>App Store: up to 3000 reviews<br />Play Store: up to 6000 reviews</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button variant="outline" onClick={handleScrape} disabled={isScraping}>
        <RefreshCw className={`mr-2 h-4 w-4 ${isScraping ? "animate-spin" : ""}`} />
        {isScraping ? (fullScrape ? "Full Scraping..." : "Scraping...") : (fullScrape ? "Full Scrape" : "Scrape Now")}
      </Button>
    </div>
  )
}

