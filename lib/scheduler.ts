import { App } from "./types"
import { scrapeAppReviews } from "./actions"
import * as db from "./db"

interface ScheduleConfig {
  frequency: string
  lastRun?: string
}

function shouldRunSchedule(config: ScheduleConfig): boolean {
  if (!config.lastRun) return true

  const lastRun = new Date(config.lastRun)
  const now = new Date()
  const diffHours = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60)

  switch (config.frequency) {
    case "daily":
      return diffHours >= 24
    case "weekly":
      return diffHours >= 24 * 7
    case "monthly":
      return diffHours >= 24 * 30
    default:
      return false
  }
}

async function updateLastRun(appId: string): Promise<void> {
  const app = await db.getAppById(appId)
  if (!app) return

  await db.updateApp({
    ...app,
    lastUpdated: new Date().toISOString()
  })
}

export async function checkAndRunScheduledTasks(): Promise<void> {
  try {
    const apps = await db.getAllApps()

    for (const app of apps) {
      // 检查 App Store 评论抓取
      if (app.appStoreId && app.appStoreFrequency) {
        const config: ScheduleConfig = {
          frequency: app.appStoreFrequency,
          lastRun: app.lastUpdated
        }

        if (shouldRunSchedule(config)) {
          console.log(`Running scheduled App Store review scraping for ${app.name}`)
          await scrapeAppReviews(app.id)
          await updateLastRun(app.id)
        }
      }

      // 检查 Play Store 评论抓取
      if (app.playStoreId && app.playStoreFrequency) {
        const config: ScheduleConfig = {
          frequency: app.playStoreFrequency,
          lastRun: app.lastUpdated
        }

        if (shouldRunSchedule(config)) {
          console.log(`Running scheduled Play Store review scraping for ${app.name}`)
          await scrapeAppReviews(app.id)
          await updateLastRun(app.id)
        }
      }
    }
  } catch (error) {
    console.error("Error running scheduled tasks:", error)
  }
}