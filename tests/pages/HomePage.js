/**
 * Home Page Object - Main menu after login
 */

const { By, until } = require('selenium-webdriver');

class HomePage {
  constructor(driver) {
    this.driver = driver;
  }

  // Selectors
  get createGameButton() {
    return By.xpath("//button[contains(text(), 'CREATE NEW GAME')]");
  }

  get joinGameButton() {
    return By.xpath("//button[contains(text(), 'JOIN GAME')]");
  }

  get lobbyCodeInput() {
    return By.css('input[placeholder="ABC123"]');
  }

  get playerNameInput() {
    return By.css('input[placeholder="Captain..."]');
  }

  get errorMessage() {
    // Error uses bg-red-900/50 with Tailwind opacity modifier
    return By.css('[class*="bg-red-900"]');
  }

  get devModeIndicator() {
    return By.xpath("//*[contains(text(), 'DEV MODE')]");
  }

  get signOutButton() {
    return By.xpath("//button[contains(text(), 'Sign Out')]");
  }

  get factionPreviews() {
    return By.css('[class*="faction-"]');
  }

  get titleStarTrek() {
    return By.xpath("//h1[contains(text(), 'STAR TREK')]");
  }

  get titleDiplomacy() {
    return By.xpath("//h2[contains(text(), 'DIPLOMACY')]");
  }

  // Actions
  async isLoaded() {
    try {
      await this.driver.wait(until.elementLocated(this.createGameButton), 5000);
      return true;
    } catch (e) {
      return false;
    }
  }

  async clickCreateGame() {
    const button = await this.driver.findElement(this.createGameButton);
    await button.click();
  }

  async clickJoinGame() {
    const button = await this.driver.findElement(this.joinGameButton);
    await button.click();
  }

  async enterLobbyCode(code) {
    const input = await this.driver.findElement(this.lobbyCodeInput);
    await input.clear();
    await input.sendKeys(code);
  }

  async enterPlayerName(name) {
    const input = await this.driver.findElement(this.playerNameInput);
    await input.clear();
    await input.sendKeys(name);
  }

  async joinWithCode(code) {
    await this.enterLobbyCode(code);
    await this.clickJoinGame();
  }

  async getErrorMessage() {
    try {
      const element = await this.driver.findElement(this.errorMessage);
      return await element.getText();
    } catch (e) {
      return null;
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

  async signOut() {
    const button = await this.driver.findElement(this.signOutButton);
    await button.click();
  }

  async isInDevMode() {
    try {
      await this.driver.findElement(this.devModeIndicator);
      return true;
    } catch (e) {
      return false;
    }
  }

  async getFactionPreviewCount() {
    const previews = await this.driver.findElements(this.factionPreviews);
    return previews.length;
  }

  async hasTitle() {
    try {
      await this.driver.findElement(this.titleStarTrek);
      await this.driver.findElement(this.titleDiplomacy);
      return true;
    } catch (e) {
      return false;
    }
  }

  async getLobbyCodeInputValue() {
    const input = await this.driver.findElement(this.lobbyCodeInput);
    return await input.getAttribute('value');
  }
}

module.exports = HomePage;
