/**
 * STAR TREK DIPLOMACY - Authentication Middleware
 *
 * Verifies Clerk JWT tokens and attaches user info to requests
 */

const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

/**
 * Middleware to require authentication
 * Attaches req.auth with userId and other claims
 */
const requireAuth = ClerkExpressRequireAuth({
  onError: (error) => {
    console.error('Authentication error:', error);
  },
});

/**
 * Optional auth middleware - doesn't reject unauthenticated requests
 * Useful for endpoints that work with or without auth
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.auth = null;
    return next();
  }

  // If token present, verify it
  requireAuth(req, res, next);
};

/**
 * Extract user info from authenticated request
 */
const getUserInfo = (req) => {
  if (!req.auth) {
    return null;
  }

  return {
    userId: req.auth.userId,
    sessionId: req.auth.sessionId,
  };
};

module.exports = {
  requireAuth,
  optionalAuth,
  getUserInfo,
};
