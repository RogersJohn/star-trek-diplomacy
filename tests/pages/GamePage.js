/**
 * Game Page Object - Main game interface
 */

const { By, until } = require('selenium-webdriver');

class GamePage {
  constructor(driver) {
    this.driver = driver;
  }

  // Selectors - Status Bar
  get turnDisplay() {
    return By.xpath("//*[contains(text(), 'Turn')]");
  }

  get yearDisplay() {
    return By.xpath("//*[contains(text(), '237')]"); // Star Trek year
  }

  get phaseDisplay() {
    // Season is displayed in status bar - look for the uppercase text after "Season" label
    return By.css('.text-lcars-blue.uppercase');
  }

  get actualPhaseDisplay() {
    // Actual phase (Orders/Retreat/Build) is displayed after "Phase" label
    return By.css('.text-lcars-tan.uppercase');
  }

  get supplyCountDisplay() {
    return By.xpath("//*[contains(text(), 'SC')]");
  }

  // Selectors - Map
  get gameMap() {
    return By.css('[data-testid="game-map"], .map-container, canvas, svg');
  }

  get mapSystems() {
    return By.css('[class*="system"], circle, rect');
  }

  // Selectors - Order Panel
  get orderPanel() {
    return By.css('.order-panel, [data-testid="order-panel"]');
  }

  get submitOrdersButton() {
    return By.xpath("//button[contains(text(), 'SUBMIT') or contains(text(), 'Submit')]");
  }

  get clearOrdersButton() {
    return By.xpath("//button[contains(text(), 'CLEAR') or contains(text(), 'Clear')]");
  }

  get holdButton() {
    return By.xpath("//button[contains(text(), 'HOLD') or contains(text(), 'Hold')]");
  }

  get moveButton() {
    return By.xpath("//button[contains(text(), 'MOVE') or contains(text(), 'Move')]");
  }

  get supportButton() {
    return By.xpath("//button[contains(text(), 'SUPPORT') or contains(text(), 'Support')]");
  }

  get pendingOrders() {
    return By.css('[class*="pending"], [class*="order-item"]');
  }

  // Selectors - Alliance Panel
  get alliancePanel() {
    return By.xpath("//*[contains(text(), 'Alliance') or contains(text(), 'Allies')]");
  }

  get proposeAllianceButton() {
    return By.xpath("//button[contains(text(), 'Propose')]");
  }

  get breakAllianceButton() {
    return By.xpath("//button[contains(text(), 'Break')]");
  }

  get allianceProposals() {
    return By.xpath("//*[contains(text(), 'proposal') or contains(text(), 'Pending')]");
  }

  // Selectors - Faction Abilities
  get abilityPanel() {
    return By.xpath("//*[contains(text(), 'Ability') or contains(text(), 'ability')]");
  }

  get useAbilityButton() {
    return By.xpath("//button[contains(text(), 'Use') or contains(text(), 'Activate')]");
  }

  // Selectors - v2.1 Romulan Spy Target
  get romulanSpyTargetSelect() {
    return By.css('[data-testid="spy-target-select"]');
  }

  // Selectors - v2.1 Ferengi Latinum
  get ferengiLatinumDisplay() {
    return By.css('[data-testid="latinum-balance"]');
  }

  get ferengiBribeButton() {
    return By.xpath("//button[contains(text(), 'Bribe')]");
  }

  get ferengiSabotageButton() {
    return By.xpath("//button[contains(text(), 'Sabotage')]");
  }

  get ferengiEspionageButton() {
    return By.xpath("//button[contains(text(), 'Espionage')]");
  }

  // Selectors - v2.1 Map UX
  get zoomResetButton() {
    return By.xpath("//button[contains(text(), 'Reset View')]");
  }

  get hyperspaceToggle() {
    return By.xpath("//button[contains(text(), 'Hyperspace')]");
  }

  get phaseOverlay() {
    return By.css('.absolute.top-4.left-1\\/2');
  }

  get orbitRings() {
    return By.css('circle[stroke-dasharray]');
  }

  get removeOrderButtons() {
    return By.css('[data-testid="remove-order"]');
  }

  // Selectors - Messages
  get messagesPanel() {
    return By.xpath("//*[contains(text(), 'Messages') or contains(text(), 'Diplomatic')]");
  }

  get messageInput() {
    return By.css('input[placeholder*="message"], textarea');
  }

  get sendMessageButton() {
    return By.xpath("//button[contains(text(), 'Send')]");
  }

  get messageList() {
    return By.css('[class*="message-item"], [class*="chat-message"]');
  }

  // Selectors - History
  get historyButton() {
    return By.xpath("//button[contains(text(), 'History')]");
  }

  get historyPanel() {
    return By.xpath("//*[contains(text(), 'Turn History')]");
  }

