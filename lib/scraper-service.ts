import type { Review } from "./types"

// 使用 dynamic import 替代直接 import
let appStoreReviews: any = null
let gplay: any = null

// 异步初始化函数
async function initScrapers() {
  if (!appStoreReviews) {
    try {
      // 动态导入 app-store-scraper-reviews
      const { getReviews } = await import("app-store-scraper-reviews")
      appStoreReviews = getReviews
    } catch (error) {
      console.error("Failed to import app-store-scraper-reviews:", error)
      appStoreReviews = null
    }
  }

  if (!gplay) {
    try {
      // 动态导入 google-play-scraper
      const gplayModule = await import("google-play-scraper")
      // 处理ESM导入，检查是否有default属性
      gplay = gplayModule.default || gplayModule
    } catch (error) {
      console.error("Failed to import google-play-scraper:", error)
      gplay = null
    }
  }

  return { appStoreReviews, gplay }
}

// 修改 scrapeAppStoreReviews 函数
export async function scrapeAppStoreReviews(appId: string, regions: string[], fullScrape: boolean = false): Promise<Review[]> {
  console.log(`Scraping App Store reviews for app ${appId} in regions ${regions.join(', ')}${fullScrape ? ' (FULL SCRAPE)' : ''}`)

  try {
    // 确保 scrapers 已初始化
    const { appStoreReviews } = await initScrapers()

    if (!appStoreReviews) {
      throw new Error("app-store-scraper-reviews not initialized")
    }

    // 使用 app-store-scraper-reviews 获取评论
    const appStoreReviewsList: Review[] = []
    for (const region of regions) {
      let page = 1
      let hasMoreReviews = true
      let totalReviews = 0
      const MAX_REVIEWS = fullScrape ? 10000 : 100 // 全量抓取最多10000条，普通抓取100条
      
      while (hasMoreReviews && totalReviews < MAX_REVIEWS) {
        console.log(`[App Store] Scraping page ${page} for app ${appId} in region ${region}`)
        
        const reviews = await appStoreReviews({
          appId: appId,
          country: region,
          numberOfReviews: MAX_REVIEWS,
          sleep: 1000 // 每次请求间隔1秒
        })
        
        // 如果没有返回评论或者已经达到最大数量，则停止
        if (!reviews || reviews.length === 0) {
          hasMoreReviews = false
          break
        }
        // console.log(reviews)
        
        let reviewCounter = 1;
        const getNextReviewId = () => {
          const sequenceNumber = String(reviewCounter++).padStart(6, '0');
          return sequenceNumber;
        };

        const mappedReviews = reviews.map((review: any) => {
          return {
            id: `as-${review.id}`,
            appId,
            appName: "", // 这将由调用者填充
            userName: review.attributes?.userName || "Anonymous",
            rating: review.attributes?.rating || 0,
            text: review.attributes?.review || "",
            date: review.attributes?.date || new Date().toISOString(),
            store: "app-store",
            region,
            version: "Unknown", // 新SDK中没有version字段
          };
        });
        
        // console.log(mappedReviews);
        appStoreReviewsList.push(...mappedReviews);
        totalReviews += mappedReviews.length;
        console.log(`[App Store] Scraped ${mappedReviews.length} reviews, total: ${totalReviews}/${MAX_REVIEWS}`)
        
        // 增加页码，继续抓取下一页
        page++;
        
        // 如果返回的评论数量少于预期，说明已经没有更多评论了
        if (reviews.length < 50) { // 假设每页50条评论
          hasMoreReviews = false;
        }
        break;
      }
    }

    return appStoreReviewsList
  } catch (error) {
    console.error(`Error scraping App Store reviews: ${error}`)
    return []
  }
}

