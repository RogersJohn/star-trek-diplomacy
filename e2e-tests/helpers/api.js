/**
 * API helper for test setup and teardown
 */

const http = require('http');
const https = require('https');

/**
 * Make an HTTP request
 * @param {string} url
 * @param {Object} options
 * @returns {Promise<{status: number, data: any}>}
 */
async function request(url, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  const urlObj = new URL(url);
  const isHttps = urlObj.protocol === 'https:';
  const lib = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: data ? JSON.parse(data) : null,
            });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Get test players from the API
 * @returns {Promise<Array>}
 */
async function getTestPlayers() {
  const apiUrl = global.testConfig?.apiUrl || 'http://localhost:3000';
  const { data } = await request(`${apiUrl}/api/test/players`);
  return data.players;
}

/**
 * Create a test game with all 7 factions
 * @returns {Promise<{gameId: string, players: Array}>}
 */
async function createTestGame() {
  const apiUrl = global.testConfig?.apiUrl || 'http://localhost:3000';
  const { data, status } = await request(`${apiUrl}/api/test/create-game`, {
    method: 'POST',
  });

  if (status !== 200) {
    throw new Error(`Failed to create test game: ${JSON.stringify(data)}`);
  }

  return {
    gameId: data.gameId,
    players: data.players,
    gameState: data.gameState,
  };
}

/**
 * Get game state
 * @param {string} gameId
 * @returns {Promise<Object>}
 */
async function getGameState(gameId) {
  const apiUrl = global.testConfig?.apiUrl || 'http://localhost:3000';
  const { data } = await request(`${apiUrl}/api/test/game/${gameId}`);
  return data;
}

/**
 * Submit orders for a faction
 * @param {string} gameId
 * @param {string} faction
 * @param {Array} orders
 * @returns {Promise<Object>}
 */
async function submitOrders(gameId, faction, orders) {
  const apiUrl = global.testConfig?.apiUrl || 'http://localhost:3000';
  const { data, status } = await request(
    `${apiUrl}/api/test/game/${gameId}/orders`,
    {
      method: 'POST',
      body: { faction, orders },
    }
  );

  if (status !== 200) {
    throw new Error(`Failed to submit orders: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Resolve turn (process all orders)
 * @param {string} gameId
 * @returns {Promise<Object>}
 */
async function resolveTurn(gameId) {
  const apiUrl = global.testConfig?.apiUrl || 'http://localhost:3000';
  const { data, status } = await request(
    `${apiUrl}/api/test/game/${gameId}/resolve`,
    {
      method: 'POST',
    }
  );

  if (status !== 200) {
    throw new Error(`Failed to resolve turn: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Delete all test games
 * @returns {Promise<Object>}
 */
async function cleanupTestGames() {
  const apiUrl = global.testConfig?.apiUrl || 'http://localhost:3000';
  const { data } = await request(`${apiUrl}/api/test/games`, {
    method: 'DELETE',
  });
  return data;
}

/**
 * Wait for backend to be ready
 * @param {number} maxAttempts
 * @param {number} delayMs
 */
async function waitForBackend(maxAttempts = 30, delayMs = 1000) {
  const apiUrl = global.testConfig?.apiUrl || 'http://localhost:3000';

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { status } = await request(`${apiUrl}/health`);
      if (status === 200) {
        console.log('Backend is ready');
        return;
      }
    } catch (error) {
      // Continue waiting
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Backend did not become ready in time');
}

/**
 * Auto-submit hold orders for all factions except one, then auto-resolve if all in
 * @param {string} gameId
 * @param {string} [exceptFaction] - faction to skip (already submitted manually)
 * @returns {Promise<Object>}
 */
async function autoSubmitOrders(gameId, exceptFaction) {
  const apiUrl = global.testConfig?.apiUrl || 'http://localhost:3000';
  const { data, status } = await request(
    `${apiUrl}/api/test/game/${gameId}/auto-orders`,
    {
      method: 'POST',
      body: { exceptFaction },
    }
  );

  if (status !== 200) {
    throw new Error(`Failed to auto-submit orders: ${JSON.stringify(data)}`);
  }

  return data;
}

module.exports = {
  request,
  getTestPlayers,
  createTestGame,
  getGameState,
  submitOrders,
  resolveTurn,
  autoSubmitOrders,
  cleanupTestGames,
  waitForBackend,
};
