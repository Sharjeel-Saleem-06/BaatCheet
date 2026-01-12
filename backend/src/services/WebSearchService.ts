/**
 * Web Search Service
 * Provides real-time web search capabilities like ChatGPT
 * Supports multiple search providers with automatic fallback
 * 
 * @module WebSearchService
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  source: string;
}

export interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  timestamp: Date;
  provider: string;
}

export interface SearchOptions {
  numResults?: number;
  dateFilter?: 'day' | 'week' | 'month' | 'year';
  safeSearch?: boolean;
}

// ============================================
// Web Search Service Class
// ============================================

class WebSearchServiceClass {
  // Multi-key support for Brave Search
  private readonly BRAVE_API_KEYS: string[] = [];
  private braveKeyIndex = 0;
  
  private readonly SERPAPI_KEY = process.env.SERPAPI_KEY || '';

  constructor() {
    // Load all Brave Search keys
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`BRAVE_SEARCH_KEY_${i}`];
      if (key && key.startsWith('BSA')) {
        this.BRAVE_API_KEYS.push(key);
      }
    }
    // Also support single key format
    const singleKey = process.env.BRAVE_SEARCH_KEY;
    if (singleKey && singleKey.startsWith('BSA') && !this.BRAVE_API_KEYS.includes(singleKey)) {
      this.BRAVE_API_KEYS.push(singleKey);
    }
    
    logger.info(`Web Search initialized with ${this.BRAVE_API_KEYS.length} Brave keys`);
  }

  /**
   * Get next available Brave API key (round-robin)
   */
  private getNextBraveKey(): string | null {
    if (this.BRAVE_API_KEYS.length === 0) return null;
    const key = this.BRAVE_API_KEYS[this.braveKeyIndex];
    this.braveKeyIndex = (this.braveKeyIndex + 1) % this.BRAVE_API_KEYS.length;
    return key;
  }
  
  // Indicators that suggest a query needs web search
  private readonly WEB_SEARCH_INDICATORS = [
    // Current events
    'today', 'yesterday', 'this week', 'this month', 'latest', 'recent',
    'current', 'now', 'breaking', 'news', 'update',
    
    // Explicit search requests
    'search for', 'look up', 'find information', 'what happened',
    'google', 'search', 'find out',
    
    // Questions about current state
    'who is the current', 'what is the latest', 'when did', 'where is',
    'how much is', 'what are the',
    
    // Real-time data
    'weather', 'stock price', 'exchange rate', 'score', 'results',
    'price of', 'cost of', 'value of',
    
    // Recent dates
    '2024', '2025', '2026', '2027',
    
    // Events and people
    'election', 'match', 'game', 'concert', 'event', 'release',
  ];

  /**
   * Check if a query needs web search
   */
  public needsWebSearch(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    
    // Check for explicit indicators
    const hasIndicator = this.WEB_SEARCH_INDICATORS.some(indicator => 
      lowerQuery.includes(indicator)
    );
    
    if (hasIndicator) {
      return true;
    }
    
    // Check for question patterns about current information
    const currentInfoPatterns = [
      /what is .+ (worth|price|cost)/i,
      /who (is|was) the .+ (president|ceo|leader|winner)/i,
      /when (is|was|will) .+ (released|happening|starting)/i,
      /how (many|much) .+ (now|today|currently)/i,
      /is .+ (open|closed|available|released)/i,
    ];
    
    return currentInfoPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Search the web and return results
   */
  public async search(
    query: string, 
    options: SearchOptions = {}
  ): Promise<WebSearchResponse> {
    const { numResults = 5, dateFilter, safeSearch = true } = options;
    
    try {
      // Try Brave Search first (best free tier: 2000/month per key)
      if (this.BRAVE_API_KEYS.length > 0) {
        return await this.searchWithBrave(query, numResults, dateFilter, safeSearch);
      }
      
      // Fallback to SerpAPI
      if (this.SERPAPI_KEY) {
        return await this.searchWithSerpAPI(query, numResults, dateFilter);
      }
      
      // Last resort: DuckDuckGo (no API key needed, but rate limited)
      return await this.searchWithDuckDuckGo(query, numResults);
      
    } catch (error) {
      logger.error('Web search failed:', error);
      
      // Return empty results instead of throwing
      return {
        query,
        results: [],
        timestamp: new Date(),
        provider: 'none',
      };
    }
  }

  /**
   * Search using Brave Search API with key rotation
   */
  private async searchWithBrave(
    query: string,
    numResults: number,
    dateFilter?: string,
    safeSearch?: boolean
  ): Promise<WebSearchResponse> {
    const apiKey = this.getNextBraveKey();
    if (!apiKey) {
      throw new Error('No Brave Search API keys available');
    }
    
    const url = 'https://api.search.brave.com/res/v1/web/search';
    
    const params: Record<string, string> = {
      q: query,
      count: numResults.toString(),
      safesearch: safeSearch ? 'moderate' : 'off',
    };
    
    if (dateFilter) {
      params.freshness = dateFilter;
    }
    
    try {
      const response = await axios.get(url, {
        params,
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
        timeout: 10000,
      });
      
      const results: SearchResult[] = (response.data.web?.results || []).map((r: any) => ({
        title: r.title || 'No title',
        url: r.url,
        snippet: r.description || r.snippet || '',
        publishedDate: r.age || r.published_date,
        source: this.extractDomain(r.url),
      }));
      
      logger.info('Brave search completed', { query, resultsCount: results.length });
      
      return {
        query,
        results,
        timestamp: new Date(),
        provider: 'brave',
      };
    } catch (error) {
      logger.error('Brave search failed:', error);
      throw error;
    }
  }

  /**
   * Search using SerpAPI
   */
  private async searchWithSerpAPI(
    query: string,
    numResults: number,
    dateFilter?: string
  ): Promise<WebSearchResponse> {
    const url = 'https://serpapi.com/search';
    
    const params: Record<string, string> = {
      q: query,
      api_key: this.SERPAPI_KEY,
      engine: 'google',
      num: numResults.toString(),
    };
    
    if (dateFilter) {
      const dateMap: Record<string, string> = {
        day: 'd',
        week: 'w',
        month: 'm',
        year: 'y',
      };
      params.tbs = `qdr:${dateMap[dateFilter] || 'm'}`;
    }
    
    try {
      const response = await axios.get(url, {
        params,
        timeout: 10000,
      });
      
      const results: SearchResult[] = (response.data.organic_results || []).map((r: any) => ({
        title: r.title || 'No title',
        url: r.link,
        snippet: r.snippet || '',
        publishedDate: r.date,
        source: this.extractDomain(r.link),
      }));
      
      logger.info('SerpAPI search completed', { query, resultsCount: results.length });
      
      return {
        query,
        results,
        timestamp: new Date(),
        provider: 'serpapi',
      };
    } catch (error) {
      logger.error('SerpAPI search failed:', error);
      throw error;
    }
  }

  /**
   * Search using DuckDuckGo (no API key required)
   */
  private async searchWithDuckDuckGo(
    query: string,
    numResults: number
  ): Promise<WebSearchResponse> {
    // DuckDuckGo instant answer API
    const url = 'https://api.duckduckgo.com/';
    
    try {
      const response = await axios.get(url, {
        params: {
          q: query,
          format: 'json',
          no_html: 1,
          skip_disambig: 1,
        },
        timeout: 10000,
      });
      
      const results: SearchResult[] = [];
      
      // Add abstract if available
      if (response.data.Abstract) {
        results.push({
          title: response.data.Heading || query,
          url: response.data.AbstractURL || '',
          snippet: response.data.Abstract,
          source: response.data.AbstractSource || 'DuckDuckGo',
        });
      }
      
      // Add related topics
      const relatedTopics = response.data.RelatedTopics || [];
      for (const topic of relatedTopics.slice(0, numResults - 1)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text,
            url: topic.FirstURL,
            snippet: topic.Text,
            source: this.extractDomain(topic.FirstURL),
          });
        }
      }
      
      logger.info('DuckDuckGo search completed', { query, resultsCount: results.length });
      
      return {
        query,
        results: results.slice(0, numResults),
        timestamp: new Date(),
        provider: 'duckduckgo',
      };
    } catch (error) {
      logger.error('DuckDuckGo search failed:', error);
      throw error;
    }
  }

  /**
   * Format search results for AI context injection
   */
  public formatForAI(searchResults: WebSearchResponse): string {
    if (searchResults.results.length === 0) {
      return '';
    }
    
    let context = '\n\n## 🔍 WEB SEARCH RESULTS\n\n';
    context += `**Query:** "${searchResults.query}"\n`;
    context += `**Searched at:** ${searchResults.timestamp.toISOString()}\n`;
    context += `**Source:** ${searchResults.provider}\n\n`;
    
    searchResults.results.forEach((result, index) => {
      context += `### [${index + 1}] ${result.title}\n`;
      context += `**Source:** ${result.source}\n`;
      if (result.publishedDate) {
        context += `**Date:** ${result.publishedDate}\n`;
      }
      context += `**URL:** ${result.url}\n`;
      context += `${result.snippet}\n\n`;
    });
    
    context += '---\n';
    context += '**IMPORTANT:** Use this information to answer the user\'s question. ';
    context += 'Cite sources using [1], [2], etc. when referencing specific information. ';
    context += 'If the search results don\'t contain relevant information, say so.\n';
    
    return context;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  /**
   * Check if web search is available
   */
  public isAvailable(): boolean {
    return !!(this.BRAVE_API_KEYS.length > 0 || this.SERPAPI_KEY);
  }

  /**
   * Get search provider info
   */
  public getProviderInfo(): { provider: string; available: boolean; keyCount?: number } {
    if (this.BRAVE_API_KEYS.length > 0) {
      return { provider: 'brave', available: true, keyCount: this.BRAVE_API_KEYS.length };
    }
    if (this.SERPAPI_KEY) {
      return { provider: 'serpapi', available: true };
    }
    return { provider: 'duckduckgo', available: true };
  }
}

// Export singleton instance
export const webSearch = new WebSearchServiceClass();
export default webSearch;