// 修改 scrapePlayStoreReviews 函数
export async function scrapePlayStoreReviews(appId: string, regions: string[], fullScrape: boolean = false): Promise<Review[]> {
  console.log(`Scraping Play Store reviews for app ${appId} in regions ${regions.join(', ')}${fullScrape ? ' (FULL SCRAPE)' : ''}`)

  try {
    // 确保 scrapers 已初始化
    const { gplay } = await initScrapers()

    if (!gplay) {
      throw new Error("google-play-scraper not initialized")
    }

    // 使用 google-play-scraper 获取评论
    const playStoreReviews: Review[] = []
    for (const region of regions) {
      let nextPaginationToken = undefined;
      let totalReviews = 0;
      const MAX_REVIEWS = fullScrape ? 6000 : 100; // 全量抓取最多6000条，普通抓取100条
      const BATCH_SIZE = 100; // 每次请求获取的评论数量
      
      do {
        console.log(`[Play Store] Scraping batch for app ${appId} in region ${region}, total so far: ${totalReviews}`)
        
        // 检查gplay对象结构并安全地访问sort属性
        let sortOption;
        try {
          // 尝试访问sort.NEWEST
          if (gplay.sort && gplay.sort.NEWEST) {
            sortOption = gplay.sort.NEWEST;
          } else if (gplay.default && gplay.default.sort && gplay.default.sort.NEWEST) {
            // 有些库可能将常量放在default命名空间下
            sortOption = gplay.default.sort.NEWEST;
          } else {
            // 如果无法找到常量，使用数字常量（通常NEWEST是2）
            console.log('[Play Store] Warning: Could not find sort.NEWEST, using fallback value');
            sortOption = 2; // 通常2代表最新评论
          }
        } catch (err) {
          console.log(`[Play Store] Error accessing sort options: ${err}, using fallback value`);
          sortOption = 2;
        }
        
        // 检查gplay对象结构并安全地访问reviews方法
        let reviewsFunction;
        try {
          // 尝试访问reviews方法
          if (typeof gplay.reviews === 'function') {
            reviewsFunction = gplay.reviews;
          } else if (gplay.default && typeof gplay.default.reviews === 'function') {
            // 有些库可能将方法放在default命名空间下
            reviewsFunction = gplay.default.reviews;
          } else {
            throw new Error('Cannot find reviews function in google-play-scraper');
          }
        } catch (err) {
          console.log(`[Play Store] Error accessing reviews function: ${err}`);
          throw err;
        }
        
        // 解析 region 格式，支持 US 和 EN-US 两种格式
        let lang = region.toLowerCase();
        let country = region;
        
        // 如果是 EN-US 格式，分别提取语言和国家代码
        if (region.includes('-')) {
          const [language, countryCode] = region.split('-');
          lang = language.toLowerCase();
          country = countryCode;
        }
        
        const result = await reviewsFunction({
          appId: appId,
          lang: lang,
          country: country,
          sort: sortOption,
          num: BATCH_SIZE,
          paginate: true,
          nextPaginationToken: nextPaginationToken
        })
        
        // 更新分页令牌
        nextPaginationToken = result.nextPaginationToken;
        
        let reviewCounter = 1;
        const getNextReviewId = () => {
          const sequenceNumber = String(reviewCounter++).padStart(6, '0');
          return sequenceNumber;
        };

        const mappedReviews = result.data.map((review: any) => {
          return {
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
          };
        });
        
        playStoreReviews.push(...mappedReviews);
        totalReviews += mappedReviews.length;
        console.log(`[Play Store] Scraped ${mappedReviews.length} reviews, total: ${totalReviews}/${MAX_REVIEWS}`)
        
        // 如果没有更多页面或者已经达到最大数量，则停止
        if (!nextPaginationToken || totalReviews >= MAX_REVIEWS || result.data.length === 0) {
          break;
        }
        
      } while (totalReviews < MAX_REVIEWS);
    }

    return playStoreReviews
  } catch (error) {
    console.error(`Error scraping Play Store reviews: ${error}`)
    return []
  }
}

// 抓取所有评论
export async function scrapeAllReviews(appConfig: any, fullScrape: boolean = false): Promise<Review[]> {
  let allReviews: Review[] = []

  if (appConfig.appStoreId) {
    for (const region of appConfig.appStoreRegions) {
      const appStoreReviews = await scrapeAppStoreReviews(appConfig.appStoreId, [region], fullScrape)
      allReviews = allReviews.concat(appStoreReviews)
    }
  }

  if (appConfig.playStoreId) {
    for (const region of appConfig.playStoreRegions) {
      const playStoreReviews = await scrapePlayStoreReviews(appConfig.playStoreId, [region], fullScrape)
      allReviews = allReviews.concat(playStoreReviews)
    }
  }

  return allReviews
}

