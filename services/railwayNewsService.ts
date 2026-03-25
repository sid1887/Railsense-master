/**
 * Railway News Service
 * PHASE 9: Aggregates railway news from Google News RSS feed
 * Keeps passengers informed about delays, incidents, safety notices
 *
 * Sources:
 * - Google News RSS for Indian Railways keywords
 * - Real-time news with timestamps
 * - Categorization by incident type (delays, accidents, incidents, safety, maintenance)
 */

interface RailwayNews {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: Date;
  category: 'delay' | 'accident' | 'incident' | 'safety' | 'maintenance' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedTrains: string[]; // Train numbers mentioned
  affectedRoutes: string[]; // Route names mentioned
}

class RailwayNewsService {
  private newsCache: RailwayNews[] = [];
  private readonly CACHE_TTL_MS = 1800000; // 30 minutes
  private lastFetchTime = 0;
  private readonly RSS_FEEDS = [
    'https://news.google.com/rss/search?q=Indian%20Railways%20delay',
    'https://news.google.com/rss/search?q=train%20accident%20India',
    'https://news.google.com/rss/search?q=railway%20maintenance%20India',
    'https://news.google.com/rss/search?q=train%20safety%20India',
  ];

  /**
   * Fetch latest railway news
   */
  async getLatestNews(): Promise<RailwayNews[]> {
    // Check cache first
    if (this.newsCache.length > 0 && Date.now() - this.lastFetchTime < this.CACHE_TTL_MS) {
      console.log(`[RailwayNews] Using cached news (${this.newsCache.length} items)`);
      return this.newsCache;
    }

    try {
      const allNews: RailwayNews[] = [];

      // Fetch from all RSS feeds in parallel
      const newsFromFeeds = await Promise.all(
        this.RSS_FEEDS.map((feed) => this._fetchRSSFeed(feed))
      );

      // Combine and deduplicate
      for (const feedNews of newsFromFeeds) {
        for (const news of feedNews) {
          // Check for duplicates by title
          if (!allNews.some((n) => n.title.toLowerCase() === news.title.toLowerCase())) {
            allNews.push(news);
          }
        }
      }

      // Sort by date (newest first)
      allNews.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

      // Cache top 50 articles
      this.newsCache = allNews.slice(0, 50);
      this.lastFetchTime = Date.now();

      console.log(`[RailwayNews] Fetched ${this.newsCache.length} unique news articles`);
      return this.newsCache;
    } catch (error) {
      console.error('[RailwayNews] Error fetching news:', error);
      return this.newsCache; // Return cached results on error
    }
  }

  /**
   * Get news for specific train
   */
  async getNewsForTrain(trainNumber: string): Promise<RailwayNews[]> {
    const news = await this.getLatestNews();
    return news.filter((n) => n.affectedTrains.includes(trainNumber));
  }

  /**
   * Get news by category
   */
  async getNewsByCategory(category: RailwayNews['category']): Promise<RailwayNews[]> {
    const news = await this.getLatestNews();
    return news.filter((n) => n.category === category).slice(0, 10);
  }

  /**
   * Get critical/high severity news
   */
  async getCriticalNews(): Promise<RailwayNews[]> {
    const news = await this.getLatestNews();
    return news.filter((n) => n.severity === 'critical' || n.severity === 'high').slice(0, 5);
  }

