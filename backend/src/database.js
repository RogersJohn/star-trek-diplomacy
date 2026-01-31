/**
 * STAR TREK DIPLOMACY - Database Layer
 *
 * SQLite database for persisting game state, supporting server restarts
 * and reconnection scenarios.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database file location
const DB_PATH = path.join(__dirname, '..', 'data', 'diplomacy.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize database schema
 */
function initializeDatabase() {
  console.log('Initializing database schema...');

  // Games table - stores active game state
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      game_id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      game_data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      winner TEXT
    )
  `);

  // Players table - tracks players in each game
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      faction TEXT NOT NULL,
      player_name TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE,
      UNIQUE(game_id, faction)
    )
  `);

  // Turns table - historical record of game turns
  db.exec(`
    CREATE TABLE IF NOT EXISTS turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      turn_number INTEGER NOT NULL,
      year INTEGER NOT NULL,
      season TEXT NOT NULL,
      phase TEXT NOT NULL,
      resolved_at INTEGER NOT NULL,
      turn_data TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE,
      UNIQUE(game_id, turn_number)
    )
  `);

  // Orders table - records all submitted orders
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      turn_number INTEGER NOT NULL,
      faction TEXT NOT NULL,
      order_type TEXT NOT NULL,
      order_data TEXT NOT NULL,
      submitted_at INTEGER NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
    )
  `);

  // Messages table - stores diplomatic messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      from_faction TEXT NOT NULL,
      to_faction TEXT,
      message TEXT NOT NULL,
      sent_at INTEGER NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
    )
  `);

  // Users table - tracks authenticated users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      username TEXT,
      created_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    )
  `);

  // User Games table - associates users with games for history tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      faction TEXT NOT NULL,
      result TEXT,
      ended_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE,
      UNIQUE(user_id, game_id)
    )
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
    CREATE INDEX IF NOT EXISTS idx_players_game ON players(game_id);
    CREATE INDEX IF NOT EXISTS idx_turns_game ON turns(game_id);
    CREATE INDEX IF NOT EXISTS idx_orders_game_turn ON orders(game_id, turn_number);
    CREATE INDEX IF NOT EXISTS idx_messages_game ON messages(game_id);
    CREATE INDEX IF NOT EXISTS idx_user_games_user ON user_games(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_games_game ON user_games(game_id);
  `);

  console.log('Database schema initialized successfully');
}

/**
 * Save game state to database
 */
