/**
 * Jest setup for Selenium tests
 */

require('dotenv').config();

// Increase timeout for Selenium operations
jest.setTimeout(120000);

// Global test configuration
global.testConfig = {
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  seleniumUrl: process.env.SELENIUM_HUB_URL || null, // null = use local chromedriver
  headless: process.env.HEADLESS !== 'false',
};

console.log('Test Configuration:', global.testConfig);
