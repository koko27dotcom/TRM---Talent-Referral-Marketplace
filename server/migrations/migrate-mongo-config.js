/**
 * Migration Configuration for TRM Platform
 * Using migrate-mongo for MongoDB schema migrations
 * https://github.com/seppevs/migrate-mongo
 */

const config = {
  mongodb: {
    // Connection string from environment or default
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    
    // Database name
    databaseName: process.env.MONGODB_DATABASE || 'trm_production',
    
    // Connection options
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  // Directory where migration files are stored
  migrationsDir: 'server/migrations/scripts',

  // Directory where changelog is stored
  changelogCollectionName: 'migrations',

  // File extension for migration files
  migrationFileExtension: '.js',

  // Enable/disable logs
  useFileHash: false,

  // Module system (commonjs or esm)
  moduleSystem: 'commonjs',
};

module.exports = config;
