const BaseRepository = require('./BaseRepository');

/**
 * Template repository for managing message templates
 */
class TemplateRepository extends BaseRepository {
  constructor(database) {
    super(database, 'templates');
  }

  /**
   * Find templates by category
   * @param {string} category - Template category
   * @returns {Promise<Array>} Array of templates
   */
  async findByCategory(category) {
    return await this.findBy({ category });
  }

  /**
   * Find templates by type
   * @param {string} type - Template type
   * @returns {Promise<Array>} Array of templates
   */
  async findByType(type) {
    return await this.findBy({ type });
  }

  /**
   * Search templates by name or content
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching templates
   */
  async search(query) {
    const allTemplates = await this.findAll();
    const searchTerm = query.toLowerCase();
    
    return allTemplates.filter(template => 
      template.name.toLowerCase().includes(searchTerm) ||
      template.content.toLowerCase().includes(searchTerm) ||
      (template.description && template.description.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Find templates with filters
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Array of filtered templates
   */
  async findWithFilters(filters = {}) {
    let templates = await this.findAll();

    // Filter by category
    if (filters.category) {
      templates = templates.filter(t => t.category === filters.category);
    }

    // Filter by type
    if (filters.type) {
      templates = templates.filter(t => t.type === filters.type);
    }

    // Search by query
    if (filters.searchQuery) {
      const searchTerm = filters.searchQuery.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(searchTerm) ||
        t.content.toLowerCase().includes(searchTerm) ||
        (t.description && t.description.toLowerCase().includes(searchTerm))
      );
    }

    return templates;
  }

  /**
   * Check if template name already exists
   * @param {string} name - Template name
   * @param {string} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} True if name exists
   */
  async nameExists(name, excludeId = null) {
    const templates = await this.findBy({ name });
    return templates.some(t => t.id !== excludeId);
  }

  /**
   * Validate template data
   * @param {Object} data - Template data
   * @returns {Object} Validation result
   */
  validate(data) {
    const errors = [];

    // Required fields
    if (!data.name || !data.name.trim()) {
      errors.push('Template name is required');
    }

    if (!data.type) {
      errors.push('Template type is required');
    }

    if (!data.category) {
      errors.push('Template category is required');
    }

    if (!data.content || !data.content.trim()) {
      errors.push('Template content is required');
    }

    // Validate type
    const validTypes = ['text', 'text-with-image', 'text-with-video', 'text-with-document'];
    if (data.type && !validTypes.includes(data.type)) {
      errors.push('Invalid template type');
    }

    // Validate category
    const validCategories = ['marketing', 'customer-support', 'notifications', 'greetings', 'announcements', 'follow-up', 'other'];
    if (data.category && !validCategories.includes(data.category)) {
      errors.push('Invalid template category');
    }

    // Validate media requirement
    if (data.type && data.type !== 'text' && !data.media) {
      errors.push(`Media is required for template type: ${data.type}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Transform data before saving
   * @param {Object} data - Template data
   * @returns {Object} Transformed data
   */
  beforeSave(data) {
    return {
      ...data,
      name: data.name?.trim(),
      content: data.content?.trim(),
      description: data.description?.trim() || ''
    };
  }

  /**
   * Get templates grouped by category
   * @returns {Promise<Object>} Templates grouped by category
   */
  async getGroupedByCategory() {
    const templates = await this.findAll();
    const grouped = {};

    templates.forEach(template => {
      if (!grouped[template.category]) {
        grouped[template.category] = [];
      }
      grouped[template.category].push(template);
    });

    return grouped;
  }

  /**
   * Get template statistics
   * @returns {Promise<Object>} Template statistics
   */
  async getStatistics() {
    const templates = await this.findAll();
    const stats = {
      total: templates.length,
      byCategory: {},
      byType: {}
    };

    templates.forEach(template => {
      // Count by category
      stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;
      
      // Count by type
      stats.byType[template.type] = (stats.byType[template.type] || 0) + 1;
    });

    return stats;
  }
}

module.exports = TemplateRepository;
