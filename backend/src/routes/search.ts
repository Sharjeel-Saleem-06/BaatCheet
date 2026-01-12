/**
 * Web Search Routes
 * Provides real-time web search capabilities
 * 
 * @module SearchRoutes
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { webSearch } from '../services/WebSearchService.js';
import { clerkAuth } from '../middleware/clerkAuth.js';
import { searchRateLimiter } from '../middleware/advancedRateLimit.js';

const router = Router();

// Apply authentication
router.use(clerkAuth);

// Apply rate limiting
router.use(searchRateLimiter);

/**
 * POST /search
 * Perform a web search
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { query, numResults, dateFilter, safeSearch } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    if (query.length > 500) {
      return res.status(400).json({ error: 'Query too long (max 500 characters)' });
    }
    
    logger.info('Web search requested', {
      userId: req.user?.id,
      query: query.substring(0, 100),
    });
    
    const results = await webSearch.search(query, {
      numResults: Math.min(numResults || 5, 10),
      dateFilter,
      safeSearch: safeSearch !== false,
    });
    
    res.json({
      success: true,
      data: results,
    });
    
  } catch (error) {
    logger.error('Web search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /search/status
 * Check web search service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const providerInfo = webSearch.getProviderInfo();
    
    res.json({
      success: true,
      data: {
        available: providerInfo.available,
        provider: providerInfo.provider,
        features: {
          dateFiltering: true,
          safeSearch: true,
          maxResults: 10,
        },
      },
    });
    
  } catch (error) {
    logger.error('Failed to get search status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

/**
 * POST /search/check
 * Check if a query needs web search
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const needsSearch = webSearch.needsWebSearch(query);
    
    res.json({
      success: true,
      data: {
        query,
        needsWebSearch: needsSearch,
        reason: needsSearch 
          ? 'Query contains indicators for current/real-time information'
          : 'Query can be answered from general knowledge',
      },
    });
    
  } catch (error) {
    logger.error('Search check failed:', error);
    res.status(500).json({ error: 'Check failed' });
  }
});

export default router;
