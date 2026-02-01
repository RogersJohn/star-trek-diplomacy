/**
 * Jest Configuration for Selenium Tests
 */

module.exports = {
  testEnvironment: 'node',
  testTimeout: 120000,
  verbose: true,
  testMatch: ['**/*.test.js'],
  moduleFileExtensions: ['js'],
  maxWorkers: 1, // Run tests sequentially for Selenium
  bail: false, // Don't stop on first failure
  forceExit: true, // Force exit after tests complete
};
