import type { App, Review, Stats, RatingHistory, RegionData } from "./types"

// 内存存储（用于开发环境）
const memoryApps: Record<string, App> = {}
const memoryReviews: Record<string, Review[]> = {}
const memoryRatingHistory: Record<string, RatingHistory[]> = {}
const memoryRegionDistribution: Record<string, RegionData[]> = {}

// 检查是否可以使用 Upstash Redis
const canUseRedis =
  typeof process.env.UPSTASH_REDIS_REST_URL === "string" && typeof process.env.UPSTASH_REDIS_REST_TOKEN === "string"

// 有条件地导入 Upstash Redis
let redis: any = undefined
if (canUseRedis) {
  // 动态导入 Upstash Redis 以避免在没有环境变量时出错
  import("@upstash/redis")
    .then((module) => {
      redis = new module.Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    })
    .catch((err) => {
      console.error("Failed to import @upstash/redis:", err)
    })
}

// 应用相关操作
export async function getApps(): Promise<App[]> {
  if (canUseRedis && redis) {
    const apps = (await redis.hgetall("apps")) as Record<string, string>
    return Object.values(apps || {}).map((appStr) => JSON.parse(appStr))
  } else {
    return Object.values(memoryApps)
  }
}

export async function getAppById(id: string): Promise<App | null> {
  if (canUseRedis && redis) {
    const appStr = (await redis.hget("apps", id)) as string | null
    return appStr ? JSON.parse(appStr) : null
  } else {
    return memoryApps[id] || null
  }
}

export async function createApp(app: App): Promise<void> {
  if (canUseRedis && redis) {
    await redis.hset("apps", { [app.id]: JSON.stringify(app) })
  } else {
    memoryApps[app.id] = app
  }
}

export async function updateApp(app: App): Promise<void> {
  if (canUseRedis && redis) {
    await redis.hset("apps", { [app.id]: JSON.stringify(app) })
  } else {
    memoryApps[app.id] = app
  }
}

export async function deleteApp(id: string): Promise<void> {
  if (canUseRedis && redis) {
    await redis.hdel("apps", id)
    await redis.del(`reviews:${id}`)
    await redis.del(`rating_history:${id}`)
    await redis.del(`region_distribution:${id}`)
  } else {
    delete memoryApps[id]
    delete memoryReviews[id]
    delete memoryRatingHistory[id]
    delete memoryRegionDistribution[id]
  }
}

// 评论相关操作
export async function getReviews(appId: string): Promise<Review[]> {
  if (canUseRedis && redis) {
    const reviewStrings = (await redis.lrange(`reviews:${appId}`, 0, -1)) as string[]
    return reviewStrings.map((str) => JSON.parse(str))
  } else {
    return memoryReviews[appId] || []
  }
}

export async function addReviews(appId: string, reviews: Review[]): Promise<void> {
  if (reviews.length === 0) return

  if (canUseRedis && redis) {
    const reviewStrings = reviews.map((review) => JSON.stringify(review))
    await redis.rpush(`reviews:${appId}`, ...reviewStrings)
  } else {
    if (!memoryReviews[appId]) {
      memoryReviews[appId] = []
    }
    memoryReviews[appId] = [...memoryReviews[appId], ...reviews]
  }

  // 更新应用统计信息
  await updateAppStats(appId)
}

export async function getRecentReviews(limit = 10): Promise<Review[]> {
  const apps = await getApps()
  let allReviews: Review[] = []

  for (const app of apps) {
    const reviews = await getReviews(app.id)
    allReviews = [...allReviews, ...reviews]
  }

  // 按日期排序，取最新的 limit 条
  return allReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit)
}

// 评分历史
export async function getRatingHistory(appId: string): Promise<RatingHistory[]> {
  if (canUseRedis && redis) {
    const historyStr = (await redis.get(`rating_history:${appId}`)) as string | null
    return historyStr ? JSON.parse(historyStr) : generateMockRatingHistory()
  } else {
    return memoryRatingHistory[appId] || generateMockRatingHistory()
  }
}

// 区域分布
export async function getRegionDistribution(appId: string): Promise<RegionData[]> {
  if (canUseRedis && redis) {
    const distributionStr = (await redis.get(`region_distribution:${appId}`)) as string | null
    return distributionStr ? JSON.parse(distributionStr) : generateMockRegionDistribution()
  } else {
    return memoryRegionDistribution[appId] || generateMockRegionDistribution()
  }
}

// 统计数据
export async function getStats(): Promise<Stats> {
  const apps = await getApps()
  let totalReviews = 0
  let totalRating = 0

  for (const app of apps) {
    const reviews = await getReviews(app.id)
    totalReviews += reviews.length
    totalRating += reviews.reduce((sum, review) => sum + review.rating, 0)
  }

  const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0

  return {
    totalApps: apps.length,
    totalReviews,
    averageRating,
    appsTrend: "+1 this week",
    reviewsTrend: "+124 this week",
    ratingTrend: "-0.1 this week",
    appsTrendUp: true,
    reviewsTrendUp: true,
    ratingTrendUp: false,
  }
}

// 更新应用统计信息
async function updateAppStats(appId: string): Promise<void> {
  const app = await getAppById(appId)
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

  await updateApp(updatedApp)

  // 更新评分历史
  await updateRatingHistory(appId, reviews)

  // 更新区域分布
  await updateRegionDistribution(appId, reviews)
}

// 更新评分历史
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
  if (canUseRedis && redis) {
    await redis.set(`rating_history:${appId}`, JSON.stringify(ratingHistory))
  } else {
    memoryRatingHistory[appId] = ratingHistory
  }
}

