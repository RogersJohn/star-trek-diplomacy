/**
 * Smoke Tests
 * Quick validation that core functionality works
 */

const { TestHelper, BASE_URL } = require('./helpers/test-helper');
const LoginPage = require('./pages/LoginPage');
const HomePage = require('./pages/HomePage');
const LobbyPage = require('./pages/LobbyPage');
const GamePage = require('./pages/GamePage');

describe('Smoke Tests', () => {
  let helper;

  beforeEach(() => {
    helper = new TestHelper();
  });

  afterEach(async () => {
    await helper.closeAll();
  });

  test('should load login page', async () => {
    const driver = await helper.createDriver('PLAYER1');
    await helper.navigateAndClear(driver);

    const loginPage = new LoginPage(driver);
    expect(await loginPage.isLoaded()).toBe(true);
  });

  test('should login successfully', async () => {
    const driver = await helper.createDriver('PLAYER1');
    await helper.login(driver, 'PLAYER1');

    const homePage = new HomePage(driver);
    expect(await homePage.isLoaded()).toBe(true);
  });

  test('should create lobby', async () => {
    const driver = await helper.createDriver('PLAYER1');
    await helper.login(driver, 'PLAYER1');

    const lobbyCode = await helper.createLobby(driver);
    expect(lobbyCode.length).toBe(6);
  });

  test('should join lobby', async () => {
    const driver1 = await helper.createDriver('PLAYER1');
    const driver2 = await helper.createDriver('PLAYER2');

    await helper.login(driver1, 'PLAYER1');
    await helper.login(driver2, 'PLAYER2');

    const lobbyCode = await helper.createLobby(driver1);
    await helper.joinLobby(driver2, lobbyCode);

    const lobbyPage = new LobbyPage(driver2);
    expect(await lobbyPage.isLoaded()).toBe(true);
  });

  test('should start 3-player game', async () => {
    const { gameId, drivers } = await helper.setupThreePlayerGame();

    expect(gameId).toBeDefined();
    expect(gameId.length).toBe(6);

    const gamePage = new GamePage(drivers.driver1);
    expect(await gamePage.hasMap()).toBe(true);
  });

  test('should load game state', async () => {
    const { drivers } = await helper.setupThreePlayerGame();
    const gamePage = new GamePage(drivers.driver1);

    await gamePage.waitForLoad();
    const turn = await gamePage.getTurnNumber();
    expect(turn).toBe(1);
  });
});
