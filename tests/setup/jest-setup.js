/**
 * Jest Setup File
 * Runs after Jest is initialized, before tests run
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { connectDatabase, disconnectDatabase } = require('../../server/config/database');
const { redisClient, connectRedis, disconnectRedis } = require('../../server/config/redis');

// Global test timeout
jest.setTimeout(30000);

// MongoDB Memory Server instance
let mongod;

/**
 * Setup function - runs before all tests
 */
beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri();

  // Set the test database URI
  process.env.MONGODB_URI = mongoUri;

  // Connect to the in-memory database
  await connectDatabase();

  // Connect to Redis (if available)
  try {
    await connectRedis();
  } catch (error) {
    console.warn('Redis connection failed, continuing without cache:', error.message);
  }
});

/**
 * Cleanup function - runs after all tests
 */
afterAll(async () => {
  // Disconnect from database
  await disconnectDatabase();

  // Disconnect from Redis
  try {
    await disconnectRedis();
  } catch (error) {
    // Redis might not be connected
  }

  // Stop MongoDB Memory Server
  if (mongod) {
    await mongod.stop();
  }
});

/**
 * Cleanup between tests
 */
afterEach(async () => {
  // Clean up all collections
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }

  // Clear Redis keys (if connected)
  if (redisClient && redisClient.isReady) {
    try {
      await redisClient.flushDb();
    } catch (error) {
      // Redis might not be available
    }
  }

  // Clear all mocks
  jest.clearAllMocks();
});

/**
 * Global test utilities
 */
global.testUtils = {
  /**
   * Wait for a specified duration
   * @param {number} ms - Milliseconds to wait
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate a random string
   * @param {number} length - Length of the string
   * @returns {string}
   */
  randomString: (length = 10) => {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  /**
   * Generate a random email
   * @returns {string}
   */
  randomEmail: () => {
    return `test_${global.testUtils.randomString(8)}@example.com`;
  },

  /**
   * Generate a random ObjectId
   * @returns {mongoose.Types.ObjectId}
   */
  randomObjectId: () => {
    return new mongoose.Types.ObjectId();
  },

  /**
   * Mock console methods for clean test output
   */
  suppressConsole: () => {
    global.console.log = jest.fn();
    global.console.info = jest.fn();
    global.console.warn = jest.fn();
    global.console.error = jest.fn();
  },

  /**
   * Restore console methods
   */
  restoreConsole: () => {
    global.console.log = console.log;
    global.console.info = console.info;
    global.console.warn = console.warn;
    global.console.error = console.error;
  },
};

/**
 * Custom matchers
 */
expect.extend({
  /**
   * Check if value is a valid MongoDB ObjectId
   */
  toBeValidObjectId(received) {
    const isValid = mongoose.Types.ObjectId.isValid(received);
    return {
      message: () => `expected ${received} to be a valid ObjectId`,
      pass: isValid,
    };
  },

  /**
   * Check if date is within range
   */
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass,
    };
  },

  /**
   * Check if object contains specific keys
   */
  toContainKeys(received, keys) {
    const receivedKeys = Object.keys(received);
    const missingKeys = keys.filter(key => !receivedKeys.includes(key));
    return {
      message: () => `expected object to contain keys: ${missingKeys.join(', ')}`,
      pass: missingKeys.length === 0,
    };
  },
});

/**
 * Mock external APIs by default
 */
jest.mock('../../server/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendTemplatedEmail: jest.fn().mockResolvedValue({ success: true }),
  sendBulkEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../server/services/smsService', () => ({
  sendSMS: jest.fn().mockResolvedValue({ success: true }),
  sendBulkSMS: jest.fn().mockResolvedValue({ success: true }),
}));

// Silence console during tests unless explicitly needed
if (process.env.DEBUG_TESTS !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}
