import type { App, Review, Stats, RatingHistory, RegionData } from "./types"
import { Redis } from '@upstash/redis'

// 内存存储（用于开发环境）
const memoryApps: Record<string, App> = {}
const memoryReviews: Record<string, Review[]> = {}
const memoryRatingHistory: Record<string, RatingHistory[]> = {}
const memoryRegionDistribution: Record<string, RegionData[]> = {}

// 检查是否可以使用 Upstash Redis
const canUseRedis =
  typeof process.env.UPSTASH_REDIS_REST_URL === "string" && typeof process.env.UPSTASH_REDIS_REST_TOKEN === "string"

// 有条件地导入 Upstash Redis
let redis: Redis | undefined = undefined
if (canUseRedis) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  } catch (err) {
    console.error("Failed to initialize Redis:", err)
  }
}

// 应用相关操作
export async function getApps(): Promise<App[]> {
  if (canUseRedis && redis) {
    try {
      const apps = (await redis.hgetall("apps")) as Record<string, any>
      console.log('Raw apps from Redis:', apps);
      if (!apps) return [];
      return Object.values(apps).map((appData) => {
        try {
          // 检查 appData 是否已经是对象
          if (typeof appData === 'object' && appData !== null) {
            return appData;
          }
          // 如果是字符串，尝试解析
          if (typeof appData === 'string') {
            return JSON.parse(appData);
          }
          console.error('Invalid app data format:', appData);
          return null;
        } catch (e) {
          console.error('Failed to parse app data:', appData, e);
          return null;
        }
      }).filter(Boolean);
    } catch (e) {
      console.error('Failed to get apps from Redis:', e);
      return [];
    }
  } else {
    return Object.values(memoryApps)
  }
}

export async function getAppById(id: string): Promise<App | null> {
  if (canUseRedis && redis) {
    try {
      const appData = (await redis.hget("apps", id)) as any;
      if (!appData) return null;
      
      // 检查是否已经是对象
      if (typeof appData === 'object' && appData !== null) {
        return appData;
      }
      // 如果是字符串，尝试解析
      if (typeof appData === 'string') {
        return JSON.parse(appData);
      }
      console.error('Invalid app data format:', appData);
      return null;
    } catch (e) {
      console.error('Failed to get app from Redis:', e);
      return null;
    }
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
    try {
      const reviewData = (await redis.lrange(`reviews:${appId}`, 0, -1)) as any[]
      return reviewData.map((data) => {
        try {
          // 检查是否已经是对象
          if (typeof data === 'object' && data !== null) {
            return data;
          }
          // 如果是字符串，尝试解析
          if (typeof data === 'string') {
            return JSON.parse(data);
          }
          console.error('Invalid review data format:', data);
          return null;
        } catch (e) {
          console.error('Failed to parse review data:', data, e);
          return null;
        }
      }).filter(Boolean);
    } catch (e) {
      console.error('Failed to get reviews from Redis:', e);
      return [];
    }
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
    try {
      const historyData = await redis.get(`rating_history:${appId}`);
      
      // 检查是否已经是对象
      if (typeof historyData === 'object' && historyData !== null) {
        return Array.isArray(historyData) ? historyData : generateMockRatingHistory();
      }
      
      // 如果是字符串，尝试解析
      if (typeof historyData === 'string') {
        try {
          const parsed = JSON.parse(historyData);
          return Array.isArray(parsed) ? parsed : generateMockRatingHistory();
        } catch (e) {
          console.error('Failed to parse rating history:', e);
          return generateMockRatingHistory();
        }
      }
      
      return generateMockRatingHistory();
    } catch (e) {
      console.error('Failed to get rating history from Redis:', e);
      return generateMockRatingHistory();
    }
  } else {
    return memoryRatingHistory[appId] || generateMockRatingHistory();
  }
}

// 区域分布
export async function getRegionDistribution(appId: string): Promise<RegionData[]> {
  if (canUseRedis && redis) {
    try {
      const distributionData = await redis.get(`region_distribution:${appId}`);
      
      // 检查是否已经是对象
      if (typeof distributionData === 'object' && distributionData !== null) {
        return Array.isArray(distributionData) ? distributionData : generateMockRegionDistribution();
      }
      
      // 如果是字符串，尝试解析
      if (typeof distributionData === 'string') {
        try {
          const parsed = JSON.parse(distributionData);
          return Array.isArray(parsed) ? parsed : generateMockRegionDistribution();
        } catch (e) {
          console.error('Failed to parse region distribution:', e);
          return generateMockRegionDistribution();
        }
      }
      
      return generateMockRegionDistribution();
    } catch (e) {
      console.error('Failed to get region distribution from Redis:', e);
      return generateMockRegionDistribution();
    }
  } else {
    return memoryRegionDistribution[appId] || generateMockRegionDistribution();
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
  const baseDate = new Date('2024-01-01T00:00:00.000Z');
  const data: RatingHistory[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setMonth(baseDate.getMonth() - i);

    data.push({
      date: date.toISOString(),
      appStore: 4.2,
      playStore: 4.0,
    });
  }

  return data;
}

// 生成模拟区域分布数据
function generateMockRegionDistribution(): RegionData[] {
  return [
    { name: "US", value: 200 },
    { name: "UK", value: 150 },
    { name: "JP", value: 80 },
    { name: "DE", value: 50 },
    { name: "FR", value: 40 },
  ];
}

// 初始化数据库
export async function initDatabase(): Promise<void> {
  if (canUseRedis && redis) {
    try {
      // 检查是否已经有数据
      const existingApps = await redis.hgetall("apps");
      if (!existingApps || Object.keys(existingApps).length === 0) {
        console.log('Initializing database with sample data...');
        // 添加示例应用
        const sampleApp: App = {
          id: "sample-app-1",
          name: "Sample App",
          appStoreId: "123456789",
          playStoreId: "com.example.app",
          icon: "https://example.com/icon.png",
          rating: 4.5,
          reviewCount: 0,
          appStoreRegions: ["us", "gb", "jp"],
          playStoreRegions: ["us", "gb", "jp"],
          appStoreFrequency: "daily",
          playStoreFrequency: "daily",
          lastUpdated: new Date().toISOString()
        };
        
        await createApp(sampleApp);
        console.log('Sample data initialized successfully');
      } else {
        console.log('Database already contains data, skipping initialization');
      }
    } catch (e) {
      console.error('Failed to initialize database:', e);
    }
  } else {
    console.log('Using in-memory storage');
  }
}

