/**
 * Database Configuration
 * MongoDB connection setup with Mongoose
 * Includes connection pooling, error handling, and reconnection logic
 * Enhanced for Railway deployment with retry logic and better error handling
 */

const mongoose = require('mongoose');

// Connection options for production-ready MongoDB connection
const connectionOptions = {
  maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE) || 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT) || 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true,
  w: 'majority',
  // Railway-specific: Add buffer commands for stability
  bufferCommands: true,
};

// Retry configuration for Railway deployments
const RETRY_CONFIG = {
  maxRetries: parseInt(process.env.MONGODB_RETRY_ATTEMPTS) || 5,
  retryDelay: parseInt(process.env.MONGODB_RETRY_DELAY) || 3000, // 3 seconds
  maxRetryDelay: 30000, // 30 seconds max
};

/**
 * Connect to MongoDB database with retry logic
 * @returns {Promise<typeof mongoose>} Mongoose connection instance
 */
const connectDatabase = async (retryCount = 0) => {
  try {
    // Support multiple MongoDB URI formats for Railway
    const mongoUri = process.env.MONGODB_URI || 
                     process.env.MONGO_URL || 
                     process.env.DATABASE_URL ||
                     'mongodb://localhost:27017/saramart-referral';
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Log connection attempt (without exposing credentials)
    const sanitizedUri = mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`[Database] Connecting to MongoDB: ${sanitizedUri}`);

    // Connect to MongoDB
    const conn = await mongoose.connect(mongoUri, connectionOptions);

    console.log(`[Database] ✅ MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error(`[Database] ❌ MongoDB Connection Error (Attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries}):`, error.message);
    
    // Retry logic for Railway deployments
    if (retryCount < RETRY_CONFIG.maxRetries) {
      const delay = Math.min(
        RETRY_CONFIG.retryDelay * Math.pow(2, retryCount), // Exponential backoff
        RETRY_CONFIG.maxRetryDelay
      );
      
      console.log(`[Database] 🔄 Retrying connection in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectDatabase(retryCount + 1);
    }
    
    // All retries exhausted
    console.error('[Database] ❌ All connection attempts failed');
    console.error('[Database] Troubleshooting tips:');
    console.error('  1. Check if MONGODB_URI is set correctly in Railway variables');
    console.error('  2. Verify MongoDB service is running (Railway plugin or external)');
    console.error('  3. Check network connectivity and firewall rules');
    console.error('  4. Ensure MongoDB user has correct permissions');
    
    // Don't exit immediately on Railway - let the platform handle restarts
    if (process.env.RAILWAY_ENVIRONMENT) {
      console.error('[Database] Railway environment detected - waiting for platform restart');
      // Keep process alive briefly to allow Railway to capture logs
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB database
 * Used for graceful shutdown
 */
const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    console.log('[Database] MongoDB Disconnected');
  } catch (error) {
    console.error('[Database] MongoDB Disconnection Error:', error.message);
    process.exit(1);
  }
};

/**
 * Check if database connection is healthy
 * @returns {boolean} Connection status
 */
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Get database connection stats
 * @returns {Object} Connection statistics
 */
const getConnectionStats = () => {
  return {
    readyState: mongoose.connection.readyState,
    readyStateText: getReadyStateText(mongoose.connection.readyState),
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    models: Object.keys(mongoose.models),
  };
};

/**
 * Get human-readable ready state text
 * @param {number} state - Mongoose ready state
 * @returns {string} Human-readable state
 */
const getReadyStateText = (state) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[state] || 'unknown';
};

/**
 * Ping database to verify connectivity
 * @returns {Promise<boolean>} True if ping successful
 */
const pingDatabase = async () => {
  try {
    if (!isDatabaseConnected()) {
      return false;
    }
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    console.error('[Database] Ping failed:', error.message);
    return false;
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('[Database] Mongoose connected to database');
});

mongoose.connection.on('error', (err) => {
  console.error('[Database] Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('[Database] Mongoose disconnected from database');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] Mongoose reconnected to database');
});

// Handle process termination - graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

module.exports = {
  connectDatabase,
  disconnectDatabase,
  isDatabaseConnected,
  getConnectionStats,
  pingDatabase,
};
