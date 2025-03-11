"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eraser } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { clearAppReviews } from "@/lib/actions"

interface ClearReviewsButtonProps {
  appId: string
}

export function ClearReviewsButton({ appId }: ClearReviewsButtonProps) {
  const router = useRouter()
  const [isClearing, setIsClearing] = useState(false)
  const [open, setOpen] = useState(false)

  const handleClear = async () => {
    try {
      setIsClearing(true)
      await clearAppReviews(appId)
      toast({
        title: "Success",
        description: "All reviews have been cleared",
      })
      router.refresh()
    } catch (error) {
      console.error("Error clearing reviews:", error)
      toast({
        title: "Error",
        description: "Failed to clear reviews",
        variant: "destructive",
      })
    } finally {
      setIsClearing(false)
      setOpen(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eraser className="mr-2 h-4 w-4" />
          Clear Reviews
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to clear all reviews?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete all reviews for this app.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClear}
            disabled={isClearing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isClearing ? "Clearing..." : "Clear"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}