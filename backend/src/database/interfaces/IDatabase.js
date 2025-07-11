/**
 * Database interface for abstraction layer
 * This allows easy switching between JSON file storage and actual databases
 */
class IDatabase {
  /**
   * Find all records in a collection
   * @param {string} collection - Collection name
   * @returns {Promise<Array>} Array of records
   */
  async findAll(collection) {
    throw new Error('Method not implemented');
  }

  /**
   * Find a record by ID
   * @param {string} collection - Collection name
   * @param {string} id - Record ID
   * @returns {Promise<Object|null>} Record or null if not found
   */
  async findById(collection, id) {
    throw new Error('Method not implemented');
  }

  /**
   * Find records by criteria
   * @param {string} collection - Collection name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Array of matching records
   */
  async findBy(collection, criteria) {
    throw new Error('Method not implemented');
  }

  /**
   * Create a new record
   * @param {string} collection - Collection name
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record
   */
  async create(collection, data) {
    throw new Error('Method not implemented');
  }

  /**
   * Update a record by ID
   * @param {string} collection - Collection name
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>} Updated record or null if not found
   */
  async updateById(collection, id, data) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete a record by ID
   * @param {string} collection - Collection name
   * @param {string} id - Record ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteById(collection, id) {
    throw new Error('Method not implemented');
  }

  /**
   * Count records in a collection
   * @param {string} collection - Collection name
   * @param {Object} criteria - Optional search criteria
   * @returns {Promise<number>} Number of records
   */
  async count(collection, criteria = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if database connection is healthy
   * @returns {Promise<boolean>} True if healthy
   */
  async isHealthy() {
    throw new Error('Method not implemented');
  }
}

module.exports = IDatabase;
