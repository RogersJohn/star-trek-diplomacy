/**
 * STAR TREK DIPLOMACY - Database Layer
 *
 * PostgreSQL database for persisting game state, supporting server restarts
 * and reconnection scenarios.
 */

const { Pool } = require('pg');

// Connection pool - uses DATABASE_URL from environment (Railway provides this)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

/**
 * Initialize database schema
 */
async function initializeDatabase() {
  console.log('Initializing database schema...');

  const client = await pool.connect();
  try {
    // Games table - stores active game state
    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        game_id TEXT PRIMARY KEY,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        game_data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        winner TEXT
      )
    `);

    // Players table - tracks players in each game
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
        faction TEXT NOT NULL,
        player_name TEXT NOT NULL,
        joined_at BIGINT NOT NULL,
        UNIQUE(game_id, faction)
      )
    `);

    // Turns table - historical record of game turns
    await client.query(`
      CREATE TABLE IF NOT EXISTS turns (
        id SERIAL PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
        turn_number INTEGER NOT NULL,
        year INTEGER NOT NULL,
        season TEXT NOT NULL,
        phase TEXT NOT NULL,
        resolved_at BIGINT NOT NULL,
        turn_data TEXT NOT NULL,
        UNIQUE(game_id, turn_number)
      )
    `);

    // Orders table - records all submitted orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
        turn_number INTEGER NOT NULL,
        faction TEXT NOT NULL,
        order_type TEXT NOT NULL,
        order_data TEXT NOT NULL,
        submitted_at BIGINT NOT NULL
      )
    `);

    // Messages table - stores diplomatic messages
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
        from_faction TEXT NOT NULL,
        to_faction TEXT,
        message TEXT NOT NULL,
        sent_at BIGINT NOT NULL
      )
    `);

    // Users table - tracks authenticated users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        username TEXT,
        created_at BIGINT NOT NULL,
        last_seen BIGINT NOT NULL
      )
    `);

    // User Games table - associates users with games for history tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_games (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        game_id TEXT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
        faction TEXT NOT NULL,
        result TEXT,
        ended_at BIGINT,
        UNIQUE(user_id, game_id)
      )
    `);

    // Game Players table - authoritative record of which user controls which faction
    // This is used for authorization checks on every game action
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_players (
        id SERIAL PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        faction TEXT NOT NULL,
        joined_at BIGINT NOT NULL,
        UNIQUE(game_id, user_id),
        UNIQUE(game_id, faction)
      )
    `);

    // Create indexes for common queries
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_players_game ON players(game_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_turns_game ON turns(game_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_game_turn ON orders(game_id, turn_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_game ON messages(game_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_games_user ON user_games(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_games_game ON user_games(game_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_game_players_user ON game_players(user_id)`);

    console.log('Database schema initialized successfully');
  } finally {
    client.release();
  }
}

/**
 * Save game state to database
 */
