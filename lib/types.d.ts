declare module 'app-store-scraper' {
  const sort: {
    RECENT: number;
    HELPFUL: number;
  };
  
  function reviews(options: {
    id: string;
    country: string;
    page?: number;
    sort?: number;
  }): Promise<any[]>;

  const appStoreScraper: {
    sort: typeof sort;
    reviews: typeof reviews;
  };
  
  export = appStoreScraper;
}

declare module 'google-play-scraper' {
  const sort: {
    NEWEST: number;
    RATING: number;
    HELPFULNESS: number;
  };
  
  function reviews(options: {
    appId: string;
    lang?: string;
    sort?: number;
    num?: number;
  }): Promise<{ data: any[] }>;

  const gplayScaper: {
    sort: typeof sort;
    reviews: typeof reviews;
  };
  
  export = gplayScaper;
} 