  // Selectors - Victory/End
  get victoryScreen() {
    return By.xpath("//*[contains(text(), 'VICTORY') or contains(text(), 'GAME OVER')]");
  }

  get eliminatedBanner() {
    return By.xpath("//*[contains(text(), 'eliminated') or contains(text(), 'Spectating')]");
  }

  get returnToLobbyButton() {
    return By.xpath("//button[contains(text(), 'Return') or contains(text(), 'Lobby')]");
  }

  // Selectors - Loading
  get loadingIndicator() {
    return By.xpath("//*[contains(text(), 'Loading')]");
  }

  // Actions - General
  async isLoaded() {
    try {
      await this.driver.wait(until.urlContains('/game/'), 5000);
      // Wait for loading to finish
      await this.driver.sleep(2000);
      const loading = await this.hasLoadingIndicator();
      return !loading;
    } catch (e) {
      return false;
    }
  }

  async hasLoadingIndicator() {
    try {
      await this.driver.findElement(this.loadingIndicator);
      return true;
    } catch (e) {
      return false;
    }
  }

  async waitForLoad(timeout = 15000) {
    await this.driver.wait(async () => {
      const loading = await this.hasLoadingIndicator();
      return !loading;
    }, timeout);
  }

  async getGameId() {
    const url = await this.driver.getCurrentUrl();
    return url.split('/game/')[1];
  }

  // Actions - Status
  async getTurnNumber() {
    try {
      // Turn label and number are in separate spans, get parent div text
      const element = await this.driver.findElement(this.turnDisplay);
      const parent = await element.findElement(By.xpath('..'));
      const text = await parent.getText();
      const match = text.match(/Turn\s*(\d+)/i);
      return match ? parseInt(match[1]) : 1;
    } catch (e) {
      // Fallback: try finding the status bar and extracting turn
      try {
        const statusBar = await this.driver.findElement(By.css('.bg-space-blue.border-lcars-orange'));
        const text = await statusBar.getText();
        const match = text.match(/Turn\s*(\d+)/i);
        return match ? parseInt(match[1]) : 1;
      } catch (e2) {
        return null;
      }
    }
  }

  async getYear() {
    try {
      const element = await this.driver.findElement(this.yearDisplay);
      return await element.getText();
    } catch (e) {
      return null;
    }
  }

  async getPhase() {
    try {
      const element = await this.driver.findElement(this.phaseDisplay);
      return await element.getText();
    } catch (e) {
      return null;
    }
  }

  // Actions - Orders
  async hasOrderPanel() {
    try {
      await this.driver.findElement(this.orderPanel);
      return true;
    } catch (e) {
      return false;
    }
  }

  async clickSubmitOrders() {
    const button = await this.driver.findElement(this.submitOrdersButton);
    await button.click();
  }

  async clickClearOrders() {
    const button = await this.driver.findElement(this.clearOrdersButton);
    await button.click();
  }

  async canSubmitOrders() {
    try {
      const button = await this.driver.findElement(this.submitOrdersButton);
      const isDisabled = await button.getAttribute('disabled');
      return isDisabled === null;
    } catch (e) {
      return false;
    }
  }

  async getPendingOrderCount() {
    try {
      const orders = await this.driver.findElements(this.pendingOrders);
      return orders.length;
    } catch (e) {
      return 0;
    }
  }

  async clickHold() {
    const button = await this.driver.findElement(this.holdButton);
    await button.click();
  }

  async clickMove() {
    const button = await this.driver.findElement(this.moveButton);
    await button.click();
  }

  async clickSupport() {
    const button = await this.driver.findElement(this.supportButton);
    await button.click();
  }

  // Actions - Alliance
  async hasAlliancePanel() {
    try {
      await this.driver.findElement(this.alliancePanel);
      return true;
    } catch (e) {
      return false;
    }
  }

  async clickProposeAlliance() {
    const button = await this.driver.findElement(this.proposeAllianceButton);
    await button.click();
  }

  async clickBreakAlliance() {
    const button = await this.driver.findElement(this.breakAllianceButton);
    await button.click();
  }