async function saveGame(gameId, gameData, playerFactions) {
  const now = Date.now();
  const gameDataJSON = JSON.stringify(gameData);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO games (game_id, created_at, updated_at, game_data, status, winner)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(game_id) DO UPDATE SET
         updated_at = EXCLUDED.updated_at,
         game_data = EXCLUDED.game_data,
         status = EXCLUDED.status,
         winner = EXCLUDED.winner`,
      [
        gameId,
        now,
        now,
        gameDataJSON,
        gameData.winner ? 'ended' : 'active',
        gameData.winner || null,
      ]
    );

    // Save players if this is a new game
    const existingPlayers = await client.query(
      'SELECT COUNT(*) as count FROM players WHERE game_id = $1',
      [gameId]
    );

    if (parseInt(existingPlayers.rows[0].count) === 0) {
      for (const [faction, playerName] of Object.entries(playerFactions)) {
        await client.query(
          `INSERT INTO players (game_id, faction, player_name, joined_at)
           VALUES ($1, $2, $3, $4)`,
          [gameId, faction, playerName, now]
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Load game state from database
 */
async function loadGame(gameId) {
  const result = await pool.query(
    'SELECT game_data FROM games WHERE game_id = $1 AND status = $2',
    [gameId, 'active']
  );

  if (result.rows.length === 0) {
    return null;
  }

  return JSON.parse(result.rows[0].game_data);
}

/**
 * Get all active games
 */
async function getActiveGames() {
  const result = await pool.query(`
    SELECT
      g.game_id,
      g.created_at,
      g.updated_at,
      g.game_data,
      COALESCE(
        json_agg(
          json_build_object('faction', p.faction, 'playerName', p.player_name)
        ) FILTER (WHERE p.faction IS NOT NULL),
        '[]'
      ) as players
    FROM games g
    LEFT JOIN players p ON g.game_id = p.game_id
    WHERE g.status = 'active'
    GROUP BY g.game_id
  `);

  return result.rows.map(row => ({
    gameId: row.game_id,
    createdAt: parseInt(row.created_at),
    updatedAt: parseInt(row.updated_at),
    gameData: JSON.parse(row.game_data),
    players: row.players,
  }));
}

/**
 * Save turn history
 */
async function saveTurn(gameId, turnNumber, year, season, phase, turnData) {
  await pool.query(
    `INSERT INTO turns (game_id, turn_number, year, season, phase, resolved_at, turn_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [gameId, turnNumber, year, season, phase, Date.now(), JSON.stringify(turnData)]
  );
}

/**
 * Save order submission
 */
