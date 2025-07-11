const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const IDatabase = require('../interfaces/IDatabase');

/**
 * JSON file-based database implementation
 * This provides a simple file-based storage that can be easily replaced with a real database
 */
class JsonDatabase extends IDatabase {
  constructor(dataDir = path.join(__dirname, '../../data')) {
    super();
    this.dataDir = dataDir;
    this.collections = new Map(); // In-memory cache
    this.initialized = false;
  }

  /**
   * Initialize the database and load collections
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Load existing collections
      const files = await fs.readdir(this.dataDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const collectionName = file.replace('.json', '');
          await this.loadCollection(collectionName);
        }
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize JsonDatabase:', error);
      throw error;
    }
  }

  /**
   * Load a collection from file
   */
  async loadCollection(collectionName) {
    try {
      const filePath = path.join(this.dataDir, `${collectionName}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      this.collections.set(collectionName, JSON.parse(data));
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create empty collection
        this.collections.set(collectionName, []);
      } else {
        throw error;
      }
    }
  }

  /**
   * Save a collection to file
   */
  async saveCollection(collectionName) {
    try {
      const filePath = path.join(this.dataDir, `${collectionName}.json`);
      const data = this.collections.get(collectionName) || [];
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Failed to save collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get collection data
   */
  async getCollection(collectionName) {
    await this.initialize();
    
    if (!this.collections.has(collectionName)) {
      await this.loadCollection(collectionName);
    }
    
    return this.collections.get(collectionName) || [];
  }

  async findAll(collection) {
    const data = await this.getCollection(collection);
    return [...data]; // Return a copy
  }

  async findById(collection, id) {
    const data = await this.getCollection(collection);
    return data.find(item => item.id === id) || null;
  }

  async findBy(collection, criteria) {
    const data = await this.getCollection(collection);
    return data.filter(item => {
      return Object.keys(criteria).every(key => {
        if (typeof criteria[key] === 'string' && typeof item[key] === 'string') {
          return item[key].toLowerCase().includes(criteria[key].toLowerCase());
        }
        return item[key] === criteria[key];
      });
    });
  }

  async create(collection, data) {
    await this.initialize();
    
    const collectionData = await this.getCollection(collection);
    const newRecord = {
      id: uuidv4(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    collectionData.push(newRecord);
    this.collections.set(collection, collectionData);
    await this.saveCollection(collection);
    
    return newRecord;
  }

  async updateById(collection, id, updateData) {
    await this.initialize();
    
    const collectionData = await this.getCollection(collection);
    const index = collectionData.findIndex(item => item.id === id);
    
    if (index === -1) {
      return null;
    }
    
    const updatedRecord = {
      ...collectionData[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    collectionData[index] = updatedRecord;
    this.collections.set(collection, collectionData);
    await this.saveCollection(collection);
    
    return updatedRecord;
  }

  async deleteById(collection, id) {
    await this.initialize();
    
    const collectionData = await this.getCollection(collection);
    const index = collectionData.findIndex(item => item.id === id);
    
    if (index === -1) {
      return false;
    }
    
    collectionData.splice(index, 1);
    this.collections.set(collection, collectionData);
    await this.saveCollection(collection);
    
    return true;
  }

  async count(collection, criteria = {}) {
    if (Object.keys(criteria).length === 0) {
      const data = await this.getCollection(collection);
      return data.length;
    }
    
    const filteredData = await this.findBy(collection, criteria);
    return filteredData.length;
  }

  async isHealthy() {
    try {
      await this.initialize();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = JsonDatabase;
