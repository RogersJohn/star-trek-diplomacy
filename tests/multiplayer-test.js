/**
 * Star Trek Diplomacy - Multi-Player Selenium Test
 *
 * Launches 3 browser windows, logs in as different players,
 * creates a lobby, joins all players, and starts a game.
 *
 * Usage: npm test
 * Prerequisites: Chrome browser installed, backend and frontend running
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const BASE_URL = 'http://localhost:5173';
const PLAYERS = [
  { id: 'dev_player1', name: 'Player1', buttonIndex: 0 },
  { id: 'dev_player2', name: 'Player2', buttonIndex: 1 },
  { id: 'dev_player3', name: 'Player3', buttonIndex: 2 },
];

const FACTIONS = ['federation', 'klingon', 'romulan'];

class MultiPlayerTest {
  constructor() {
    this.drivers = [];
    this.lobbyCode = null;
  }

  async createDriver(playerName) {
    const options = new chrome.Options();
    // Each window gets unique user data dir to have separate localStorage
    const tempDir = `C:/temp/chrome-${playerName}-${Date.now()}`;
    options.addArguments(`--user-data-dir=${tempDir}`);
    options.addArguments('--window-size=1200,900');
    options.addArguments('--no-first-run');
    options.addArguments('--no-default-browser-check');
    options.addArguments('--disable-default-apps');

    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    return driver;
  }

  async clearLocalStorage(driver) {
    await driver.executeScript('localStorage.clear();');
  }

  async login(driver, player) {
    console.log(`[${player.name}] Navigating to app...`);
    await driver.get(BASE_URL);

    // Clear any existing localStorage
    await this.clearLocalStorage(driver);
    await driver.navigate().refresh();

    // Wait for sign-in page
    await driver.wait(until.elementLocated(By.css('.lcars-panel')), 10000);

    console.log(`[${player.name}] Clicking player button...`);
    // Find and click the player button (grid of 7 buttons)
    const buttons = await driver.findElements(By.css('.grid button'));
    await buttons[player.buttonIndex].click();

    // Wait for redirect to home page
    await driver.wait(until.urlIs(BASE_URL + '/'), 5000);
    console.log(`[${player.name}] Logged in successfully`);
  }

  async createLobby(driver, player) {
    console.log(`[${player.name}] Creating lobby...`);

    // Wait for home page to load
    await driver.wait(until.elementLocated(By.css('.lcars-button')), 5000);

    // Click "CREATE NEW GAME" button
    const createButton = await driver.findElement(By.xpath("//button[contains(text(), 'CREATE NEW GAME')]"));
    await createButton.click();

    // Wait for lobby page and get lobby code
    await driver.wait(until.urlContains('/lobby/'), 10000);
    const url = await driver.getCurrentUrl();
    this.lobbyCode = url.split('/lobby/')[1];

    console.log(`[${player.name}] Created lobby: ${this.lobbyCode}`);
    return this.lobbyCode;
  }

  async joinLobby(driver, player, lobbyCode) {
    console.log(`[${player.name}] Joining lobby ${lobbyCode}...`);

    // Wait for home page
    await driver.wait(until.elementLocated(By.css('.lcars-button')), 5000);

    // Enter lobby code
    const codeInput = await driver.findElement(By.css('input[placeholder="ABC123"]'));
    await codeInput.clear();
    await codeInput.sendKeys(lobbyCode);

    // Click "JOIN GAME" button
    const joinButton = await driver.findElement(By.xpath("//button[contains(text(), 'JOIN GAME')]"));
    await joinButton.click();

    // Wait for lobby page
    await driver.wait(until.urlContains('/lobby/'), 10000);
    console.log(`[${player.name}] Joined lobby successfully`);
  }

  async selectFaction(driver, player, factionName) {
    console.log(`[${player.name}] Selecting faction: ${factionName}...`);

    // Wait for faction buttons to be visible
    await driver.sleep(1000);

    // Find the faction button by text content
    const factionButton = await driver.findElement(
      By.xpath(`//button[contains(., '${factionName.charAt(0).toUpperCase() + factionName.slice(1)}')]`)
    );
    await factionButton.click();

    console.log(`[${player.name}] Selected ${factionName}`);
  }

  async markReady(driver, player) {
    console.log(`[${player.name}] Marking ready...`);

    await driver.sleep(500);

    // Click "MARK READY" button
    const readyButton = await driver.findElement(By.xpath("//button[contains(text(), 'MARK READY')]"));
    await readyButton.click();

    console.log(`[${player.name}] Marked ready`);
  }

  async startGame(driver, player) {
    console.log(`[${player.name}] Starting game...`);

    // Wait for START GAME button to be enabled
    await driver.sleep(2000);

    // Click "START GAME" button
    const startButton = await driver.findElement(By.xpath("//button[contains(text(), 'START GAME')]"));
    await startButton.click();

    // Wait for game page
    await driver.wait(until.urlContains('/game/'), 10000);
    console.log(`[${player.name}] Game started!`);
  }

  async positionWindows() {
    console.log('Positioning windows...');
    const positions = [
      { x: 0, y: 0 },
      { x: 600, y: 0 },
      { x: 300, y: 400 },
    ];

    for (let i = 0; i < this.drivers.length; i++) {
      await this.drivers[i].manage().window().setRect({
        x: positions[i].x,
        y: positions[i].y,
        width: 900,
        height: 700,
      });
    }
  }

  async run() {
    console.log('='.repeat(60));
    console.log('Star Trek Diplomacy - Multi-Player Test');
    console.log('='.repeat(60));
    console.log('');

    try {
      // Step 1: Create browser windows for all players
      console.log('Step 1: Launching browser windows...');
      for (const player of PLAYERS) {
        const driver = await this.createDriver(player.name);
        this.drivers.push(driver);
      }

      // Position windows so they're all visible
      await this.positionWindows();

      // Step 2: Login all players
      console.log('\nStep 2: Logging in players...');
      for (let i = 0; i < PLAYERS.length; i++) {
        await this.login(this.drivers[i], PLAYERS[i]);
      }

      // Step 3: Player 1 creates lobby
      console.log('\nStep 3: Creating lobby...');
      await this.createLobby(this.drivers[0], PLAYERS[0]);

      // Step 4: Players 2 and 3 join lobby
      console.log('\nStep 4: Joining lobby...');
      for (let i = 1; i < PLAYERS.length; i++) {
        await this.joinLobby(this.drivers[i], PLAYERS[i], this.lobbyCode);
      }

      // Step 5: All players select factions
      console.log('\nStep 5: Selecting factions...');
      for (let i = 0; i < PLAYERS.length; i++) {
        await this.selectFaction(this.drivers[i], PLAYERS[i], FACTIONS[i]);
      }

      // Step 6: All players mark ready
      console.log('\nStep 6: Marking players ready...');
      for (let i = 0; i < PLAYERS.length; i++) {
        await this.markReady(this.drivers[i], PLAYERS[i]);
      }

      // Step 7: Player 1 starts game
      console.log('\nStep 7: Starting game...');
      await this.startGame(this.drivers[0], PLAYERS[0]);

      // Wait for all windows to show game
      console.log('\nWaiting for all windows to show game...');
      for (let i = 1; i < PLAYERS.length; i++) {
        await this.drivers[i].wait(until.urlContains('/game/'), 10000);
      }

      console.log('\n' + '='.repeat(60));
      console.log('SUCCESS! Game is now running.');
      console.log('='.repeat(60));
      console.log('');
      console.log('Three browser windows are open with Player1, Player2, and Player3.');
      console.log('You can now interact with the game manually.');
      console.log('');
      console.log('Press Ctrl+C to close all windows and exit.');
      console.log('');

      // Keep the script running so windows stay open
      await new Promise(() => {});

    } catch (error) {
      console.error('\nTest failed:', error.message);
      console.error(error.stack);

      // Take screenshots on failure
      for (let i = 0; i < this.drivers.length; i++) {
        try {
          const screenshot = await this.drivers[i].takeScreenshot();
          require('fs').writeFileSync(`error-screenshot-player${i + 1}.png`, screenshot, 'base64');
          console.log(`Screenshot saved: error-screenshot-player${i + 1}.png`);
        } catch (e) {
          // Ignore screenshot errors
        }
      }

      await this.cleanup();
      process.exit(1);
    }
  }

  async cleanup() {
    console.log('\nClosing browsers...');
    for (const driver of this.drivers) {
      try {
        await driver.quit();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

// Handle Ctrl+C gracefully
const test = new MultiPlayerTest();
process.on('SIGINT', async () => {
  console.log('\n\nReceived Ctrl+C, cleaning up...');
  await test.cleanup();
  process.exit(0);
});

// Run the test
test.run();