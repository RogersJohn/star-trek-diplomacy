/**
 * Authentication Tests
 * Tests for dev mode login, session management, and logout
 */

const { TestHelper, PLAYERS, BASE_URL, By, until } = require('./helpers/test-helper');
const LoginPage = require('./pages/LoginPage');
const HomePage = require('./pages/HomePage');

describe('Authentication Tests', () => {
  let helper;

  beforeEach(() => {
    helper = new TestHelper();
  });

  afterEach(async () => {
    await helper.closeAll();
  });

  describe('Login Page Display', () => {
    test('should display dev mode login page', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.navigateAndClear(driver);

      const loginPage = new LoginPage(driver);
      expect(await loginPage.isLoaded()).toBe(true);
    });

    test('should show DEV MODE label', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.navigateAndClear(driver);

      const loginPage = new LoginPage(driver);
      expect(await loginPage.hasDevModeLabel()).toBe(true);
    });

    test('should show game title', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.navigateAndClear(driver);

      const loginPage = new LoginPage(driver);
      expect(await loginPage.hasTitle()).toBe(true);
    });

    test('should display 7 player buttons', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.navigateAndClear(driver);

      const loginPage = new LoginPage(driver);
      expect(await loginPage.getPlayerButtonCount()).toBe(7);
    });

    test('should have correct player button labels', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.navigateAndClear(driver);

      const loginPage = new LoginPage(driver);
      for (let i = 0; i < 7; i++) {
        const text = await loginPage.getPlayerButtonText(i);
        expect(text).toBe(`Player${i + 1}`);
      }
    });
  });

  describe('Login Functionality', () => {
    test('should login as Player1', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      expect(await homePage.isLoaded()).toBe(true);
    });

    test('should login as Player2', async () => {
      const driver = await helper.createDriver('PLAYER2');
      await helper.login(driver, 'PLAYER2');

      const homePage = new HomePage(driver);
      expect(await homePage.isLoaded()).toBe(true);
    });

    test('should login as Player7', async () => {
      const driver = await helper.createDriver('PLAYER7');
      await helper.login(driver, 'PLAYER7');

      const homePage = new HomePage(driver);
      expect(await homePage.isLoaded()).toBe(true);
    });

    test('should redirect to home after login', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const url = await driver.getCurrentUrl();
      expect(url).toBe(BASE_URL + '/');
    });

    test('should store user in localStorage after login', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const stored = await driver.executeScript(
        'return localStorage.getItem("dev_user")'
      );
      expect(stored).not.toBeNull();
      const user = JSON.parse(stored);
      expect(user.id).toBe('dev_player1');
    });
  });

  describe('Session Persistence', () => {
    test('should maintain session after page refresh', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      // Refresh the page
      await driver.navigate().refresh();
      await driver.sleep(1000);

      // Should still be on home page, not login
      const url = await driver.getCurrentUrl();
      expect(url).toBe(BASE_URL + '/');
    });

    test('should maintain session after navigation', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      // Navigate away and back
      await driver.get(BASE_URL + '/sign-in');
      await driver.sleep(500);
      await driver.get(BASE_URL + '/');
      await driver.sleep(500);

      const homePage = new HomePage(driver);
      expect(await homePage.isLoaded()).toBe(true);
    });
  });

  describe('Logout Functionality', () => {
    test('should show sign out button when logged in', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      expect(await homePage.isInDevMode()).toBe(true);
    });

    test('should logout and redirect to login', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      await homePage.signOut();

      await driver.sleep(1000);
      const loginPage = new LoginPage(driver);
      expect(await loginPage.isLoaded()).toBe(true);
    });

    test('should clear localStorage on logout', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await helper.login(driver, 'PLAYER1');

      const homePage = new HomePage(driver);
      await homePage.signOut();

      await driver.sleep(1000);
      const stored = await driver.executeScript(
        'return localStorage.getItem("dev_user")'
      );
      expect(stored).toBeNull();
    });
  });

  describe('Multiple Sessions', () => {
    test('should allow different players in different browsers', async () => {
      const driver1 = await helper.createDriver('PLAYER1');
      const driver2 = await helper.createDriver('PLAYER2');

      await helper.login(driver1, 'PLAYER1');
      await helper.login(driver2, 'PLAYER2');

      const homePage1 = new HomePage(driver1);
      const homePage2 = new HomePage(driver2);

      expect(await homePage1.isLoaded()).toBe(true);
      expect(await homePage2.isLoaded()).toBe(true);
    });

    test('should have separate localStorage per browser', async () => {
      const driver1 = await helper.createDriver('PLAYER1');
      const driver2 = await helper.createDriver('PLAYER2');

      await helper.login(driver1, 'PLAYER1');
      await helper.login(driver2, 'PLAYER2');

      const stored1 = await driver1.executeScript(
        'return localStorage.getItem("dev_user")'
      );
      const stored2 = await driver2.executeScript(
        'return localStorage.getItem("dev_user")'
      );

      const user1 = JSON.parse(stored1);
      const user2 = JSON.parse(stored2);

      expect(user1.id).toBe('dev_player1');
      expect(user2.id).toBe('dev_player2');
    });
  });

  describe('Protected Routes', () => {
    test('should redirect to login when accessing home without auth', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await driver.get(BASE_URL + '/');
      await driver.sleep(1000);

      const url = await driver.getCurrentUrl();
      expect(url).toContain('/sign-in');
    });

    test('should redirect to login when accessing lobby without auth', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await driver.get(BASE_URL + '/lobby/ABC123');
      await driver.sleep(1000);

      const url = await driver.getCurrentUrl();
      expect(url).toContain('/sign-in');
    });

    test('should redirect to login when accessing game without auth', async () => {
      const driver = await helper.createDriver('PLAYER1');
      await driver.get(BASE_URL + '/game/ABC123');
      await driver.sleep(1000);

      const url = await driver.getCurrentUrl();
      expect(url).toContain('/sign-in');
    });
  });
});
