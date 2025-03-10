"use server"

import { revalidatePath } from "next/cache"
import type { App, Review } from "./types"
import { scrapeAppStoreReviews, scrapePlayStoreReviews } from "./scraper-service"
import * as db from "./db"

// 创建新应用
export async function createApp(appData: Omit<App, "id" | "rating" | "reviewCount" | "lastUpdated">) {
  const newApp: App = {
    id: Date.now().toString(),
    ...appData,
    rating: 0,
    reviewCount: 0,
    lastUpdated: new Date().toISOString(),
  }

  await db.createApp(newApp)

  revalidatePath("/")
  return newApp
}

// 更新应用
export async function updateApp(app: App) {
  await db.updateApp(app)
  revalidatePath("/")
  revalidatePath(`/apps/${app.id}`)
  return app
}

// 删除应用
export async function deleteApp(id: string) {
  await db.deleteApp(id)
  revalidatePath("/")
}

// 抓取应用评论
export async function scrapeAppReviews(appId: string) {
  const app = await db.getAppById(appId)
  if (!app) return

  const reviews: Review[] = []

  if (app.appStoreId) {
    const appStoreReviews = await scrapeAppStoreReviews(app.appStoreId, app.appStoreRegions)
    reviews.push(...appStoreReviews)
  }

  if (app.playStoreId) {
    const playStoreReviews = await scrapePlayStoreReviews(app.playStoreId, app.playStoreRegions)
    reviews.push(...playStoreReviews)
  }

  if (reviews.length > 0) {
    await db.addReviews(appId, reviews)
  }

  revalidatePath(`/apps/${appId}`)
  return reviews
}

