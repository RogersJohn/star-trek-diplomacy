/**
 * STAR TREK DIPLOMACY - Game Authorization Middleware
 *
 * Verifies that authenticated users have permission to perform
 * actions on behalf of specific factions in games.
 */

const { getUserFactionInGame } = require('../database');

/**
 * Middleware that verifies the authenticated user owns the faction
 * specified in the request body.
 *
 * Requires: req.auth.userId (from Clerk middleware)
 * Requires: req.body.faction (from request)
 * Sets: req.verifiedFaction (the validated faction)
 */
const requireFactionOwnership = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const userId = req.auth?.userId;
    const { faction } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!faction) {
      return res.status(400).json({ error: 'Faction required in request body' });
    }

    // Query the database to verify this user owns this faction in this game
    const userFaction = await getUserFactionInGame(gameId, userId);

    if (!userFaction) {
      return res.status(403).json({ error: 'You are not a player in this game' });
    }

    if (userFaction !== faction) {
      return res.status(403).json({
        error: 'You do not control this faction',
        yourFaction: userFaction,
      });
    }

    // Attach verified faction to request for downstream use
    req.verifiedFaction = faction;
    next();
  } catch (error) {
    console.error('Game auth error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * Middleware that gets the user's faction in a game (optional - doesn't reject)
 * Useful for endpoints that need to know the user's faction but don't require it
 */
const attachUserFaction = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const userId = req.auth?.userId;

    if (userId && gameId) {
      const userFaction = await getUserFactionInGame(gameId, userId);
      req.userFaction = userFaction;
    }

    next();
  } catch (error) {
    console.error('Attach faction error:', error);
    next(); // Don't fail, just continue without faction
  }
};

module.exports = {
  requireFactionOwnership,
  attachUserFaction,
};
