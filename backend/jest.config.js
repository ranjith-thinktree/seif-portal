module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/api/v1/services/**/*.js', '!src/api/v1/services/**/*.test.js'],
  testMatch: ['**/tests/**/*.test.js'],
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
