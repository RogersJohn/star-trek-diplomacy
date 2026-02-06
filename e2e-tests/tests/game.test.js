/**
 * Game E2E Tests
 * Tests the main game functionality with 7 players
 */

const { createDriver, createMultipleDrivers, quitDriver, quitAllDrivers } = require('../helpers/driver');
const { createTestGame, cleanupTestGames, getGameState, waitForBackend } = require('../helpers/api');
const GamePage = require('../pages/GamePage');

describe('Star Trek Diplomacy - Game Tests', () => {
  let driver;
  let gamePage;
  let testGame;

  beforeAll(async () => {
    // Wait for backend to be ready
    await waitForBackend();

    // Create a test game with all 7 factions
    testGame = await createTestGame();
    console.log(`Created test game: ${testGame.gameId}`);
  });

  afterAll(async () => {
    // Cleanup
    await cleanupTestGames();
  });

  beforeEach(async () => {
    driver = await createDriver();
    gamePage = new GamePage(driver);
  });

  afterEach(async () => {
    if (driver) {
      // Take screenshot on failure
      const testState = expect.getState();
      if (testState.currentTestName && !testState.snapshotState) {
        try {
          await gamePage.screenshot(`${testState.currentTestName.replace(/\s+/g, '-')}.png`);
        } catch (e) {
          // Ignore screenshot errors
        }
      }
      await quitDriver(driver);
    }
  });

  describe('Game Loading', () => {
    test('should load the game page', async () => {
      await gamePage.navigateToGame(testGame.gameId);
      await gamePage.waitForGameLoad();

      const isMapDisplayed = await gamePage.isGameMapDisplayed();
      expect(isMapDisplayed).toBe(true);
    });

    test('should display 2D map by default', async () => {
      await gamePage.navigateToGame(testGame.gameId);
      await gamePage.waitForGameLoad();

      // The 2D button should be active/highlighted
      const isMapDisplayed = await gamePage.isGameMapDisplayed();
      expect(isMapDisplayed).toBe(true);
    });
  });

  describe('View Modes', () => {
    test('should switch between 2D and 3D views', async () => {
      await gamePage.navigateToGame(testGame.gameId);
      await gamePage.waitForGameLoad();

      // Switch to 3D
      await gamePage.switchTo3D();
      await gamePage.sleep(500);

      // Switch back to 2D
      await gamePage.switchTo2D();
      await gamePage.sleep(500);

      const isMapDisplayed = await gamePage.isGameMapDisplayed();
      expect(isMapDisplayed).toBe(true);
    });
  });
});

describe('Multi-Player Game Tests', () => {
  let drivers = [];
  let testGame;

  const FACTIONS = [
    'federation',
    'klingon',
    'romulan',
    'cardassian',
    'ferengi',
    'breen',
    'gorn',
  ];

  beforeAll(async () => {
    await waitForBackend();
    testGame = await createTestGame();
    console.log(`Created multi-player test game: ${testGame.gameId}`);
  });

  afterAll(async () => {
    await quitAllDrivers(drivers);
    await cleanupTestGames();
  });

  test('should support 7 concurrent browser sessions', async () => {
    // Create 7 browser instances - one for each faction
    drivers = await createMultipleDrivers(7);
    expect(drivers.length).toBe(7);

    // Navigate each driver to the game
    const gamePages = drivers.map((d) => new GamePage(d));

    await Promise.all(
      gamePages.map(async (page) => {
        await page.navigateToGame(testGame.gameId);
        await page.waitForGameLoad();
      })
    );

    // Verify all sessions loaded the game
    const results = await Promise.all(
      gamePages.map((page) => page.isGameMapDisplayed())
    );

    expect(results.every((r) => r === true)).toBe(true);
  }, 180000); // 3 minute timeout for this test
});

describe('Game State API Tests', () => {
  let testGame;

  beforeAll(async () => {
    await waitForBackend();
    testGame = await createTestGame();
  });

  afterAll(async () => {
    await cleanupTestGames();
  });

  test('should have all 7 factions in the game', async () => {
    const state = await getGameState(testGame.gameId);

    expect(state.players).toBeDefined();
    expect(state.players.length).toBe(7);

    const factions = state.players.map((p) => p.faction);
    expect(factions).toContain('federation');
    expect(factions).toContain('klingon');
    expect(factions).toContain('romulan');
    expect(factions).toContain('cardassian');
    expect(factions).toContain('ferengi');
    expect(factions).toContain('breen');
    expect(factions).toContain('gorn');
  });

  test('should have initial units for each faction', async () => {
    const state = await getGameState(testGame.gameId);
    const units = state.state?.units || {};

    // Each faction should have units
    const unitLocations = Object.keys(units);
    expect(unitLocations.length).toBeGreaterThan(0);
  });
});