// 更新区域分布
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
  if (canUseRedis && redis) {
    await redis.set(`region_distribution:${appId}`, JSON.stringify(regionDistribution))
  } else {
    memoryRegionDistribution[appId] = regionDistribution
  }
}

// 生成模拟评分历史数据
function generateMockRatingHistory(): RatingHistory[] {
  const today = new Date()
  const data: RatingHistory[] = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setMonth(today.getMonth() - i)

    data.push({
      date: date.toISOString(),
      appStore: 4.0 + Math.random() * 0.6,
      playStore: 3.8 + Math.random() * 0.6,
    })
  }

  return data
}

// 生成模拟区域分布数据
function generateMockRegionDistribution(): RegionData[] {
  return [
    { name: "US", value: 210 },
    { name: "UK", value: 150 },
    { name: "JP", value: 80 },
    { name: "DE", value: 45 },
    { name: "FR", value: 38 },
  ]
}

// 初始化数据库
export async function initDatabase(): Promise<void> {
  // 示例应用数据
  const sampleApps: App[] = [
    {
      id: "1",
      name: "Fitness Tracker Pro",
      icon: "/placeholder.svg?height=60&width=60",
      appStoreId: "123456789",
      playStoreId: "com.example.fitnesstracker",
      appStoreRegions: ["US", "UK", "JP"],
      playStoreRegions: ["US", "UK", "DE", "FR"],
      appStoreFrequency: "daily",
      playStoreFrequency: "daily",
      rating: 4.5,
      reviewCount: 523,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "2",
      name: "Weather Now",
      icon: "/placeholder.svg?height=60&width=60",
      appStoreId: "987654321",
      playStoreId: null,
      appStoreRegions: ["US", "CA"],
      playStoreRegions: [],
      appStoreFrequency: "daily",
      playStoreFrequency: null,
      rating: 4.2,
      reviewCount: 312,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "3",
      name: "Task Manager",
      icon: "/placeholder.svg?height=60&width=60",
      appStoreId: "456789123",
      playStoreId: "com.example.taskmanager",
      appStoreRegions: ["US", "UK"],
      playStoreRegions: ["US", "UK", "DE", "FR"],
      appStoreFrequency: "weekly",
      playStoreFrequency: "daily",
      rating: 3.8,
      reviewCount: 289,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "4",
      name: "Photo Editor",
      icon: "/placeholder.svg?height=60&width=60",
      appStoreId: null,
      playStoreId: "com.example.photoeditor",
      appStoreRegions: [],
      playStoreRegions: ["US", "IN", "BR"],
      appStoreFrequency: null,
      playStoreFrequency: "daily",
      rating: 4.1,
      reviewCount: 124,
      lastUpdated: new Date().toISOString(),
    },
  ]

  // 示例评论数据
  const sampleReviews: Review[] = [
    {
      id: "1",
      appId: "1",
      appName: "Fitness Tracker Pro",
      userName: "JohnD",
      rating: 5,
      text: "This app has completely transformed my fitness routine. The tracking features are incredibly accurate and the interface is intuitive. Highly recommend!",
      date: "2023-11-15T10:30:00Z",
      store: "app-store",
      region: "US",
      version: "2.1.0",
    },
    {
      id: "2",
      appId: "2",
      appName: "Weather Now",
      userName: "SarahM",
      rating: 4,
      text: "Great app for checking the weather. The hourly forecasts are very accurate. Would be perfect if it had more detailed radar maps.",
      date: "2023-11-15T09:45:00Z",
      store: "app-store",
      region: "UK",
      version: "1.5.2",
    },
    {
      id: "3",
      appId: "3",
      appName: "Task Manager",
      userName: "MikeT",
      rating: 2,
      text: "The app keeps crashing when I try to create a new task list. Very frustrating experience. Hope they fix it soon.",
      date: "2023-11-15T08:20:00Z",
      store: "play-store",
      region: "DE",
      version: "3.0.1",
    },
    {
      id: "4",
      appId: "4",
      appName: "Photo Editor",
      userName: "AnnaK",
      rating: 5,
      text: "Amazing photo editing tools! The filters are high quality and the UI is so easy to use. Best photo editor I've tried.",
      date: "2023-11-15T07:15:00Z",
      store: "play-store",
      region: "US",
      version: "2.2.0",
    },
    {
      id: "5",
      appId: "1",
      appName: "Fitness Tracker Pro",
      userName: "DavidL",
      rating: 3,
      text: "Good app overall, but the sleep tracking feature isn't very accurate. It often shows I'm sleeping when I'm just lying still reading.",
      date: "2023-11-14T22:10:00Z",
      store: "app-store",
      region: "JP",
      version: "2.1.0",
    },
  ]

  // 检查是否已有数据
  const existingApps = await getApps()

  if (existingApps.length === 0) {
    console.log("Initializing database with sample data...")

    // 保存示例应用
    for (const app of sampleApps) {
      await createApp(app)
    }

    // 保存示例评论
    for (const review of sampleReviews) {
      if (!memoryReviews[review.appId]) {
        memoryReviews[review.appId] = []
      }

      if (canUseRedis && redis) {
        await redis.rpush(`reviews:${review.appId}`, JSON.stringify(review))
      } else {
        memoryReviews[review.appId].push(review)
      }
    }

    // 更新所有应用的统计信息
    for (const app of sampleApps) {
      await updateAppStats(app.id)
    }

    console.log("Database initialization complete")
  }
}

