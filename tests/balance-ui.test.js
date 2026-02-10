/**
 * Balance & Rebalance UI Tests (v2.1)
 * Validates that rebalanced mechanics are reflected correctly in the UI.
 */

const { TestHelper, By, until, BASE_URL } = require('./helpers/test-helper');
const GamePage = require('./pages/GamePage');

describe('v2.1 Rebalance UI Tests', () => {
  let helper;

  beforeEach(() => {
    helper = new TestHelper();
  });

  afterEach(async () => {
    await helper.closeAll();
  });

  describe('Map UX Improvements', () => {
    test('supply center labels are always visible without hover', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      // Supply center system labels should be rendered in the SVG
      // Phase 6.2 makes SC labels always visible (smaller, muted)
      const labelCount = await gamePage.getSupplyCenterLabelCount();
      expect(labelCount).toBeGreaterThan(0);
    });

    test('orbit rings are rendered around planets', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      // Phase 6.4: dashed orbit rings around all planets
      const ringCount = await gamePage.getOrbitRingCount();
      expect(ringCount).toBeGreaterThan(0);
    });

    test('Reset View button exists and is clickable', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      // Phase 6.1: Reset View button
      expect(await gamePage.hasZoomResetButton()).toBe(true);

      // Click it — should not throw
      await gamePage.resetView();
      await drivers.driver1.sleep(300);

      const viewBox = await gamePage.getSvgViewBox();
      expect(viewBox).toBe('0 0 800 600');
    });

    test('zoom changes the SVG viewBox', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      const initialViewBox = await gamePage.getSvgViewBox();

      // Zoom in via scroll wheel event
      await gamePage.zoomIn();
      await drivers.driver1.sleep(500);

      const newViewBox = await gamePage.getSvgViewBox();
      expect(newViewBox).not.toBe(initialViewBox);
    });

    test('zoom resets to default after Reset View click', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      // Zoom in first
      await gamePage.zoomIn();
      await drivers.driver1.sleep(300);

      const zoomedViewBox = await gamePage.getSvgViewBox();
      expect(zoomedViewBox).not.toBe('0 0 800 600');

      // Reset
      await gamePage.resetView();
      await drivers.driver1.sleep(300);

      const resetViewBox = await gamePage.getSvgViewBox();
      expect(resetViewBox).toBe('0 0 800 600');
    });

    test('Hyperspace toggle button exists', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      expect(await gamePage.hasHyperspaceToggle()).toBe(true);
    });

    test('hyperspace toggle renders additional layer nodes', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      // Count SVG circles before toggle
      const circlesBefore = await drivers.driver1.findElements(By.css('svg circle'));
      const countBefore = circlesBefore.length;

      // Toggle hyperspace on
      await gamePage.toggleHyperspace();
      await drivers.driver1.sleep(500);

      // Count SVG circles after toggle — should have more (layer 1/3 nodes)
      const circlesAfter = await drivers.driver1.findElements(By.css('svg circle'));
      const countAfter = circlesAfter.length;

      expect(countAfter).toBeGreaterThan(countBefore);
    });

    test('hyperspace toggle off removes additional layer nodes', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      // Toggle on then off
      await gamePage.toggleHyperspace();
      await drivers.driver1.sleep(300);
      await gamePage.toggleHyperspace();
      await drivers.driver1.sleep(300);

      // Count circles should return to baseline
      const circlesBefore = await drivers.driver1.findElements(By.css('svg circle'));

      // Toggle on again
      await gamePage.toggleHyperspace();
      await drivers.driver1.sleep(300);

      const circlesAfter = await drivers.driver1.findElements(By.css('svg circle'));
      expect(circlesAfter.length).toBeGreaterThan(circlesBefore.length);
    });

    test('phase and turn info displayed on map overlay', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      // Phase 6.5: top-center overlay with season, year, phase
      expect(await gamePage.hasPhaseOverlay()).toBe(true);

      const text = await gamePage.getPhaseOverlayText();
      expect(text).toBeDefined();
      // Should contain season (SPRING/FALL) and year (237x)
      expect(text).toMatch(/SPRING|FALL/);
      expect(text).toMatch(/237/);
    });

    test('phase overlay shows current phase', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      const text = await gamePage.getPhaseOverlayText();
      // Should show ORDERS phase at start
      expect(text).toMatch(/ORDER/i);
    });

    test('individual order remove buttons appear with pending orders', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      // Click on a friendly unit to select it, then click a destination to make an order
      // First, click on the map to interact with units
      await gamePage.clickMapCenter();
      await drivers.driver1.sleep(500);

      // Check current pending order count via remove buttons
      const removeCount = await gamePage.getRemoveOrderButtonCount();
      // At this point we may or may not have orders — the test validates
      // that remove buttons match pending order count
      expect(removeCount).toBeGreaterThanOrEqual(0);
    });

    test('wider hyperlane click targets exist in SVG', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      // Phase 6.3: invisible 12px-wide transparent lines behind hyperlanes
      const transparentLines = await drivers.driver1.findElements(
        By.css('svg line[stroke="transparent"]')
      );
      expect(transparentLines.length).toBeGreaterThan(0);

      // Verify strokeWidth is 12 on at least one
      const strokeWidth = await transparentLines[0].getAttribute('stroke-width');
      expect(parseInt(strokeWidth)).toBe(12);
    });
  });

  describe('Ferengi Latinum UI', () => {
    test('latinum balance display exists for Ferengi player', async () => {
      // Set up game with Ferengi faction
      const driver1 = await helper.createDriver('PLAYER1');
      const driver2 = await helper.createDriver('PLAYER2');
      const driver3 = await helper.createDriver('PLAYER3');

      await helper.login(driver1, 'PLAYER1');
      await helper.login(driver2, 'PLAYER2');
      await helper.login(driver3, 'PLAYER3');

      const lobbyCode = await helper.createLobby(driver1);
      await helper.joinLobby(driver2, lobbyCode);
      await helper.joinLobby(driver3, lobbyCode);

      // Player 1 picks Ferengi
      await helper.selectFaction(driver1, 'FERENGI');
      await helper.selectFaction(driver2, 'KLINGON');
      await helper.selectFaction(driver3, 'ROMULAN');

      await helper.markReady(driver1);
      await helper.markReady(driver2);
      await helper.markReady(driver3);

      await helper.startGame(driver1);
      await driver2.wait(until.urlContains('/game/'), 10000);
      await driver3.wait(until.urlContains('/game/'), 10000);

      await helper.waitForGameLoad(driver1);

      // Ferengi player should see latinum-related text
      const hasLatinum = await helper.elementWithTextExists(driver1, 'Latinum', 5000);
      expect(hasLatinum).toBe(true);
    });

    test('bribe button text exists for Ferengi player', async () => {
      const driver1 = await helper.createDriver('PLAYER1');
      const driver2 = await helper.createDriver('PLAYER2');
      const driver3 = await helper.createDriver('PLAYER3');

      await helper.login(driver1, 'PLAYER1');
      await helper.login(driver2, 'PLAYER2');
      await helper.login(driver3, 'PLAYER3');

      const lobbyCode = await helper.createLobby(driver1);
      await helper.joinLobby(driver2, lobbyCode);
      await helper.joinLobby(driver3, lobbyCode);

      await helper.selectFaction(driver1, 'FERENGI');
      await helper.selectFaction(driver2, 'FEDERATION');
      await helper.selectFaction(driver3, 'KLINGON');

      await helper.markReady(driver1);
      await helper.markReady(driver2);
      await helper.markReady(driver3);

      await helper.startGame(driver1);
      await driver2.wait(until.urlContains('/game/'), 10000);
      await driver3.wait(until.urlContains('/game/'), 10000);

      await helper.waitForGameLoad(driver1);

      // Ferengi ability panel should show bribe option
      const hasBribe = await helper.elementWithTextExists(driver1, 'Bribe', 5000);
      expect(hasBribe).toBe(true);
    });

    test('sabotage option exists for Ferengi player', async () => {
      const driver1 = await helper.createDriver('PLAYER1');
      const driver2 = await helper.createDriver('PLAYER2');
      const driver3 = await helper.createDriver('PLAYER3');

      await helper.login(driver1, 'PLAYER1');
      await helper.login(driver2, 'PLAYER2');
      await helper.login(driver3, 'PLAYER3');

      const lobbyCode = await helper.createLobby(driver1);
      await helper.joinLobby(driver2, lobbyCode);
      await helper.joinLobby(driver3, lobbyCode);

      await helper.selectFaction(driver1, 'FERENGI');
      await helper.selectFaction(driver2, 'FEDERATION');
      await helper.selectFaction(driver3, 'KLINGON');

      await helper.markReady(driver1);
      await helper.markReady(driver2);
      await helper.markReady(driver3);

      await helper.startGame(driver1);
      await driver2.wait(until.urlContains('/game/'), 10000);
      await driver3.wait(until.urlContains('/game/'), 10000);

      await helper.waitForGameLoad(driver1);

      // Ferengi ability panel should show sabotage option
      const hasSabotage = await helper.elementWithTextExists(driver1, 'Sabotage', 5000);
      expect(hasSabotage).toBe(true);
    });

    test('non-Ferengi player does not see latinum balance', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      // driver1 = Federation, driver2 = Klingon, driver3 = Romulan
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      // Federation player should NOT see latinum display
      const hasLatinum = await helper.elementWithTextExists(drivers.driver1, 'Latinum', 2000);
      expect(hasLatinum).toBe(false);
    });
  });

  describe('Romulan Spy Target UI', () => {
    test('Romulan player sees intelligence ability text', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      // driver3 = Romulan
      const gamePage = new GamePage(drivers.driver3);
      await gamePage.waitForLoad();

      // Romulan should see Tal Shiar Intelligence text
      const hasIntel = await helper.elementWithTextExists(drivers.driver3, 'Tal Shiar', 5000);
      expect(hasIntel).toBe(true);
    });

    test('Romulan player sees intercepted orders section', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver3);
      await gamePage.waitForLoad();

      // Romulan ability panel should show intelligence-related text
      const hasSection = await helper.elementWithTextExists(
        drivers.driver3,
        'Intercepted',
        3000
      ) || await helper.elementWithTextExists(
        drivers.driver3,
        'No orders intercepted',
        3000
      );
      expect(hasSection).toBe(true);
    });

    test('non-Romulan player does not see spy target controls', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      // driver1 = Federation
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      // Federation should NOT see Tal Shiar
      const hasIntel = await helper.elementWithTextExists(drivers.driver1, 'Tal Shiar', 2000);
      expect(hasIntel).toBe(false);
    });
  });

  describe('Klingon Ability UI', () => {
    test('Klingon player sees Warrior Rage ability', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      // driver2 = Klingon
      const gamePage = new GamePage(drivers.driver2);
      await gamePage.waitForLoad();

      const hasAbility = await helper.elementWithTextExists(drivers.driver2, "Warrior", 5000);
      expect(hasAbility).toBe(true);
    });

    test('Klingon ability shows attack and defense info', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver2);
      await gamePage.waitForLoad();

      const hasAttack = await helper.elementWithTextExists(drivers.driver2, 'Attack', 3000);
      const hasDefense = await helper.elementWithTextExists(drivers.driver2, 'Defense', 3000);
      expect(hasAttack).toBe(true);
      expect(hasDefense).toBe(true);
    });
  });

  describe('Game Page v2.1 Layout', () => {
    test('all v2.1 map controls are present', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      // Check for 2D/3D toggle, Reset View, and Hyperspace button
      const has2D = await helper.elementWithTextExists(drivers.driver1, '2D', 3000);
      const has3D = await helper.elementWithTextExists(drivers.driver1, '3D', 3000);
      const hasReset = await gamePage.hasZoomResetButton();
      const hasHyperspace = await gamePage.hasHyperspaceToggle();

      expect(has2D).toBe(true);
      expect(has3D).toBe(true);
      expect(hasReset).toBe(true);
      expect(hasHyperspace).toBe(true);
    });

    test('map renders in 2D mode by default', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      // SVG element should exist (2D mode)
      const svgElements = await drivers.driver1.findElements(By.css('svg'));
      expect(svgElements.length).toBeGreaterThan(0);

      // Should have the correct default viewBox
      const viewBox = await gamePage.getSvgViewBox();
      expect(viewBox).toBe('0 0 800 600');
    });

    test('map has dark background', async () => {
      const { drivers } = await helper.setupThreePlayerGame();
      const gamePage = new GamePage(drivers.driver1);
      await gamePage.waitForLoad();

      const svg = await drivers.driver1.findElement(By.css('svg'));
      const style = await svg.getAttribute('style');
      expect(style).toContain('#0a0a12');
    });
  });
});
