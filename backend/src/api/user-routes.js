/**
 * STAR TREK DIPLOMACY - User Profile API Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth, getUserInfo } = require('../middleware/auth');
const { getUserGameHistory, getUserStats, upsertUser } = require('../database');

// Get user profile and stats
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    
    if (!userInfo) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const stats = getUserStats(userInfo.userId);
    const history = getUserGameHistory(userInfo.userId, 20);

    res.json({
      success: true,
      profile: {
        userId: userInfo.userId,
        stats,
        recentGames: history,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get specific user stats (public)
router.get('/:userId/stats', async (req, res) => {
  try {
    const stats = getUserStats(req.params.userId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