async function saveOrder(gameId, turnNumber, faction, orderType, orderData) {
  await pool.query(
    `INSERT INTO orders (game_id, turn_number, faction, order_type, order_data, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [gameId, turnNumber, faction, orderType, JSON.stringify(orderData), Date.now()]
  );
}

/**
 * Save diplomatic message
 */
async function saveMessage(gameId, fromFaction, toFaction, message) {
  await pool.query(
    `INSERT INTO messages (game_id, from_faction, to_faction, message, sent_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [gameId, fromFaction, toFaction || null, message, Date.now()]
  );
}

/**
 * Get messages for a game
 */
async function getMessages(gameId) {
  const result = await pool.query(
    `SELECT from_faction, to_faction, message, sent_at
     FROM messages
     WHERE game_id = $1
     ORDER BY sent_at ASC`,
    [gameId]
  );

  return result.rows.map(row => ({
    from_faction: row.from_faction,
    to_faction: row.to_faction,
    message: row.message,
    sent_at: parseInt(row.sent_at),
  }));
}

/**
 * Mark game as ended
 */
async function endGame(gameId, winner) {
  await pool.query(
    `UPDATE games
     SET status = 'ended', winner = $1, updated_at = $2
     WHERE game_id = $3`,
    [winner, Date.now(), gameId]
  );
}

/**
 * Get game list with summary info
 */
async function getGameList() {
  const result = await pool.query(`
    SELECT
      g.game_id,
      g.created_at,
      g.updated_at,
      g.status,
      g.winner,
      g.game_data::json->>'turn' as turn,
      g.game_data::json->>'year' as year,
      g.game_data::json->>'season' as season,
      g.game_data::json->>'phase' as phase,
      COALESCE(
        json_agg(
          json_build_object('faction', p.faction, 'playerName', p.player_name)
        ) FILTER (WHERE p.faction IS NOT NULL),
        '[]'
      ) as players
    FROM games g
    LEFT JOIN players p ON g.game_id = p.game_id
    GROUP BY g.game_id
    ORDER BY g.updated_at DESC
  `);

  return result.rows.map(row => ({
    gameId: row.game_id,
    createdAt: parseInt(row.created_at),
    updatedAt: parseInt(row.updated_at),
    status: row.status,
    winner: row.winner,
    turn: row.turn ? parseInt(row.turn) : null,
    year: row.year ? parseInt(row.year) : null,
    season: row.season,
    phase: row.phase,
    players: row.players,
  }));
}

/**
 * Delete old completed games (optional cleanup)
 */
async function deleteOldGames(daysOld = 30) {
  const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const result = await pool.query(
    `DELETE FROM games
     WHERE status = 'ended' AND updated_at < $1`,
    [cutoffTime]
  );

  return result.rowCount;
}

/**
 * Create or update user record
 */
async function upsertUser(userId, username) {
  const now = Date.now();
  await pool.query(
    `INSERT INTO users (user_id, username, created_at, last_seen)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(user_id) DO UPDATE SET
       username = EXCLUDED.username,
       last_seen = EXCLUDED.last_seen`,
    [userId, username, now, now]
  );
}

/**
 * Associate user with a game
 */
async function createUserGame(userId, gameId, faction) {
  await pool.query(
    `INSERT INTO user_games (user_id, game_id, faction, result, ended_at)
     VALUES ($1, $2, $3, NULL, NULL)
     ON CONFLICT(user_id, game_id) DO NOTHING`,
    [userId, gameId, faction]
  );
}

/**
 * Record game result for user
 */
async function recordGameResult(userId, gameId, result) {
  await pool.query(
    `UPDATE user_games
     SET result = $1, ended_at = $2
     WHERE user_id = $3 AND game_id = $4`,
    [result, Date.now(), userId, gameId]
  );
}

/**
 * Get user's game history
 */
async function getUserGameHistory(userId, limit = 10) {
  const result = await pool.query(
    `SELECT
      ug.game_id,
      ug.faction,
      ug.result,
      ug.ended_at,
      g.status,
      g.game_data::json->>'turn' as final_turn
    FROM user_games ug
    JOIN games g ON ug.game_id = g.game_id
    WHERE ug.user_id = $1
    ORDER BY COALESCE(ug.ended_at, g.updated_at) DESC
    LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map(row => ({
    game_id: row.game_id,
    faction: row.faction,
    result: row.result,
    ended_at: row.ended_at ? parseInt(row.ended_at) : null,
    status: row.status,
    final_turn: row.final_turn ? parseInt(row.final_turn) : null,
  }));
}

/**
 * Get user stats (win rate, total games, etc.)
 */
async function getUserStats(userId) {
  const result = await pool.query(
    `SELECT
      COUNT(*) as total_games,
      SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws
    FROM user_games
    WHERE user_id = $1 AND result IS NOT NULL`,
    [userId]
  );

  const stats = result.rows[0];
  const totalGames = parseInt(stats.total_games) || 0;
  const wins = parseInt(stats.wins) || 0;
  const losses = parseInt(stats.losses) || 0;
  const draws = parseInt(stats.draws) || 0;

  return {
    totalGames,
    wins,
    losses,
    draws,
    winRate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
  };
}

/**
 * Close database pool (for graceful shutdown)
 */
async function closeDatabase() {
  await pool.end();
  console.log('Database connection pool closed');
}

/**
 * Add a player to a game (for authorization)
 */
async function createGamePlayer(gameId, userId, faction) {
  await pool.query(
    `INSERT INTO game_players (game_id, user_id, faction, joined_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(game_id, user_id) DO NOTHING`,
    [gameId, userId, faction, Date.now()]
  );
}

/**
 * Get the faction a user controls in a specific game
 * Returns null if user is not a player in this game
 */
async function getUserFactionInGame(gameId, userId) {
  const result = await pool.query(
    'SELECT faction FROM game_players WHERE game_id = $1 AND user_id = $2',
    [gameId, userId]
  );
  return result.rows.length > 0 ? result.rows[0].faction : null;
}

/**
 * Get all players in a game (for reconnection)
 */
async function getGamePlayers(gameId) {
  const result = await pool.query(
    'SELECT user_id, faction FROM game_players WHERE game_id = $1',
    [gameId]
  );
  return result.rows;
}

module.exports = {
  pool,
  initializeDatabase,
  saveGame,
  loadGame,
  getActiveGames,
  saveTurn,
  saveOrder,
  saveMessage,
  getMessages,
  endGame,
  getGameList,
  deleteOldGames,
  upsertUser,
  createUserGame,
  recordGameResult,
  getUserGameHistory,
  getUserStats,
  closeDatabase,
  createGamePlayer,
  getUserFactionInGame,
  getGamePlayers,
};
