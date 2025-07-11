const JsonDatabase = require('./implementations/JsonDatabase');

/**
 * Database factory for creating database instances
 * This allows easy switching between different database implementations
 */
class DatabaseFactory {
  static instance = null;

  /**
   * Get database instance (singleton pattern)
   * @param {string} type - Database type ('json', 'mongodb', 'mysql', etc.)
   * @param {Object} config - Database configuration
   * @returns {IDatabase} Database instance
   */
  static getInstance(type = 'json', config = {}) {
    if (!DatabaseFactory.instance) {
      DatabaseFactory.instance = DatabaseFactory.createDatabase(type, config);
    }
    return DatabaseFactory.instance;
  }

  /**
   * Create a new database instance
   * @param {string} type - Database type
   * @param {Object} config - Database configuration
   * @returns {IDatabase} Database instance
   */
  static createDatabase(type, config) {
    switch (type.toLowerCase()) {
      case 'json':
        return new JsonDatabase(config.dataDir);
      
      case 'mongodb':
        // TODO: Implement MongoDB database
        throw new Error('MongoDB implementation not yet available');
      
      case 'mysql':
        // TODO: Implement MySQL database
        throw new Error('MySQL implementation not yet available');
      
      case 'postgresql':
        // TODO: Implement PostgreSQL database
        throw new Error('PostgreSQL implementation not yet available');
      
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset() {
    DatabaseFactory.instance = null;
  }
}

module.exports = DatabaseFactory;
