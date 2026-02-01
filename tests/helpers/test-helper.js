/**
 * Test Helper - Common utilities for Selenium tests
 *
 * Environment variables:
 *   BASE_URL     - Frontend URL (default: http://localhost:5173)
 *   API_URL      - Backend API URL (default: http://localhost:3001)
 *   HEADLESS     - Run Chrome in headless mode (default: false)
 *   SELENIUM_HOST - Remote Selenium server (optional, for Docker)
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const os = require('os');
const path = require('path');

// Configuration from environment variables
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3001';
const HEADLESS = process.env.HEADLESS === 'true' || process.env.HEADLESS === '1';
const SELENIUM_HOST = process.env.SELENIUM_HOST || null;

const PLAYERS = {
  PLAYER1: { id: 'dev_player1', name: 'Player1', index: 0 },
  PLAYER2: { id: 'dev_player2', name: 'Player2', index: 1 },
  PLAYER3: { id: 'dev_player3', name: 'Player3', index: 2 },
  PLAYER4: { id: 'dev_player4', name: 'Player4', index: 3 },
  PLAYER5: { id: 'dev_player5', name: 'Player5', index: 4 },
  PLAYER6: { id: 'dev_player6', name: 'Player6', index: 5 },
  PLAYER7: { id: 'dev_player7', name: 'Player7', index: 6 },
};

const FACTIONS = {
  FEDERATION: { id: 'federation', name: 'Federation', color: '#3399ff' },
  KLINGON: { id: 'klingon', name: 'Klingon', color: '#cc0000' },
  ROMULAN: { id: 'romulan', name: 'Romulan', color: '#006600' },
  CARDASSIAN: { id: 'cardassian', name: 'Cardassian', color: '#996633' },
  FERENGI: { id: 'ferengi', name: 'Ferengi', color: '#ff9900' },
  BREEN: { id: 'breen', name: 'Breen', color: '#66cccc' },
  GORN: { id: 'gorn', name: 'Gorn', color: '#88aa33' },
};

class TestHelper {
  constructor() {
    this.drivers = new Map();
    this.testId = Date.now();
  }

  /**
   * Create a new browser driver for a player
   */
  async createDriver(playerKey) {
    const player = PLAYERS[playerKey];
    const options = new chrome.Options();

    // Cross-platform temp directory
    const tempBase = process.env.CHROME_TEMP_DIR || os.tmpdir();
    const tempDir = path.join(tempBase, `chrome-test-${player.name}-${this.testId}`);

    options.addArguments(`--user-data-dir=${tempDir}`);
    options.addArguments('--window-size=1200,900');
    options.addArguments('--no-first-run');
    options.addArguments('--no-default-browser-check');
    options.addArguments('--disable-default-apps');
    options.addArguments('--disable-extensions');
    options.addArguments('--disable-gpu');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--no-sandbox');

    // Headless mode for CI/Docker
    if (HEADLESS) {
      options.addArguments('--headless=new');
    }

    let builder = new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options);

    // Use remote Selenium server if specified (for Docker)
    if (SELENIUM_HOST) {
      builder = builder.usingServer(SELENIUM_HOST);
    }

    const driver = await builder.build();
    this.drivers.set(playerKey, driver);
    return driver;
  }

  /**
   * Get an existing driver
   */
  getDriver(playerKey) {
    return this.drivers.get(playerKey);
  }

  /**
   * Close all browser windows
   */
  async closeAll() {
    for (const [key, driver] of this.drivers) {
      try {
        await driver.quit();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    this.drivers.clear();
  }

  /**
   * Close a specific driver
   */
  async closeDriver(playerKey) {
    const driver = this.drivers.get(playerKey);
    if (driver) {
      try {
        await driver.quit();
      } catch (e) {
        // Ignore
      }
      this.drivers.delete(playerKey);
    }
  }

  /**
   * Navigate to base URL and clear localStorage
   */
  async navigateAndClear(driver) {
    await driver.get(BASE_URL);
    await driver.executeScript('localStorage.clear();');
    await driver.navigate().refresh();
    await driver.wait(until.elementLocated(By.css('.lcars-panel, .min-h-screen')), 10000);
  }

  /**
   * Login as a specific player (dev mode)
   */
  async login(driver, playerKey) {
    const player = PLAYERS[playerKey];
    await this.navigateAndClear(driver);

    // Wait for player selection grid
    await driver.wait(until.elementLocated(By.css('.grid button')), 10000);

    // Click the player button
    const buttons = await driver.findElements(By.css('.grid button'));
    await buttons[player.index].click();

    // Wait for redirect to home
    await driver.wait(until.urlIs(BASE_URL + '/'), 5000);

    return player;
  }

  /**
   * Create a lobby
   */
  async createLobby(driver) {
    await driver.wait(until.elementLocated(By.css('.lcars-button')), 5000);
    const createButton = await driver.findElement(
      By.xpath("//button[contains(text(), 'CREATE NEW GAME')]")
    );
    await createButton.click();

    await driver.wait(until.urlContains('/lobby/'), 10000);
    const url = await driver.getCurrentUrl();
    const lobbyCode = url.split('/lobby/')[1];

    return lobbyCode;
  }

  /**
   * Join a lobby with a code
   */
  async joinLobby(driver, lobbyCode) {
    await driver.wait(until.elementLocated(By.css('.lcars-button')), 5000);

    const codeInput = await driver.findElement(By.css('input[placeholder="ABC123"]'));
    await codeInput.clear();
    await codeInput.sendKeys(lobbyCode);

    const joinButton = await driver.findElement(
      By.xpath("//button[contains(text(), 'JOIN GAME')]")
    );
    await joinButton.click();

    await driver.wait(until.urlContains('/lobby/'), 10000);
  }

  /**
   * Select a faction in the lobby
   */
  async selectFaction(driver, factionKey) {
    const faction = FACTIONS[factionKey];
    await driver.sleep(500);

    const factionButton = await driver.findElement(
      By.xpath(`//button[contains(., '${faction.name}')]`)
    );
    await factionButton.click();

    return faction;
  }

  /**
   * Mark player as ready
   */
  async markReady(driver) {
    await driver.sleep(500);
    const readyButton = await driver.findElement(
      By.xpath("//button[contains(text(), 'MARK READY')]")
    );
    await readyButton.click();
  }

  /**
   * Unmark player as ready
   */
  async unmarkReady(driver) {
    await driver.sleep(500);
    const readyButton = await driver.findElement(
      By.xpath("//button[contains(text(), 'READY')]")
    );
    await readyButton.click();
  }

  /**
   * Start the game (host only)
   */
  async startGame(driver) {
    await driver.sleep(1000);
    const startButton = await driver.findElement(
      By.xpath("//button[contains(text(), 'START GAME')]")
    );
    await startButton.click();

    await driver.wait(until.urlContains('/game/'), 10000);
    const url = await driver.getCurrentUrl();
    return url.split('/game/')[1];
  }

  /**
   * Wait for game to load
   */
  async waitForGameLoad(driver) {
    // Wait for game state to load (status bar with bg-space-blue and border-lcars-orange appears)
    // The StatusBar component uses these classes, and the loading state shows "Loading game..."
    await driver.wait(
      until.elementLocated(By.css('.bg-space-blue.border-lcars-orange, [data-testid="status-bar"]')),
      15000
    );
    await driver.sleep(1000);
  }

  /**
   * Setup a complete 3-player game
   */
  async setupThreePlayerGame() {
    const driver1 = await this.createDriver('PLAYER1');
    const driver2 = await this.createDriver('PLAYER2');
    const driver3 = await this.createDriver('PLAYER3');

    // Login all players
    await this.login(driver1, 'PLAYER1');
    await this.login(driver2, 'PLAYER2');
    await this.login(driver3, 'PLAYER3');

    // Player 1 creates lobby
    const lobbyCode = await this.createLobby(driver1);

    // Players 2 and 3 join
    await this.joinLobby(driver2, lobbyCode);
    await this.joinLobby(driver3, lobbyCode);

    // Select factions
    await this.selectFaction(driver1, 'FEDERATION');
    await this.selectFaction(driver2, 'KLINGON');
    await this.selectFaction(driver3, 'ROMULAN');

    // Mark ready
    await this.markReady(driver1);
    await this.markReady(driver2);
    await this.markReady(driver3);

    // Start game
    const gameId = await this.startGame(driver1);

    // Wait for all to load
    await driver2.wait(until.urlContains('/game/'), 10000);
    await driver3.wait(until.urlContains('/game/'), 10000);

    await this.waitForGameLoad(driver1);
    await this.waitForGameLoad(driver2);
    await this.waitForGameLoad(driver3);

    return {
      gameId,
      lobbyCode,
      drivers: { driver1, driver2, driver3 },
      factions: {
        driver1: FACTIONS.FEDERATION,
        driver2: FACTIONS.KLINGON,
        driver3: FACTIONS.ROMULAN,
      },
    };
  }

  /**
   * Check if element exists
   */
  async elementExists(driver, selector, timeout = 2000) {
    try {
      await driver.wait(until.elementLocated(By.css(selector)), timeout);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if element with text exists
   */
  async elementWithTextExists(driver, text, timeout = 2000) {
    try {
      await driver.wait(
        until.elementLocated(By.xpath(`//*[contains(text(), '${text}')]`)),
        timeout
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get element text
   */
  async getText(driver, selector) {
    const element = await driver.findElement(By.css(selector));
    return await element.getText();
  }

  /**
   * Click element by selector
   */
  async click(driver, selector) {
    const element = await driver.findElement(By.css(selector));
    await element.click();
  }

  /**
   * Click element containing text
   */
  async clickByText(driver, text) {
    const element = await driver.findElement(
      By.xpath(`//*[contains(text(), '${text}')]`)
    );
    await element.click();
  }

  /**
   * Type into an input
   */
  async type(driver, selector, text) {
    const element = await driver.findElement(By.css(selector));
    await element.clear();
    await element.sendKeys(text);
  }

  /**
   * Get current URL
   */
  async getUrl(driver) {
    return await driver.getCurrentUrl();
  }

  /**
   * Wait for URL to contain
   */
  async waitForUrlContains(driver, text, timeout = 10000) {
    await driver.wait(until.urlContains(text), timeout);
  }

  /**
   * Take screenshot
   */
  async screenshot(driver, filename) {
    const screenshot = await driver.takeScreenshot();
    require('fs').writeFileSync(filename, screenshot, 'base64');
  }

  /**
   * API call helper
   */
  async apiGet(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`);
    return await response.json();
  }

  async apiPost(endpoint, body) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await response.json();
  }

  /**
   * Position windows for visibility
   */
  async positionWindows() {
    const positions = [
      { x: 0, y: 0 },
      { x: 600, y: 0 },
      { x: 300, y: 400 },
      { x: 900, y: 400 },
    ];

    let i = 0;
    for (const [key, driver] of this.drivers) {
      if (positions[i]) {
        await driver.manage().window().setRect({
          x: positions[i].x,
          y: positions[i].y,
          width: 800,
          height: 600,
        });
      }
      i++;
    }
  }
}

module.exports = {
  TestHelper,
  PLAYERS,
  FACTIONS,
  BASE_URL,
  API_URL,
  HEADLESS,
  By,
  until,
  Key,
};
