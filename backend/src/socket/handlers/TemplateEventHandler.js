const BaseEventHandler = require('./BaseEventHandler');
const { templateRepository } = require('../../repositories');

/**
 * Template event handler for real-time template operations
 */
class TemplateEventHandler extends BaseEventHandler {
  constructor(socket, io) {
    super(socket, io);
  }

  /**
   * Handle create template request
   */
  async handleCreateTemplate(data) {
    this.log('Create template requested', { name: data.name });
    
    const validation = this.validateRequired(data, ['name', 'type', 'category', 'content']);
    if (!validation.isValid) {
      return this.sendError('template:create-error', 
        new Error(`Missing required fields: ${validation.missing.join(', ')}`));
    }

    try {
      // Validate template data
      const validationResult = templateRepository.validate(data);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Check if name already exists
      const nameExists = await templateRepository.nameExists(data.name);
      if (nameExists) {
        throw new Error('Template name already exists');
      }

      // Create template
      const template = await templateRepository.create(data);

      this.sendSuccess('template:created', { template });
      
      // Broadcast template created to other clients
      this.broadcastExcept('template:created-broadcast', { template });
    } catch (error) {
      this.sendError('template:create-error', error);
    }
  }

  /**
   * Handle update template request
   */
  async handleUpdateTemplate(data) {
    this.log('Update template requested', { id: data.id });
    
    const validation = this.validateRequired(data, ['id']);
    if (!validation.isValid) {
      return this.sendError('template:update-error', 
        new Error(`Missing required fields: ${validation.missing.join(', ')}`));
    }

    try {
      // Check if template exists
      const existingTemplate = await templateRepository.findById(data.id);
      if (!existingTemplate) {
        throw new Error('Template not found');
      }

      // Validate update data
      const updateData = { ...data };
      delete updateData.id;
      
      const validationResult = templateRepository.validate({ ...existingTemplate, ...updateData });
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Check if name already exists (excluding current template)
      if (updateData.name && updateData.name !== existingTemplate.name) {
        const nameExists = await templateRepository.nameExists(updateData.name, data.id);
        if (nameExists) {
          throw new Error('Template name already exists');
        }
      }

      // Update template
      const template = await templateRepository.updateById(data.id, updateData);

      this.sendSuccess('template:updated', { template });
      
      // Broadcast template updated to other clients
      this.broadcastExcept('template:updated-broadcast', { template });
    } catch (error) {
      this.sendError('template:update-error', error);
    }
  }

  /**
   * Handle delete template request
   */
  async handleDeleteTemplate(data) {
    this.log('Delete template requested', { id: data.id });
    
    const validation = this.validateRequired(data, ['id']);
    if (!validation.isValid) {
      return this.sendError('template:delete-error', 
        new Error(`Missing required fields: ${validation.missing.join(', ')}`));
    }

    try {
      // Check if template exists
      const existingTemplate = await templateRepository.findById(data.id);
      if (!existingTemplate) {
        throw new Error('Template not found');
      }

      // Delete template
      const deleted = await templateRepository.deleteById(data.id);
      
      if (!deleted) {
        throw new Error('Failed to delete template');
      }

      this.sendSuccess('template:deleted', { id: data.id });
      
      // Broadcast template deleted to other clients
      this.broadcastExcept('template:deleted-broadcast', { id: data.id });
    } catch (error) {
      this.sendError('template:delete-error', error);
    }
  }

  /**
   * Handle get all templates request
   */
  async handleGetAllTemplates(data) {
    this.log('Get all templates requested');
    
    try {
      const filters = data.filters || {};
      let templates;

      if (Object.keys(filters).length > 0) {
        templates = await templateRepository.findWithFilters(filters);
      } else {
        templates = await templateRepository.findAll();
      }

      this.sendSuccess('template:list-loaded', { 
        templates,
        totalCount: templates.length 
      });
    } catch (error) {
      this.sendError('template:list-error', error);
    }
  }

  /**
   * Handle get template by ID request
   */
  async handleGetTemplate(data) {
    this.log('Get template requested', { id: data.id });
    
    const validation = this.validateRequired(data, ['id']);
    if (!validation.isValid) {
      return this.sendError('template:get-error', 
        new Error(`Missing required fields: ${validation.missing.join(', ')}`));
    }

    try {
      const template = await templateRepository.findById(data.id);
      
      if (!template) {
        throw new Error('Template not found');
      }

      this.sendSuccess('template:loaded', { template });
    } catch (error) {
      this.sendError('template:get-error', error);
    }
  }

  /**
   * Handle search templates request
   */
  async handleSearchTemplates(data) {
    this.log('Search templates requested', { query: data.query });
    
    const validation = this.validateRequired(data, ['query']);
    if (!validation.isValid) {
      return this.sendError('template:search-error', 
        new Error(`Missing required fields: ${validation.missing.join(', ')}`));
    }

    try {
      const templates = await templateRepository.search(data.query);

      this.sendSuccess('template:search-results', { 
        templates,
        query: data.query,
        totalCount: templates.length 
      });
    } catch (error) {
      this.sendError('template:search-error', error);
    }
  }

  /**
   * Handle get templates by category request
   */
  async handleGetTemplatesByCategory(data) {
    this.log('Get templates by category requested', { category: data.category });
    
    const validation = this.validateRequired(data, ['category']);
    if (!validation.isValid) {
      return this.sendError('template:category-error', 
        new Error(`Missing required fields: ${validation.missing.join(', ')}`));
    }

    try {
      const templates = await templateRepository.findByCategory(data.category);

      this.sendSuccess('template:category-loaded', { 
        templates,
        category: data.category,
        totalCount: templates.length 
      });
    } catch (error) {
      this.sendError('template:category-error', error);
    }
  }

  /**
   * Handle get template statistics request
   */
  async handleGetTemplateStatistics(data) {
    this.log('Get template statistics requested');
    
    try {
      const statistics = await templateRepository.getStatistics();

      this.sendSuccess('template:statistics-loaded', { statistics });
    } catch (error) {
      this.sendError('template:statistics-error', error);
    }
  }
}

module.exports = TemplateEventHandler;