  /**
   * Fetch and parse RSS feed
   */
  private async _fetchRSSFeed(feedUrl: string): Promise<RailwayNews[]> {
    try {
      console.log(`[RailwayNews] Fetching RSS feed: ${feedUrl.substring(0, 60)}...`);

      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'RailSense/1.0 (+http://railsense.local)',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.warn(`[RailwayNews] RSS fetch returned ${response.status}`);
        return [];
      }

      const text = await response.text();
      return this._parseRSSXML(text);
    } catch (error) {
      console.warn(`[RailwayNews] Error fetching RSS feed:`, error);
      return [];
    }
  }

  /**
   * Parse RSS XML response
   * Simple XML parser for RSS 2.0 format
   */
  private _parseRSSXML(xmlText: string): RailwayNews[] {
    const news: RailwayNews[] = [];

    try {
      // Create a simple XML parser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

      // Check for parse errors
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        console.warn('[RailwayNews] XML parse error');
        return [];
      }

      // Get all items
      const items = xmlDoc.getElementsByTagName('item');

      for (let i = 0; i < Math.min(items.length, 10); i++) {
        const item = items[i];
        const titleEl = item.getElementsByTagName('title')[0];
        const descEl = item.getElementsByTagName('description')[0];
        const linkEl = item.getElementsByTagName('link')[0];
        const pubDateEl = item.getElementsByTagName('pubDate')[0];

        if (titleEl && linkEl) {
          const title = titleEl.textContent || '';
          const description = descEl?.textContent || '';
          const link = linkEl.textContent || '';
          const pubDate = pubDateEl?.textContent || new Date().toISOString();

          const railwayNews: RailwayNews = {
            id: `${Date.now()}-${i}`,
            title,
            description: description.substring(0, 200),
            url: link,
            source: this._extractSource(link),
            publishedAt: new Date(pubDate),
            category: this._categorizeNews(title, description),
            severity: this._assessSeverity(title, description),
            affectedTrains: this._extractTrainNumbers(title, description),
            affectedRoutes: this._extractRoutes(title, description),
          };

          news.push(railwayNews);
        }
      }
    } catch (error) {
      console.error('[RailwayNews] XML parsing error:', error);
    }

    return news;
  }

  /**
   * Extract source from URL
   */
  private _extractSource(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  /**
   * Categorize news based on content
   */
  private _categorizeNews(title: string, description: string): RailwayNews['category'] {
    const text = (title + ' ' + description).toLowerCase();

    if (text.includes('delay') || text.includes('delayed')) return 'delay';
    if (text.includes('accident') || text.includes('crash') || text.includes('derail')) return 'accident';
    if (text.includes('incident') || text.includes('problem') || text.includes('issue')) return 'incident';
    if (text.includes('safety') || text.includes('hazard') || text.includes('warning')) return 'safety';
    if (text.includes('maintenance') || text.includes('repair') || text.includes('work')) return 'maintenance';

    return 'other';
  }

  /**
   * Assess severity based on keywords
   */
  private _assessSeverity(title: string, description: string): RailwayNews['severity'] {
    const text = (title + ' ' + description).toLowerCase();

    if (
      text.includes('fatal') ||
      text.includes('death') ||
      text.includes('critical') ||
      text.includes('major accident')
    ) {
      return 'critical';
    }

    if (
      text.includes('serious') ||
      text.includes('severe') ||
      text.includes('injury') ||
      text.includes('multiple')
    ) {
      return 'high';
    }

    if (
      text.includes('delay') ||
      text.includes('canceled') ||
      text.includes('disruption')
    ) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Extract train numbers from text
   * Looks for patterns like "12955", "Train #12955", "12955 Express"
   */
  private _extractTrainNumbers(title: string, description: string): string[] {
    const text = title + ' ' + description;
    const trainRegex = /\b\d{5}\b/g; // Indian train numbers are 5 digits
    const matches = text.match(trainRegex) || [];

    // Return unique train numbers
    return [...new Set(matches)];
  }

  /**
   * Extract route names from text
   * Looks for Indian railway route keywords
   */
  private _extractRoutes(title: string, description: string): string[] {
    const text = title + ' ' + description;
    const routes = [
      'Mumbai',
      'Delhi',
      'Bangalore',
      'Chennai',
      'Hyderabad',
      'Kolkata',
      'Pune',
      'Ahmedabad',
      'Central',
      'Western',
      'Northern',
      'Southern',
      'Eastern',
      'Rajdhani',
      'Shatabdi',
    ];

    return routes.filter((route) => text.includes(route));
  }
}

export const railwayNewsService = new RailwayNewsService();
