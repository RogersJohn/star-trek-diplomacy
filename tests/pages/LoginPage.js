/**
 * Login Page Object - Dev Mode Sign In
 */

const { By, until } = require('selenium-webdriver');
const { PLAYERS } = require('../helpers/test-helper');

class LoginPage {
  constructor(driver) {
    this.driver = driver;
  }

  // Selectors
  get playerButtons() {
    return By.css('.grid button');
  }

  get devModeLabel() {
    return By.xpath("//*[contains(text(), 'DEV MODE')]");
  }

  get titleText() {
    return By.xpath("//*[contains(text(), 'STAR TREK DIPLOMACY')]");
  }

  get helpText() {
    return By.xpath("//*[contains(text(), 'Select a player')]");
  }

  // Actions
  async isLoaded() {
    try {
      await this.driver.wait(until.elementLocated(this.playerButtons), 5000);
      return true;
    } catch (e) {
      return false;
    }
  }

  async getPlayerButtonCount() {
    const buttons = await this.driver.findElements(this.playerButtons);
    return buttons.length;
  }

  async clickPlayer(playerKey) {
    const player = PLAYERS[playerKey];
    const buttons = await this.driver.findElements(this.playerButtons);
    await buttons[player.index].click();
  }

  async clickPlayerByIndex(index) {
    const buttons = await this.driver.findElements(this.playerButtons);
    if (index < buttons.length) {
      await buttons[index].click();
    } else {
      throw new Error(`Player index ${index} out of range`);
    }
  }

  async getPlayerButtonText(index) {
    const buttons = await this.driver.findElements(this.playerButtons);
    return await buttons[index].getText();
  }

  async hasDevModeLabel() {
    try {
      await this.driver.findElement(this.devModeLabel);
      return true;
    } catch (e) {
      return false;
    }
  }

  async hasTitle() {
    try {
      await this.driver.findElement(this.titleText);
      return true;
    } catch (e) {
      return false;
    }
  }
}

module.exports = LoginPage;
