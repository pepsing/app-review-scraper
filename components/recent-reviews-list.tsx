import { Star } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Review } from "@/lib/types"

interface RecentReviewsListProps {
  reviews: Review[]
}

export function RecentReviewsList({ reviews }: RecentReviewsListProps) {
  return (
    <div className="space-y-4">
      {reviews.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">No reviews found</p>
      ) : (
        reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarImage src={`/placeholder.svg?height=40&width=40&text=${review.userName.charAt(0)}`} />
                  <AvatarFallback>{review.userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">{review.userName}</div>
                    <div className="flex items-center">
                      <Badge variant={review.store === "app-store" ? "default" : "secondary"} className="mr-2">
                        {review.store === "app-store" ? "App Store" : "Play Store"}
                      </Badge>
                      <Badge variant="outline">{review.region}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center mb-1">
                    <div className="flex mr-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground">{new Date(review.date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">{review.appName}</div>
                  <p className="text-sm">{review.text}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