  async hasAllianceProposals() {
    try {
      await this.driver.findElement(this.allianceProposals);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Actions - Abilities
  async hasAbilityPanel() {
    try {
      await this.driver.findElement(this.abilityPanel);
      return true;
    } catch (e) {
      return false;
    }
  }

  async clickUseAbility() {
    const button = await this.driver.findElement(this.useAbilityButton);
    await button.click();
  }

  // Actions - Messages
  async hasMessagesPanel() {
    try {
      await this.driver.findElement(this.messagesPanel);
      return true;
    } catch (e) {
      return false;
    }
  }

  async typeMessage(message) {
    const input = await this.driver.findElement(this.messageInput);
    await input.clear();
    await input.sendKeys(message);
  }

  async clickSendMessage() {
    const button = await this.driver.findElement(this.sendMessageButton);
    await button.click();
  }

  async sendMessage(message) {
    await this.typeMessage(message);
    await this.clickSendMessage();
  }

  async getMessageCount() {
    try {
      const messages = await this.driver.findElements(this.messageList);
      return messages.length;
    } catch (e) {
      return 0;
    }
  }

  // Actions - History
  async clickHistory() {
    const button = await this.driver.findElement(this.historyButton);
    await button.click();
  }

  async hasHistoryPanel() {
    try {
      await this.driver.findElement(this.historyPanel);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Actions - Victory/End
  async hasVictoryScreen() {
    try {
      await this.driver.findElement(this.victoryScreen);
      return true;
    } catch (e) {
      return false;
    }
  }

  async isEliminated() {
    try {
      await this.driver.findElement(this.eliminatedBanner);
      return true;
    } catch (e) {
      return false;
    }
  }

  async clickReturnToLobby() {
    const button = await this.driver.findElement(this.returnToLobbyButton);
    await button.click();
  }

  // Actions - Map Interaction
  async clickOnMap(x, y) {
    const map = await this.driver.findElement(this.gameMap);
    const rect = await map.getRect();

    // Clamp coordinates to element bounds (offset from center)
    const maxOffsetX = Math.floor(rect.width / 2) - 10;
    const maxOffsetY = Math.floor(rect.height / 2) - 10;
    const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, x));
    const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, y));

    const actions = this.driver.actions({ async: true });
    await actions.move({ origin: map, x: clampedX, y: clampedY }).click().perform();
  }

  async clickMapCenter() {
    const map = await this.driver.findElement(this.gameMap);
    const actions = this.driver.actions({ async: true });
    await actions.move({ origin: map, x: 0, y: 0 }).click().perform();
  }

  async hasMap() {
    try {
      await this.driver.findElement(this.gameMap);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Actions - v2.1 Ferengi Latinum
  async getLatinumBalance() {
    const el = await this.driver.findElement(this.ferengiLatinumDisplay);
    return parseFloat(await el.getText());
  }

  async hasLatinumDisplay() {
    try {
      await this.driver.findElement(this.ferengiLatinumDisplay);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Actions - v2.1 Romulan Spy Target
  async selectSpyTarget(faction) {
    const select = await this.driver.findElement(this.romulanSpyTargetSelect);
    await select.click();
    const option = await this.driver.findElement(By.xpath(`//option[contains(text(), '${faction}')]`));
    await option.click();
  }

  async hasSpyTargetSelector() {
    try {
      await this.driver.findElement(this.romulanSpyTargetSelect);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Actions - v2.1 Order Removal
  async removeOrder(index) {
    const removeButtons = await this.driver.findElements(this.removeOrderButtons);
    if (removeButtons[index]) {
      await removeButtons[index].click();
    }
  }

  async getRemoveOrderButtonCount() {
    try {
      const buttons = await this.driver.findElements(this.removeOrderButtons);
      return buttons.length;
    } catch (e) {
      return 0;
    }
  }

  // Actions - v2.1 Map UX
  async zoomIn() {
    const svg = await this.driver.findElement(By.css('svg'));
    await this.driver.executeScript(
      "arguments[0].dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }))",
      svg
    );
  }

  async zoomOut() {
    const svg = await this.driver.findElement(By.css('svg'));
    await this.driver.executeScript(
      "arguments[0].dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }))",
      svg
    );
  }

  async resetView() {
    const btn = await this.driver.findElement(this.zoomResetButton);
    await btn.click();
  }

  async toggleHyperspace() {
    const btn = await this.driver.findElement(this.hyperspaceToggle);
    await btn.click();
  }

  async hasHyperspaceToggle() {
    try {
      await this.driver.findElement(this.hyperspaceToggle);
      return true;
    } catch (e) {
      return false;
    }
  }

  async hasZoomResetButton() {
    try {
      await this.driver.findElement(this.zoomResetButton);
      return true;
    } catch (e) {
      return false;
    }
  }

  async hasPhaseOverlay() {
    try {
      await this.driver.findElement(this.phaseOverlay);
      return true;
    } catch (e) {
      return false;
    }
  }

  async getPhaseOverlayText() {
    try {
      const el = await this.driver.findElement(this.phaseOverlay);
      return await el.getText();
    } catch (e) {
      return null;
    }
  }

  async getSvgViewBox() {
    const svg = await this.driver.findElement(By.css('svg'));
    return await svg.getAttribute('viewBox');
  }

  async getOrbitRingCount() {
    try {
      const rings = await this.driver.findElements(this.orbitRings);
      return rings.length;
    } catch (e) {
      return 0;
    }
  }

  async getSupplyCenterLabelCount() {
    try {
      const labels = await this.driver.findElements(By.css('svg text.pointer-events-none'));
      return labels.length;
    } catch (e) {
      return 0;
    }
  }
}

module.exports = GamePage;
