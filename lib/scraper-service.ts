import type { Review } from "./types"

// 使用 dynamic import 替代直接 import
let appStore: any = null
let gplay: any = null

// 异步初始化函数
async function initScrapers() {
  if (!appStore) {
    try {
      // 动态导入 app-store-scraper
      appStore = await import("app-store-scraper")
    } catch (error) {
      console.error("Failed to import app-store-scraper:", error)
      appStore = null
    }
  }

  if (!gplay) {
    try {
      // 动态导入 google-play-scraper
      gplay = await import("google-play-scraper")
    } catch (error) {
      console.error("Failed to import google-play-scraper:", error)
      gplay = null
    }
  }

  return { appStore, gplay }
}

// 修改 scrapeAppStoreReviews 函数
export async function scrapeAppStoreReviews(appId: string, regions: string[]): Promise<Review[]> {
  console.log(`Scraping App Store reviews for app ${appId} in regions ${regions.join(', ')}`)

  try {
    // 确保 scrapers 已初始化
    const { appStore } = await initScrapers()

    if (!appStore) {
      throw new Error("app-store-scraper not initialized")
    }

    // 使用 app-store-scraper 获取评论
    const appStoreReviews: Review[] = []
    for (const region of regions) {
      const reviews = await appStore.reviews({
        id: appId,
        country: region,
        page: 1, // 第一页评论
        sort: appStore.sort.RECENT, // 按最新排序
      })
      appStoreReviews.push(...reviews.map((review: any) => ({
        id: `as-${review.id}`,
        appId,
        appName: "", // 这将由调用者填充
        userName: review.userName || "Anonymous",
        rating: review.score,
        text: review.text || "",
        date: review.date || new Date().toISOString(),
        store: "app-store",
        region,
        version: review.version || "Unknown",
      })))
    }

    return appStoreReviews
  } catch (error) {
    console.error(`Error scraping App Store reviews: ${error}`)
    return []
  }
}

// 修改 scrapePlayStoreReviews 函数
export async function scrapePlayStoreReviews(appId: string, regions: string[]): Promise<Review[]> {
  console.log(`Scraping Play Store reviews for app ${appId} in regions ${regions.join(', ')}`)

  try {
    // 确保 scrapers 已初始化
    const { gplay } = await initScrapers()

    if (!gplay) {
      throw new Error("google-play-scraper not initialized")
    }

    // 使用 google-play-scraper 获取评论
    const playStoreReviews: Review[] = []
    for (const region of regions) {
      const reviews = await gplay.reviews({
        appId: appId,
        lang: region.toLowerCase(), // 语言代码通常是小写的
        sort: gplay.sort.NEWEST,
        num: 100, // 获取最多100条评论
      })
      playStoreReviews.push(...reviews.data.map((review: any) => ({
        id: `ps-${review.id}`,
        appId,
        appName: "", // 这将由调用者填充
        userName: review.userName || "Anonymous",
        rating: review.score,
        text: review.text || "",
        date: review.date ? new Date(review.date).toISOString() : new Date().toISOString(),
        store: "play-store",
        region,
        version: review.version || "Unknown",
      })))
    }

    return playStoreReviews
  } catch (error) {
    console.error(`Error scraping Play Store reviews: ${error}`)
    return []
  }
}

// 抓取所有评论
export async function scrapeAllReviews(appConfig: any): Promise<Review[]> {
  let allReviews: Review[] = []

  if (appConfig.appStoreId) {
    for (const region of appConfig.appStoreRegions) {
      const appStoreReviews = await scrapeAppStoreReviews(appConfig.appStoreId, [region])
      allReviews = allReviews.concat(appStoreReviews)
    }
  }

  if (appConfig.playStoreId) {
    for (const region of appConfig.playStoreRegions) {
      const playStoreReviews = await scrapePlayStoreReviews(appConfig.playStoreId, [region])
      allReviews = allReviews.concat(playStoreReviews)
    }
  }

  return allReviews
}

