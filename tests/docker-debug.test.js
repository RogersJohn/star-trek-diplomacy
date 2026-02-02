/**
 * Docker Debug Test - Verify container connectivity
 */

const { TestHelper, BASE_URL, API_URL } = require('./helpers/test-helper');

describe('Docker Connectivity Tests', () => {
  let helper;

  beforeAll(async () => {
    helper = new TestHelper();
    console.log('BASE_URL:', BASE_URL);
    console.log('API_URL:', API_URL);
  });

  afterAll(async () => {
    await helper.closeAll();
  });

  test('should reach backend health endpoint', async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      console.log('Backend health response:', data);
      expect(data.status).toBe('ok');
    } catch (error) {
      console.error('Backend health check failed:', error.message);
      throw error;
    }
  });

  test('should create Chrome driver', async () => {
    const driver = await helper.createDriver('PLAYER1');
    expect(driver).toBeDefined();
    console.log('Chrome driver created successfully');
  });

  test('should navigate to frontend', async () => {
    const driver = helper.getDriver('PLAYER1');
    console.log('Navigating to:', BASE_URL);

    await driver.get(BASE_URL);
    const title = await driver.getTitle();
    console.log('Page title:', title);

    const source = await driver.getPageSource();
    console.log('Page source length:', source.length);
    console.log('First 500 chars:', source.substring(0, 500));

    expect(source.length).toBeGreaterThan(100);
  });

  test('should see login page elements', async () => {
    const driver = helper.getDriver('PLAYER1');

    // Wait a bit for React to render
    await driver.sleep(3000);

    const source = await driver.getPageSource();
    console.log('Page source after wait:', source.substring(0, 1000));

    // Check if there's a root element
    const hasRoot = source.includes('id="root"');
    console.log('Has root element:', hasRoot);

    // Check for any React errors
    const hasError = source.includes('error') || source.includes('Error');
    console.log('Has error text:', hasError);
  });
});
