import { kv } from "@vercel/kv"
import type { App, Review, Stats, RatingHistory, RegionData } from "./types"

// 应用相关操作
export async function saveApp(app: App): Promise<void> {
  await kv.hset("apps", { [app.id]: JSON.stringify(app) })
}

export async function getApp(id: string): Promise<App | null> {
  const appStr = (await kv.hget("apps", id)) as string | null
  return appStr ? JSON.parse(appStr) : null
}

export async function getAllApps(): Promise<App[]> {
  const appsMap = (await kv.hgetall("apps")) as Record<string, string>
  return Object.values(appsMap || {}).map((appStr) => JSON.parse(appStr))
}

export async function deleteApp(id: string): Promise<void> {
  await kv.hdel("apps", id)
  // 同时删除该应用的所有评论
  await kv.del(`reviews:${id}`)
  // 删除评分历史
  await kv.del(`rating_history:${id}`)
  // 删除区域分布
  await kv.del(`region_distribution:${id}`)
}

// 评论相关操作
export async function saveReviews(appId: string, reviews: Review[]): Promise<void> {
  // 使用列表存储评论，每个应用一个列表
  const reviewsKey = `reviews:${appId}`

  // 获取现有评论
  const existingReviewsStr = (await kv.lrange(reviewsKey, 0, -1)) as string[]
  const existingReviews = existingReviewsStr.map((str) => JSON.parse(str)) as Review[]

  // 合并评论，避免重复
  const existingIds = new Set(existingReviews.map((r) => r.id))
  const newReviews = reviews.filter((r) => !existingIds.has(r.id))

  // 添加新评论
  if (newReviews.length > 0) {
    const reviewStrings = newReviews.map((review) => JSON.stringify(review))
    await kv.rpush(reviewsKey, ...reviewStrings)
  }

  // 更新应用评分和评论数
  await updateAppStats(appId)
}

export async function getReviews(appId: string): Promise<Review[]> {
  const reviewsKey = `reviews:${appId}`
  const reviewStrings = (await kv.lrange(reviewsKey, 0, -1)) as string[]
  return reviewStrings.map((str) => JSON.parse(str))
}

export async function getAllReviews(limit = 100): Promise<Review[]> {
  const apps = await getAllApps()
  let allReviews: Review[] = []

  for (const app of apps) {
    const appReviews = await getReviews(app.id)
    allReviews = [...allReviews, ...appReviews]
  }

  // 按日期排序并限制数量
  return allReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit)
}

// 更新应用统计信息
async function updateAppStats(appId: string): Promise<void> {
  const app = await getApp(appId)
  if (!app) return

  const reviews = await getReviews(appId)

  // 计算平均评分
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0

  // 更新应用
  const updatedApp: App = {
    ...app,
    rating: averageRating,
    reviewCount: reviews.length,
    lastUpdated: new Date().toISOString(),
  }

  await saveApp(updatedApp)

  // 更新评分历史
  await updateRatingHistory(appId, reviews)

  // 更新区域分布
  await updateRegionDistribution(appId, reviews)
}

// 评分历史
async function updateRatingHistory(appId: string, reviews: Review[]): Promise<void> {
  // 按月分组评论
  const reviewsByMonth: Record<string, { appStore: Review[]; playStore: Review[] }> = {}

  reviews.forEach((review) => {
    const date = new Date(review.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    if (!reviewsByMonth[monthKey]) {
      reviewsByMonth[monthKey] = { appStore: [], playStore: [] }
    }

    if (review.store === "app-store") {
      reviewsByMonth[monthKey].appStore.push(review)
    } else {
      reviewsByMonth[monthKey].playStore.push(review)
    }
  })

  // 计算每月平均评分
  const ratingHistory: RatingHistory[] = Object.entries(reviewsByMonth).map(([month, { appStore, playStore }]) => {
    const appStoreRating = appStore.length > 0 ? appStore.reduce((sum, r) => sum + r.rating, 0) / appStore.length : 0

    const playStoreRating =
      playStore.length > 0 ? playStore.reduce((sum, r) => sum + r.rating, 0) / playStore.length : 0

    return {
      date: `${month}-01T00:00:00.000Z`,
      appStore: appStoreRating,
      playStore: playStoreRating,
    }
  })

  // 按日期排序
  ratingHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // 保存评分历史
  await kv.set(`rating_history:${appId}`, JSON.stringify(ratingHistory))
}

// 获取评分历史
export async function getRatingHistory(appId: string): Promise<RatingHistory[]> {
  const historyStr = (await kv.get(`rating_history:${appId}`)) as string | null
  return historyStr ? JSON.parse(historyStr) : []
}

// 区域分布
async function updateRegionDistribution(appId: string, reviews: Review[]): Promise<void> {
  // 按区域分组评论
  const reviewsByRegion: Record<string, number> = {}

  reviews.forEach((review) => {
    if (!reviewsByRegion[review.region]) {
      reviewsByRegion[review.region] = 0
    }
    reviewsByRegion[review.region]++
  })

  // 转换为区域分布数据
  const regionDistribution: RegionData[] = Object.entries(reviewsByRegion)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // 保存区域分布
  await kv.set(`region_distribution:${appId}`, JSON.stringify(regionDistribution))
}

// 获取区域分布
export async function getRegionDistribution(appId: string): Promise<RegionData[]> {
  const distributionStr = (await kv.get(`region_distribution:${appId}`)) as string | null
  return distributionStr ? JSON.parse(distributionStr) : []
}

// 获取统计信息
export async function getStats(): Promise<Stats> {
  const apps = await getAllApps()
  const reviews = await getAllReviews(1000) // 获取最多1000条评论用于统计

  const totalApps = apps.length
  const totalReviews = reviews.length

  // 计算平均评分
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
  const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0

  // 计算趋势（简化版）
  // 在实际应用中，你可能需要比较当前周期和上一周期的数据
  return {
    totalApps,
    totalReviews,
    averageRating,
    appsTrend: "+1 this week",
    reviewsTrend: `+${Math.floor(totalReviews * 0.1)} this week`,
    ratingTrend: (Math.random() > 0.5 ? "+" : "-") + (Math.random() * 0.2).toFixed(1) + " this week",
    appsTrendUp: true,
    reviewsTrendUp: true,
    ratingTrendUp: Math.random() > 0.5,
  }
}

// 初始化数据（仅用于开发/测试）
export async function initializeData(apps: App[], reviews: Review[]): Promise<void> {
  // 清除现有数据
  await kv.del("apps")

  // 保存应用
  for (const app of apps) {
    await saveApp(app)
  }

  // 保存评论
  for (const review of reviews) {
    await saveReviews(review.appId, [review])
  }
}

