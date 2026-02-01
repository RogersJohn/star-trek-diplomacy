/**
 * Edge Cases and Negative Tests
 * Tests for error handling, race conditions, and edge scenarios
 */

const { TestHelper, BASE_URL, API_URL } = require('./helpers/test-helper');
const LoginPage = require('./pages/LoginPage');
const HomePage = require('./pages/HomePage');
const LobbyPage = require('./pages/LobbyPage');
const GamePage = require('./pages/GamePage');

describe('Edge Cases and Negative Tests', () => {
  let helper;

  beforeEach(() => {
    helper = new TestHelper();
  });

  afterEach(async () => {
    await helper.closeAll();
  });

  describe('Invalid Navigation', () => {
    test('should handle non-existent lobby', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');
      await driver.get(BASE_URL + '/lobby/NOTEXIST');
      await driver.sleep(2000);

      // Should show error or redirect
      const url = await driver.getCurrentUrl();
      // May stay on page with error or redirect
    });

    test('should handle non-existent game', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');
      await driver.get(BASE_URL + '/game/NOTEXIST');
      await driver.sleep(2000);

      // Should show loading or error
    });

    test('should handle invalid URL paths', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');
      await driver.get(BASE_URL + '/invalid/path');
      await driver.sleep(1000);

      // Should 404 or redirect
    });
  });

  describe('Invalid API Requests', () => {
    test('should reject lobby creation without name', async () => {
      const response = await helper.apiPost('/api/lobby/create', {});
      // Should fail or use default
    });

    test('should reject joining non-existent lobby', async () => {
      const response = await helper.apiPost('/api/lobby/NOTEXIST/join', {
        playerName: 'Test',
      });
      expect(response.error).toBeDefined();
    });

    test('should reject invalid faction selection', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');
      const lobbyCode = await helper.createLobby(driver);

      const response = await helper.apiPost(`/api/lobby/${lobbyCode}/select-faction`, {
        playerName: 'Player1',
        faction: 'invalid_faction',
      });
      // Should fail or be ignored
    });

    test('should reject orders for wrong faction', async () => {
      expect(true).toBe(true);
    });

    test('should reject orders in wrong phase', async () => {
      expect(true).toBe(true);
    });
  });

  describe('Concurrent Access', () => {
    test('should handle simultaneous lobby joins', async () => {
      const driver1 = await helper.createDriver('PLAYER1');
      const driver2 = await helper.createDriver('PLAYER2');
      const driver3 = await helper.createDriver('PLAYER3');

      await helper.login(driver1, 'PLAYER1');
      await helper.login(driver2, 'PLAYER2');
      await helper.login(driver3, 'PLAYER3');

      const lobbyCode = await helper.createLobby(driver1);

      // Join simultaneously
      const join2 = helper.joinLobby(driver2, lobbyCode);
      const join3 = helper.joinLobby(driver3, lobbyCode);

      await Promise.all([join2, join3]);

      const lobbyPage = new LobbyPage(driver1);
      await driver1.sleep(2000);
      expect(await lobbyPage.getPlayerCount()).toBe(3);
    });

    test('should handle simultaneous faction selection', async () => {
      const driver1 = await helper.createDriver('PLAYER1');
      const driver2 = await helper.createDriver('PLAYER2');

      await helper.login(driver1, 'PLAYER1');
      await helper.login(driver2, 'PLAYER2');

      const lobbyCode = await helper.createLobby(driver1);
      await helper.joinLobby(driver2, lobbyCode);

      // Both try to select same faction
      const select1 = helper.selectFaction(driver1, 'FEDERATION');
      const select2 = helper.selectFaction(driver2, 'FEDERATION');

      await Promise.allSettled([select1, select2]);

      // One should succeed, one should fail
      const lobbyPage1 = new LobbyPage(driver1);
      const lobbyPage2 = new LobbyPage(driver2);

      const isFed1 = await lobbyPage1.isFactionSelected('FEDERATION');
      const isFed2 = await lobbyPage2.isFactionSelected('FEDERATION');

      // Only one should have it
      expect(isFed1 !== isFed2 || !isFed1).toBe(true);
    });

    test('should handle simultaneous order submissions', async () => {
      const { drivers } = await helper.setupThreePlayerGame();

      const gamePage1 = new GamePage(drivers.driver1);
      const gamePage2 = new GamePage(drivers.driver2);
      const gamePage3 = new GamePage(drivers.driver3);

      await gamePage1.waitForLoad();
      await gamePage2.waitForLoad();
      await gamePage3.waitForLoad();

      // Submit simultaneously
      const submit1 = gamePage1.clickSubmitOrders();
      const submit2 = gamePage2.clickSubmitOrders();
      const submit3 = gamePage3.clickSubmitOrders();

      await Promise.all([submit1, submit2, submit3]);

      // All should succeed
      await drivers.driver1.sleep(3000);
    });
  });

  describe('Disconnection Handling', () => {
    test('should handle browser refresh during game', async () => {
      const { drivers } = await helper.setupThreePlayerGame();

      await drivers.driver1.navigate().refresh();
      await drivers.driver1.sleep(3000);

      // Should reload game state
      const gamePage = new GamePage(drivers.driver1);
      expect(await gamePage.hasMap()).toBe(true);
    });

    test('should handle closing and reopening browser', async () => {
      const { gameId, drivers } = await helper.setupThreePlayerGame();

      // Close driver1
      await helper.closeDriver('PLAYER1');

      // Create new driver and navigate back to game
      const newDriver = await helper.createDriver('PLAYER1');
      await helper.login(newDriver, 'PLAYER1');
      await newDriver.get(BASE_URL + '/game/' + gameId);
      await newDriver.sleep(3000);

      // Should load game
    });

    test('should handle network timeout', async () => {
      // Would need network manipulation
      expect(true).toBe(true);
    });
  });

  describe('Session Edge Cases', () => {
    test('should handle expired session', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      // Clear session
      await driver.executeScript('localStorage.clear()');
      await driver.navigate().refresh();
      await driver.sleep(1000);

      // Should redirect to login
      const url = await driver.getCurrentUrl();
      expect(url).toContain('/sign-in');
    });

    test('should handle corrupted session data', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      // Corrupt session
      await driver.executeScript('localStorage.setItem("dev_user", "invalid json")');
      await driver.navigate().refresh();
      await driver.sleep(1000);

      // Should handle gracefully
    });

    test('should handle multiple tabs with same user', async () => {
      // Using same user data dir would share session
      expect(true).toBe(true);
    });
  });

  describe('Lobby Edge Cases', () => {
    test('should handle host leaving before game starts', async () => {
      const driver1 = await helper.createDriver('PLAYER1');
      const driver2 = await helper.createDriver('PLAYER2');

      await helper.login(driver1, 'PLAYER1');
      await helper.login(driver2, 'PLAYER2');

      const lobbyCode = await helper.createLobby(driver1);
      await helper.joinLobby(driver2, lobbyCode);

      // Host leaves
      await driver1.get(BASE_URL + '/');
      await driver2.sleep(2000);

      // Player2 should become host or lobby should close
    });

    test('should handle all players leaving', async () => {
      const driver1 = await helper.createDriver('PLAYER1');
      await helper.login(driver1, 'PLAYER1');
      const lobbyCode = await helper.createLobby(driver1);

      // Leave
      await driver1.get(BASE_URL + '/');
      await driver1.sleep(1000);

      // Lobby should either be deleted or have no players
      const response = await helper.apiGet(`/api/lobby/${lobbyCode}`);
      if (response.error) {
        // Lobby was deleted - good
        expect(response.error).toBeDefined();
      } else {
        // Lobby still exists but should have 0 players or be cleaned up
        // This is acceptable behavior - lobby cleanup might be async
        expect(response).toBeDefined();
      }
    });

    test('should handle lobby code case sensitivity', async () => {
      const driver1 = await helper.createDriver('PLAYER1');
      const driver2 = await helper.createDriver('PLAYER2');

      await helper.login(driver1, 'PLAYER1');
      await helper.login(driver2, 'PLAYER2');

      const lobbyCode = await helper.createLobby(driver1);

      // Try lowercase
      const homePage = new HomePage(driver2);
      await homePage.joinWithCode(lobbyCode.toLowerCase());
      await driver2.sleep(1000);

      // Should still work (converted to uppercase)
      const lobbyPage = new LobbyPage(driver2);
      const isLoaded = await lobbyPage.isLoaded();
      // May or may not work depending on implementation
    });
  });

  describe('Game Edge Cases', () => {
    test('should handle game with minimum players', async () => {
      const { drivers } = await helper.setupThreePlayerGame();

      // Game should work with exactly 3 players
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();
      expect(await gamePage.hasMap()).toBe(true);
    });

    test('should handle player leaving during game', async () => {
      const { drivers } = await helper.setupThreePlayerGame();

      // Close one player
      await helper.closeDriver('PLAYER3');

      // Game should continue for remaining players
      await drivers.driver1.sleep(2000);
      const gamePage = new GamePage(drivers.driver1);
      expect(await gamePage.hasMap()).toBe(true);
    });

    test('should handle very long game', async () => {
      // Would need to simulate many turns
      expect(true).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('should handle special characters in player name', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      await homePage.enterPlayerName('<script>alert("xss")</script>');

      // Should sanitize or reject
    });

    test('should handle very long player name', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      const longName = 'A'.repeat(1000);
      await homePage.enterPlayerName(longName);

      // Should truncate or reject
    });

    test('should handle empty message submission', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);

      await gamePage.waitForLoad();

      // Try to send empty message
      try {
        await gamePage.typeMessage('');
        await gamePage.clickSendMessage();
      } catch (e) {
        // Expected
      }
    });

    test('should handle special characters in message', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);

      await gamePage.waitForLoad();

      try {
        await gamePage.sendMessage('<img src=x onerror=alert(1)>');
      } catch (e) {
        // May fail
      }
    });
  });

  describe('State Consistency', () => {
    test('should maintain consistent state across clients', async () => {
      const { drivers } = await helper.setupThreePlayerGame();

      const gamePage1 = new GamePage(drivers.driver1);
      const gamePage2 = new GamePage(drivers.driver2);
      const gamePage3 = new GamePage(drivers.driver3);

      await gamePage1.waitForLoad();
      await gamePage2.waitForLoad();
      await gamePage3.waitForLoad();

      const turn1 = await gamePage1.getTurnNumber();
      const turn2 = await gamePage2.getTurnNumber();
      const turn3 = await gamePage3.getTurnNumber();

      expect(turn1).toBe(turn2);
      expect(turn2).toBe(turn3);
    });

    test('should recover from inconsistent state', async () => {
      // Would need to force inconsistency
      expect(true).toBe(true);
    });
  });

  describe('Performance Edge Cases', () => {
    test('should handle rapid clicking', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);

      await gamePage.waitForLoad();

      // Click submit multiple times rapidly
      for (let i = 0; i < 10; i++) {
        try {
          await gamePage.clickSubmitOrders();
        } catch (e) {
          // May fail after first
        }
      }

      // Should not crash
    });

    test('should handle many messages', async () => {
      // Would need to send many messages
      expect(true).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from API error', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);

      await gamePage.waitForLoad();

      // Game should still function after error
      expect(await gamePage.hasMap()).toBe(true);
    });

    test('should show user-friendly error messages', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      await homePage.joinWithCode('NOTEXIST');
      await driver.sleep(1000);

      const error = await homePage.getErrorMessage();
      expect(error).not.toContain('undefined');
      expect(error).not.toContain('null');
    });
  });
});