function saveGame(gameId, gameData, playerFactions) {
  const now = Date.now();
  const gameDataJSON = JSON.stringify(gameData);

  const stmt = db.prepare(`
    INSERT INTO games (game_id, created_at, updated_at, game_data, status, winner)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(game_id) DO UPDATE SET
      updated_at = excluded.updated_at,
      game_data = excluded.game_data,
      status = excluded.status,
      winner = excluded.winner
  `);

  stmt.run(
    gameId,
    now,
    now,
    gameDataJSON,
    gameData.winner ? 'ended' : 'active',
    gameData.winner || null
  );

  // Save players if this is a new game
  const existingPlayers = db
    .prepare('SELECT COUNT(*) as count FROM players WHERE game_id = ?')
    .get(gameId);
  if (existingPlayers.count === 0) {
    const playerStmt = db.prepare(`
      INSERT INTO players (game_id, faction, player_name, joined_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const [faction, playerName] of Object.entries(playerFactions)) {
      playerStmt.run(gameId, faction, playerName, now);
    }
  }
}

/**
 * Load game state from database
 */
function loadGame(gameId) {
  const stmt = db.prepare('SELECT game_data FROM games WHERE game_id = ? AND status = ?');
  const row = stmt.get(gameId, 'active');

  if (!row) {
    return null;
  }

  return JSON.parse(row.game_data);
}

/**
 * Get all active games
 */
function getActiveGames() {
  const stmt = db.prepare(`
    SELECT 
      g.game_id,
      g.created_at,
      g.updated_at,
      g.game_data,
      json_group_array(
        json_object('faction', p.faction, 'playerName', p.player_name)
      ) as players
    FROM games g
    LEFT JOIN players p ON g.game_id = p.game_id
    WHERE g.status = 'active'
    GROUP BY g.game_id
  `);

  const rows = stmt.all();
  return rows.map(row => ({
    gameId: row.game_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    gameData: JSON.parse(row.game_data),
    players: JSON.parse(row.players),
  }));
}

/**
 * Save turn history
 */
function saveTurn(gameId, turnNumber, year, season, phase, turnData) {
  const stmt = db.prepare(`
    INSERT INTO turns (game_id, turn_number, year, season, phase, resolved_at, turn_data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(gameId, turnNumber, year, season, phase, Date.now(), JSON.stringify(turnData));
}

/**
 * Save order submission
 */
function saveOrder(gameId, turnNumber, faction, orderType, orderData) {
  const stmt = db.prepare(`
    INSERT INTO orders (game_id, turn_number, faction, order_type, order_data, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(gameId, turnNumber, faction, orderType, JSON.stringify(orderData), Date.now());
}

/**
 * Save diplomatic message
 */
function saveMessage(gameId, fromFaction, toFaction, message) {
  const stmt = db.prepare(`
    INSERT INTO messages (game_id, from_faction, to_faction, message, sent_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(gameId, fromFaction, toFaction || null, message, Date.now());
}

/**
 * Get messages for a game
 */
function getMessages(gameId) {
  const stmt = db.prepare(`
    SELECT from_faction, to_faction, message, sent_at
    FROM messages
    WHERE game_id = ?
    ORDER BY sent_at ASC
  `);

  return stmt.all(gameId);
}

/**
 * Mark game as ended
 */
function endGame(gameId, winner) {
  const stmt = db.prepare(`
    UPDATE games
    SET status = 'ended', winner = ?, updated_at = ?
    WHERE game_id = ?
  `);

  stmt.run(winner, Date.now(), gameId);
}

/**
 * Get game list with summary info
 */
function getGameList() {
  const stmt = db.prepare(`
    SELECT 
      g.game_id,
      g.created_at,
      g.updated_at,
      g.status,
      g.winner,
      json_extract(g.game_data, '$.turn') as turn,
      json_extract(g.game_data, '$.year') as year,
      json_extract(g.game_data, '$.season') as season,
      json_extract(g.game_data, '$.phase') as phase,
      json_group_array(
        json_object('faction', p.faction, 'playerName', p.player_name)
      ) as players
    FROM games g
    LEFT JOIN players p ON g.game_id = p.game_id
    GROUP BY g.game_id
    ORDER BY g.updated_at DESC
  `);

  const rows = stmt.all();
  return rows.map(row => ({
    gameId: row.game_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    winner: row.winner,
    turn: row.turn,
    year: row.year,
    season: row.season,
    phase: row.phase,
    players: JSON.parse(row.players),
  }));
}

/**
 * Delete old completed games (optional cleanup)
 */
function deleteOldGames(daysOld = 30) {
  const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const stmt = db.prepare(`
    DELETE FROM games
    WHERE status = 'ended' AND updated_at < ?
  `);

  const result = stmt.run(cutoffTime);
  return result.changes;
}
/**
 * Create or update user record
 */
function upsertUser(userId, username) {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO users (user_id, username, created_at, last_seen)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      username = excluded.username,
      last_seen = excluded.last_seen
  `);

  stmt.run(userId, username, now, now);
}

/**
 * Associate user with a game
 */
function createUserGame(userId, gameId, faction) {
  const stmt = db.prepare(`
    INSERT INTO user_games (user_id, game_id, faction, result, ended_at)
    VALUES (?, ?, ?, NULL, NULL)
    ON CONFLICT(user_id, game_id) DO NOTHING
  `);

  stmt.run(userId, gameId, faction);
}

/**
 * Record game result for user
 */
function recordGameResult(userId, gameId, result) {
  const stmt = db.prepare(`
    UPDATE user_games
    SET result = ?, ended_at = ?
    WHERE user_id = ? AND game_id = ?
  `);

  stmt.run(result, Date.now(), userId, gameId);
}

/**
 * Get user's game history
 */
function getUserGameHistory(userId, limit = 10) {
  const stmt = db.prepare(`
    SELECT 
      ug.game_id,
      ug.faction,
      ug.result,
      ug.ended_at,
      g.status,
      json_extract(g.game_data, '$.turn') as final_turn
    FROM user_games ug
    JOIN games g ON ug.game_id = g.game_id
    WHERE ug.user_id = ?
    ORDER BY COALESCE(ug.ended_at, g.updated_at) DESC
    LIMIT ?
  `);

  return stmt.all(userId, limit);
}

/**
 * Get user stats (win rate, total games, etc.)
 */
function getUserStats(userId) {
  const stmt = db.prepare(`
    SELECT 
      COUNT(*) as total_games,
      SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws
    FROM user_games
    WHERE user_id = ? AND result IS NOT NULL
  `);

  const stats = stmt.get(userId);
  
  return {
    totalGames: stats.total_games || 0,
    wins: stats.wins || 0,
    losses: stats.losses || 0,
    draws: stats.draws || 0,
    winRate: stats.total_games > 0 ? (stats.wins / stats.total_games) * 100 : 0,
  };
}
// Initialize on module load
initializeDatabase();

module.exports = {
  db,
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
};
