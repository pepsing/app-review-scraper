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

// 删除应用
export async function deleteApp(appId: string) {
  await db.deleteApp(appId)

  revalidatePath("/")
  return { success: true }
}

// 抓取应用评论
export async function scrapeAppReviews(appId: string) {
  const app = await db.getAppById(appId)

  if (!app) {
    throw new Error("App not found")
  }

  const newReviews: Review[] = []

  // 抓取 App Store 评论
  if (app.appStoreId) {
    for (const region of app.appStoreRegions) {
      const appStoreReviews = await scrapeAppStoreReviews(app.appStoreId, region)

      // 转换为我们的 Review 格式并添加应用详情
      const formattedReviews = appStoreReviews.map((review) => ({
        ...review,
        appId,
        appName: app.name,
      }))

      newReviews.push(...formattedReviews)
    }
  }

  // 抓取 Play Store 评论
  if (app.playStoreId) {
    for (const region of app.playStoreRegions) {
      const playStoreReviews = await scrapePlayStoreReviews(app.playStoreId, region)

      // 转换为我们的 Review 格式并添加应用详情
      const formattedReviews = playStoreReviews.map((review) => ({
        ...review,
        appId,
        appName: app.name,
      }))

      newReviews.push(...formattedReviews)
    }
  }

  // 保存新评论
  await db.addReviews(appId, newReviews)

  revalidatePath(`/apps/${appId}`)
  return { success: true, reviewsCount: newReviews.length }
}

