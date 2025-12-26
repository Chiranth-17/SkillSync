// controllers/recommendationController.js

const { recommendSkillsForUser } = require('../ml/skillRecommender');
const { recommendMentors } = require('../ml/mentorRecommender');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Controller:Recommendations');

/**
 * Get skill recommendations for a user.
 * 
 * Route: GET /ml/recommendations/skills
 * Query params:
 *   - userId: Optional user ID (if not authenticated)
 *   - limit: Number of recommendations (default 10, max 50)
 *   - skipCache: Force recomputation (default false)
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
async function getSkillRecommendations(req, res, next) {
  try {
    // Determine user ID: prefer authenticated user, fallback to query param
    let userId = null;
    
    if (req.user && req.user.id) {
      userId = req.user.id;
    } else if (req.query.userId) {
      userId = req.query.userId;
      logger.info('Using userId from query param (unauthenticated request)');
    } else {
      return res.status(400).json({
        success: false,
        message: 'User ID required: either authenticate or provide userId query parameter'
      });
    }

    // Parse and validate limit
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = isNaN(rawLimit) ? 10 : Math.min(Math.max(1, rawLimit), 50);

    // Parse skipCache flag
    const skipCache = req.query.skipCache === 'true';

    logger.debug('Getting recommendations for user', userId, 'limit:', limit);

    // Call ML recommender
    const recommendations = await recommendSkillsForUser({
      userId,
      limit,
      skipCache
    });

    // Check if ML is disabled via environment variable
    const mlEnabled = process.env.ML_SKILL_RECOMMENDATION_ENABLED !== 'false';

    // Return consistent response shape
    return res.status(200).json({
      success: true,
      userId: recommendations.userId,
      items: recommendations.items,
      meta: {
        limit,
        count: recommendations.items.length,
        mlEnabled,
        fallback: recommendations.items.length > 0 ? recommendations.items[0].fallback : false
      }
    });

  } catch (error) {
    logger.error('Error in getSkillRecommendations:', error.message);
    
    // Return graceful error with empty recommendations
    return res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      items: []
    });
  }
}

/**
 * Get recommendation system statistics.
 * Admin-only endpoint for monitoring.
 * 
 * Route: GET /ml/recommendations/stats
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
async function getRecommendationStats(req, res, next) {
  try {
    const { getStats } = require('../ml/skillRecommender');
    const stats = getStats();

    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error in getRecommendationStats:', error.message);
    next(error);
  }
}

/**
 * Clear recommendation caches.
 * Admin-only endpoint for cache management.
 * 
 * Route: POST /ml/recommendations/clear-cache
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
async function clearRecommendationCache(req, res, next) {
  try {
    const { clearAllCaches } = require('../ml/skillRecommender');
    const result = await clearAllCaches();

    logger.info('Recommendation caches cleared:', result);

    return res.status(200).json({
      success: true,
      message: 'Caches cleared successfully',
      result
    });
  } catch (error) {
    logger.error('Error in clearRecommendationCache:', error.message);
    next(error);
  }
}

/**
 * Get mentor recommendations for a user and specific skills.
 * 
 * Route: GET /ml/recommendations/mentors
 * Query params:
 *   - userId: Optional user ID (if not authenticated)
 *   - skillIds: Comma-separated skill IDs (required)
 *   - limit: Number of recommendations (default 10, max 50)
 *   - skipCache: Force recomputation (default false)
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
async function getMentorRecommendations(req, res, next) {
  try {
    // Determine user ID
    let userId = null;
    
    if (req.user && req.user.id) {
      userId = req.user.id;
    } else if (req.query.userId) {
      userId = req.query.userId;
      logger.info('Using userId from query param (unauthenticated request)');
    } else {
      return res.status(400).json({
        success: false,
        message: 'User ID required: either authenticate or provide userId query parameter'
      });
    }

    // Parse skillIds (comma-separated)
    const skillIdsParam = req.query.skillIds || req.query.skillId || '';
    const skillIds = skillIdsParam
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (skillIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one skillId is required (provide as comma-separated list)'
      });
    }

    // Parse and validate limit
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = isNaN(rawLimit) ? 10 : Math.min(Math.max(1, rawLimit), 50);

    // Parse skipCache flag
    const skipCache = req.query.skipCache === 'true';

    logger.debug('Getting mentor recommendations for user', userId, 'skills:', skillIds, 'limit:', limit);

    // Call ML recommender
    const recommendations = await recommendMentors({
      userId,
      skillIds,
      limit,
      skipCache
    });

    // Check if ML is disabled
    const mlEnabled = process.env.ML_MENTOR_RECOMMENDATION_ENABLED !== 'false';

    // Return consistent response shape
    return res.status(200).json({
      success: true,
      userId: recommendations.userId,
      skillIds: recommendations.skillIds,
      items: recommendations.items,
      meta: {
        limit,
        count: recommendations.items.length,
        mlEnabled,
        fallback: recommendations.items.length > 0 ? recommendations.items[0].fallback : false
      }
    });

  } catch (error) {
    logger.error('Error in getMentorRecommendations:', error.message);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to generate mentor recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      items: []
    });
  }
}

module.exports = {
  getSkillRecommendations,
  getMentorRecommendations,
  getRecommendationStats,
  clearRecommendationCache
};
