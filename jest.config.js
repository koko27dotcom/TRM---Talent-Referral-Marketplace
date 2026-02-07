/**
 * Jest Configuration for TRM Referral Platform Backend
 * Comprehensive test configuration with coverage settings
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directories for tests
  roots: ['<rootDir>/server', '<rootDir>/tests'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
  ],

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // Module name mapper for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/server/$1',
    '^@models/(.*)$': '<rootDir>/server/models/$1',
    '^@services/(.*)$': '<rootDir>/server/services/$1',
    '^@middleware/(.*)$': '<rootDir>/server/middleware/$1',
    '^@utils/(.*)$': '<rootDir>/server/utils/$1',
    '^@config/(.*)$': '<rootDir>/server/config/$1',
    '^@routes/(.*)$': '<rootDir>/server/routes/$1',
  },

  // Setup files
  setupFiles: ['<rootDir>/tests/setup/env-setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest-setup.js'],

  // Coverage configuration
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/**/*.test.js',
    '!server/**/*.spec.js',
    '!server/seeders/**',
    '!server/scripts/**',
    '!**/node_modules/**',
  ],

  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after all tests complete
  forceExit: true,

  // Global test configuration
  globals: {
    'process.env.NODE_ENV': 'test',
  },

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/reports',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
  ],

  // Module path ignore patterns
  modulePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
  ],

  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',

  // Error on deprecated
  errorOnDeprecated: true,

  // Notify mode
  notify: true,
  notifyMode: 'failure-change',
};
