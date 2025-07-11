/**
 * Base repository class providing common CRUD operations
 * All specific repositories should extend this class
 */
class BaseRepository {
  constructor(database, collectionName) {
    this.db = database;
    this.collection = collectionName;
  }

  /**
   * Find all records
   * @returns {Promise<Array>} Array of records
   */
  async findAll() {
    return await this.db.findAll(this.collection);
  }

  /**
   * Find a record by ID
   * @param {string} id - Record ID
   * @returns {Promise<Object|null>} Record or null if not found
   */
  async findById(id) {
    return await this.db.findById(this.collection, id);
  }

  /**
   * Find records by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Array of matching records
   */
  async findBy(criteria) {
    return await this.db.findBy(this.collection, criteria);
  }

  /**
   * Find one record by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object|null>} First matching record or null
   */
  async findOneBy(criteria) {
    const results = await this.findBy(criteria);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record
   */
  async create(data) {
    return await this.db.create(this.collection, data);
  }

  /**
   * Update a record by ID
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>} Updated record or null if not found
   */
  async updateById(id, data) {
    return await this.db.updateById(this.collection, id, data);
  }

  /**
   * Delete a record by ID
   * @param {string} id - Record ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteById(id) {
    return await this.db.deleteById(this.collection, id);
  }

  /**
   * Count records
   * @param {Object} criteria - Optional search criteria
   * @returns {Promise<number>} Number of records
   */
  async count(criteria = {}) {
    return await this.db.count(this.collection, criteria);
  }

  /**
   * Check if a record exists by ID
   * @param {string} id - Record ID
   * @returns {Promise<boolean>} True if exists
   */
  async exists(id) {
    const record = await this.findById(id);
    return record !== null;
  }

  /**
   * Validate data before operations (override in child classes)
   * @param {Object} data - Data to validate
   * @returns {Object} Validation result { isValid: boolean, errors: Array }
   */
  validate(data) {
    return { isValid: true, errors: [] };
  }

  /**
   * Transform data before saving (override in child classes)
   * @param {Object} data - Data to transform
   * @returns {Object} Transformed data
   */
  beforeSave(data) {
    return data;
  }

  /**
   * Transform data after loading (override in child classes)
   * @param {Object} data - Data to transform
   * @returns {Object} Transformed data
   */
  afterLoad(data) {
    return data;
  }
}

module.exports = BaseRepository;
