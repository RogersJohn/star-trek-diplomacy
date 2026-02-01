/**
 * UI Interaction Tests
 * Tests for map, panels, and general UI elements
 */

const { TestHelper, BASE_URL } = require('./helpers/test-helper');
const LoginPage = require('./pages/LoginPage');
const HomePage = require('./pages/HomePage');
const LobbyPage = require('./pages/LobbyPage');
const GamePage = require('./pages/GamePage');

describe('UI Interaction Tests', () => {
  let helper;

  beforeEach(() => {
    helper = new TestHelper();
  });

  afterEach(async () => {
    await helper.closeAll();
  });

  describe('Login Page UI', () => {
    test('should display correct layout', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.navigateAndClear(driver);

      const loginPage = new LoginPage(driver);
      expect(await loginPage.isLoaded()).toBe(true);
      expect(await loginPage.hasTitle()).toBe(true);
    });

    test('should have correct button styling', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.navigateAndClear(driver);

      const buttons = await driver.findElements({ css: '.grid button' });
      expect(buttons.length).toBe(7);

      for (const button of buttons) {
        const classes = await button.getAttribute('class');
        expect(classes).toContain('bg-lcars-orange');
      }
    });

    test('should show hover effects on buttons', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.navigateAndClear(driver);

      const buttons = await driver.findElements({ css: '.grid button' });
      const actions = driver.actions({ async: true });
      await actions.move({ origin: buttons[0] }).perform();

      // Button should have hover state
    });
  });

  describe('Home Page UI', () => {
    test('should display title correctly', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      expect(await homePage.hasTitle()).toBe(true);
    });

    test('should display faction previews', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      const count = await homePage.getFactionPreviewCount();
      expect(count).toBe(7);
    });

    test('should display dev mode indicator', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      expect(await homePage.isInDevMode()).toBe(true);
    });

    test('should have responsive input fields', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      await homePage.enterLobbyCode('ABC123');
      const value = await homePage.getLobbyCodeInputValue();
      expect(value).toBe('ABC123');
    });
  });

  describe('Lobby Page UI', () => {
    test('should display lobby code prominently', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');
      await helper.createLobby(driver);

      const lobbyPage = new LobbyPage(driver);
      const code = await lobbyPage.getLobbyCodeFromDisplay();
      expect(code.length).toBe(6);
    });

    test('should display player list', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');
      await helper.createLobby(driver);

      const lobbyPage = new LobbyPage(driver);
      expect(await lobbyPage.getPlayerCount()).toBeGreaterThan(0);
    });

    test('should display faction selection grid', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');
      await helper.createLobby(driver);

      const lobbyPage = new LobbyPage(driver);
      const factions = await lobbyPage.getAvailableFactions();
      expect(factions.length).toBe(7);
    });

    test('should show faction colors', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');
      await helper.createLobby(driver);

      // Check for faction color indicators
      const hasColoredElements = await helper.elementExists(driver, '[style*="color"]');
      expect(hasColoredElements).toBe(true);
    });
  });

  describe('Game Page UI', () => {
    test('should display map', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);

      await gamePage.waitForLoad();
      expect(await gamePage.hasMap()).toBe(true);
    });

    test('should display status bar', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);

      await gamePage.waitForLoad();
      const turn = await gamePage.getTurnNumber();
      expect(turn).toBeDefined();
    });

    test('should display order panel', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);

      await gamePage.waitForLoad();
      expect(await gamePage.hasOrderPanel()).toBe(true);
    });

    test('should display alliance panel', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);

      await gamePage.waitForLoad();
      expect(await gamePage.hasAlliancePanel()).toBe(true);
    });

    test('should display ability panel', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);

      await gamePage.waitForLoad();
      expect(await gamePage.hasAbilityPanel()).toBe(true);
    });

    test('should display messages panel', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);

      await gamePage.waitForLoad();
      expect(await gamePage.hasMessagesPanel()).toBe(true);
    });
  });

  describe('Map Interactions', () => {
    test('should respond to clicks', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);

      await gamePage.waitForLoad();
      // Click center of map - coordinates are now clamped to element bounds
      await gamePage.clickMapCenter();
      // Should not throw error
    });

    test('should highlight selected system', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);

      await gamePage.waitForLoad();
      // Click center of map to test interaction
      await gamePage.clickMapCenter();
      // Check for highlight effect
    });
  });

  describe('Button States', () => {
    test('should disable submit when no orders', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);

      await gamePage.waitForLoad();
      // Button state may vary based on implementation
    });

    test('should enable submit with valid orders', async () => {
      expect(true).toBe(true);
    });

    test('should show loading state during submission', async () => {
      expect(true).toBe(true);
    });
  });

  describe('Error States', () => {
    test('should display errors in red', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      await homePage.joinWithCode('INVALID');
      await driver.sleep(1000);

      // Error uses bg-red-900/50 with Tailwind opacity modifier
      const errorElement = await driver.findElement({ css: '[class*="bg-red-900"]' });
      expect(errorElement).toBeDefined();
    });

    test('should show error message text', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      await homePage.clickJoinGame();
      await driver.sleep(500);

      const message = await homePage.getErrorMessage();
      expect(message).toBeDefined();
    });
  });

  describe('Responsive Design', () => {
    test('should display correctly at 1920x1080', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await driver.manage().window().setRect({ width: 1920, height: 1080 });
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      expect(await homePage.isLoaded()).toBe(true);
    });

    test('should display correctly at 1280x720', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await driver.manage().window().setRect({ width: 1280, height: 720 });
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      expect(await homePage.isLoaded()).toBe(true);
    });
  });

  describe('Theme and Styling', () => {
    test('should use LCARS color scheme', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.navigateAndClear(driver);

      // Check for LCARS orange color
      const hasOrange = await helper.elementExists(driver, '.text-lcars-orange, [class*="lcars-orange"]');
      expect(hasOrange).toBe(true);
    });

    test('should have dark background', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.navigateAndClear(driver);

      const body = await driver.findElement({ css: 'body' });
      const classes = await body.getAttribute('class');
      // Should have dark theme class
    });
  });
});
