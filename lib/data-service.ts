// 这个文件现在只是一个包装器，将所有数据访问委托给 db.ts
import type { App, Review, RatingHistory, RegionData, Stats } from "./types"
import * as db from "./db"

export {
  initDatabase,
  createApp,
  updateApp,
  deleteApp,
  getReviews,
  addReviews,
  getRatingHistory,
  getRegionDistribution
} from './db'

// 数据访问函数
export async function getApps(): Promise<App[]> {
  return db.getApps()
}

export async function getAppById(id: string): Promise<App | null> {
  return db.getAppById(id)
}

export async function getRecentReviews(limit = 5): Promise<Review[]> {
  return db.getRecentReviews(limit)
}

export async function getAppReviews(appId: string): Promise<Review[]> {
  return db.getReviews(appId)
}

export async function getStats(): Promise<Stats> {
  return db.getStats()
}

export async function getAppRatingHistory(appId: string): Promise<RatingHistory[]> {
  return db.getRatingHistory(appId)
}

export async function getAppRegionDistribution(appId: string): Promise<RegionData[]> {
  return db.getRegionDistribution(appId)
}

