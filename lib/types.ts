export interface App {
  id: string
  name: string
  icon: string | null
  appStoreId: string | null
  playStoreId: string | null
  appStoreRegions: string[]
  playStoreRegions: string[]
  appStoreFrequency: string | null
  playStoreFrequency: string | null
  rating: number
  reviewCount: number
  lastUpdated: string
}

export interface Review {
  id: string
  appId: string
  appName: string
  userName: string
  rating: number
  text: string
  date: string
  store: "app-store" | "play-store"
  region: string
  version: string
}

export interface RatingHistory {
  date: string
  appStore: number
  playStore: number
}

export interface RegionData {
  name: string
  value: number
}

export interface Stats {
  totalApps: number
  totalReviews: number
  averageRating: number
  appsTrend: string
  reviewsTrend: string
  ratingTrend: string
  appsTrendUp: boolean
  reviewsTrendUp: boolean
  ratingTrendUp: boolean
}

