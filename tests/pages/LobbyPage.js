/**
 * Lobby Page Object - Pre-game lobby
 */

const { By, until } = require('selenium-webdriver');
const { FACTIONS } = require('../helpers/test-helper');

class LobbyPage {
  constructor(driver) {
    this.driver = driver;
  }

  // Selectors
  get lobbyCodeDisplay() {
    return By.css('.tracking-widest');
  }

  get markReadyButton() {
    return By.xpath("//button[contains(text(), 'MARK READY')]");
  }

  get readyButton() {
    return By.xpath("//button[contains(text(), 'READY') and contains(@class, 'bg-green')]");
  }

  get startGameButton() {
    return By.xpath("//button[contains(text(), 'START GAME')]");
  }

  get waitingButton() {
    return By.xpath("//button[contains(text(), 'Waiting')]");
  }

  get errorMessage() {
    // Error uses bg-red-900/50 with Tailwind opacity modifier
    return By.css('[class*="bg-red-900"]');
  }

  get playerList() {
    return By.css('.bg-space-dark.rounded');
  }

  get factionButtons() {
    return By.css('.space-y-2 button');
  }

  get playerCount() {
    // Match the h2 header that contains "Players" text specifically
    return By.xpath("//h2[contains(., 'Players')]");
  }

  // Actions
  async isLoaded() {
    try {
      await this.driver.wait(until.urlContains('/lobby/'), 5000);
      return true;
    } catch (e) {
      return false;
    }
  }

  async getLobbyCode() {
    const url = await this.driver.getCurrentUrl();
    return url.split('/lobby/')[1];
  }

  async getLobbyCodeFromDisplay() {
    const element = await this.driver.findElement(this.lobbyCodeDisplay);
    const text = await element.getText();
    return text.replace('CODE: ', '');
  }

  async selectFaction(factionKey) {
    const faction = FACTIONS[factionKey];
    await this.driver.sleep(500);
    const button = await this.driver.findElement(
      By.xpath(`//button[contains(., '${faction.name}')]`)
    );
    await button.click();
  }

  async deselectFaction() {
    // Click on currently selected faction to deselect
    const selected = await this.driver.findElement(
      By.css('button[style*="border-color"]')
    );
    await selected.click();
  }

  async isFactionSelected(factionKey) {
    const faction = FACTIONS[factionKey];
    // Wait for server response and UI update
    await this.driver.sleep(1000);
    try {
      await this.driver.wait(
        until.elementLocated(By.xpath(`//button[contains(., '${faction.name}') and contains(., '(You)')]`)),
        3000
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  async isFactionTaken(factionKey) {
    const faction = FACTIONS[factionKey];
    try {
      const button = await this.driver.findElement(
        By.xpath(`//button[contains(., '${faction.name}')]`)
      );
      const isDisabled = await button.getAttribute('disabled');
      const classes = await button.getAttribute('class');
      return isDisabled !== null || classes.includes('opacity-50');
    } catch (e) {
      return false;
    }
  }

  async getAvailableFactions() {
    const buttons = await this.driver.findElements(this.factionButtons);
    const available = [];
    for (const button of buttons) {
      const isDisabled = await button.getAttribute('disabled');
      const classes = await button.getAttribute('class');
      if (isDisabled === null && !classes.includes('opacity-50')) {
        const text = await button.getText();
        available.push(text.split('\n')[0]); // Get faction name
      }
    }
    return available;
  }

  async markReady() {
    await this.driver.sleep(500);
    const button = await this.driver.findElement(this.markReadyButton);
    await button.click();
  }

  async unmarkReady() {
    await this.driver.sleep(500);
    const button = await this.driver.findElement(this.readyButton);
    await button.click();
  }

  async isReady() {
    try {
      await this.driver.findElement(this.readyButton);
      return true;
    } catch (e) {
      return false;
    }
  }

  async canStartGame() {
    // Wait a bit for WebSocket updates to propagate
    await this.driver.sleep(1000);
    try {
      // First check if START GAME button exists (means game can start)
      const button = await this.driver.findElement(this.startGameButton);
      const isDisabled = await button.getAttribute('disabled');
      const classes = await button.getAttribute('class');
      return isDisabled === null && !classes.includes('cursor-not-allowed');
    } catch (e) {
      // If START GAME not found, check if Waiting button exists (means can't start yet)
      try {
        await this.driver.findElement(this.waitingButton);
        return false;
      } catch (e2) {
        return false;
      }
    }
  }

  async startGame() {
    await this.driver.sleep(1000);
    const button = await this.driver.findElement(this.startGameButton);
    await button.click();
  }

  async getPlayerCount() {
    try {
      // Wait for lobby page to be loaded (URL check)
      await this.driver.wait(until.urlContains('/lobby/'), 5000);

      // Wait for lobby data to load - look for h2 with "Players" in its content
      const playersHeader = By.xpath("//h2[contains(., 'Players (')]");
      await this.driver.wait(until.elementLocated(playersHeader), 10000);

      // Get the text and parse the count
      const element = await this.driver.findElement(playersHeader);
      const text = await element.getText();

      // Parse various formats: "Players (1/7)", "Players(1/7)", etc.
      const match = text.match(/Players\s*\(\s*(\d+)\s*[\/\\]\s*7\s*\)/i);
      if (match) {
        return parseInt(match[1]);
      }

      // Try simpler pattern - just find digits in parentheses
      const simpleMatch = text.match(/\((\d+)\//);
      return simpleMatch ? parseInt(simpleMatch[1]) : 0;
    } catch (e) {
      return 0;
    }
  }

  async getPlayerNames() {
    const players = await this.driver.findElements(this.playerList);
    const names = [];
    for (const player of players) {
      const text = await player.getText();
      names.push(text.split('\n')[0]);
    }
    return names;
  }

  async isHost() {
    // Host sees either START GAME button or "Waiting for players..." button
    // Non-hosts see "Waiting for host to start the game..." text
    try {
      await this.driver.wait(until.urlContains('/lobby/'), 5000);

      // Check for START GAME button
      try {
        await this.driver.findElement(this.startGameButton);
        return true;
      } catch (e) {
        // Not found, check for Waiting button (host when not ready to start)
      }

      // Check for Waiting button
      try {
        await this.driver.findElement(this.waitingButton);
        return true;
      } catch (e) {
        // Not found
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  async hasError() {
    try {
      await this.driver.findElement(this.errorMessage);
      return true;
    } catch (e) {
      return false;
    }
  }

  async getErrorMessage() {
    try {
      const element = await this.driver.findElement(this.errorMessage);
      return await element.getText();
    } catch (e) {
      return null;
    }
  }

  async waitForGameStart(timeout = 10000) {
    await this.driver.wait(until.urlContains('/game/'), timeout);
  }
}

module.exports = LobbyPage;
