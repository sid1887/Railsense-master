/**
 * News Service
 * Fetches relevant railway news headlines to provide context for unusual halts
 * Uses Google News RSS or lightweight news aggregation
 */

import axios from 'axios';
import { logger } from './logger';

export interface NewsArticle {
  title: string;
  source: string;
  link: string;
  pubDate: string;
  isVerified: boolean;
  relevanceScore: number;
}

export interface NewsResponse {
  articles: NewsArticle[];
  query: string;
  fetchedAt: string;
}

/**
 * Cache for news articles to avoid repeated fetches
 */
const newsCache = new Map<string, { data: NewsArticle[]; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

/**
 * Keywords related to railway disruptions
 */
const DISRUPTION_KEYWORDS = [
  'rail block',
  'strike',
  'derailment',
  'signal failure',
  'track maintenance',
  'accident',
  'collision',
  'flood',
  'weather',
  'delay',
  'traffic',
  'congestion',
  'blockade',
];

/**
 * Parse a simple RSS feed structure (lightweight, no external library)
 * Expects RSS XML format with item elements
 */
function parseRSSItems(xmlText: string): Array<{ title: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; pubDate: string }> = [];

  // Simple regex to find <item> tags
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];

    // Extract title
    const titleMatch = /<title>(.*?)<\/title>/.exec(itemContent);
    const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : 'Untitled';

    // Extract link
    const linkMatch = /<link>(.*?)<\/link>/.exec(itemContent);
    const link = linkMatch ? linkMatch[1] : '';

    // Extract pubDate
    const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(itemContent);
    const pubDate = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();

    if (title && title.trim()) {
      items.push({ title, link, pubDate });
    }
  }

  return items;
}

/**
 * Check if article is recent (within last 6 hours)
 */
function isRecent(dateString: string, hoursWindow: number = 6): boolean {
  try {
    const pubDate = new Date(dateString);
    const nowTime = Date.now();
    const diffMs = nowTime - pubDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours <= hoursWindow;
  } catch (err) {
    return false;
  }
}

/**
 * Calculate relevance score for article (0-1)
 * Based on keyword matches
 */
function calculateRelevance(title: string, keywords: string[]): number {
  let score = 0;
  const lowerTitle = title.toLowerCase();

  for (const keyword of keywords) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      score += 0.3;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Fetch news articles for given query
 * Uses Google News RSS as primary source
 */
export async function fetchNews(
  query: string,
  region: string = 'IN'
): Promise<NewsResponse> {
  const cacheKey = `${query}:${region}`;

  // Check cache
  const cached = newsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug('News cache hit for query', { query, region });
    return {
      articles: cached.data,
      query,
      fetchedAt: new Date().toISOString(),
    };
  }

  try {
    logger.info('Fetching news articles', { query, region });

    // Google News RSS endpoint
    const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}%20${region}&gl=${region}&ceid=${region}:en`;

    const response = await axios.get(newsUrl, {
      timeout: 8000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });

    const items = parseRSSItems(response.data);
    logger.info('Parsed RSS items', { count: items.length });

    // Filter and enrich articles
    const articles: NewsArticle[] = items
      .filter((item) => isRecent(item.pubDate))
      .map((item) => ({
        title: item.title,
        source: 'Google News',
        link: item.link,
        pubDate: item.pubDate,
        isVerified: false,
        relevanceScore: calculateRelevance(item.title, DISRUPTION_KEYWORDS),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Top 5

    // Cache result
    newsCache.set(cacheKey, { data: articles, timestamp: Date.now() });

    logger.success('News fetch complete', { query, articlesCount: articles.length });

    return {
      articles,
      query,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn('Failed to fetch news articles', { query, error: String(err) });

    // Return empty on error
    return {
      articles: [],
      query,
      fetchedAt: new Date().toISOString(),
    };
  }
}

/**
 * Fetch news for train region
 * Uses train's current location to determine region
 */
export async function fetchNewsForTrain(
  trainNumber: string,
  lat: number,
  lng: number
): Promise<NewsResponse> {
  // Simple region detection based on lat/lng
  // India bounding box: 8.4°N to 35.0°N, 68.7°E to 97.4°E
  const region = 'India'; // Could be more granular
  const query = `train ${trainNumber} railway`;

  return fetchNews(query, 'IN');
}

/**
 * Create summary of news relevance to train status
 */
export function summarizeNewsContext(
  articles: NewsArticle[],
  haltReason?: string
): string {
  if (articles.length === 0) {
    return 'No recent railway news for this route.';
  }

  const topArticle = articles[0];
  const context = `Found ${articles.length} recent articles. Top headline: "${topArticle.title}"`;

  if (haltReason && haltReason.toLowerCase().includes('weather')) {
    return context + ' (Related: weather disruption detected)';
  }

  if (haltReason && (haltReason.toLowerCase().includes('strike') || haltReason.toLowerCase().includes('block'))) {
    return context + ' (Related: work action detected)';
  }

  return context;
}
