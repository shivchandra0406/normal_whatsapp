const templateService = require('../services/template.service');
const fs = require('fs');

// Get all templates
const getAllTemplates = async (req, res) => {
  try {
    const templates = await templateService.getAllTemplates();
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Failed to get templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get template by ID
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await templateService.getTemplateById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Failed to get template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create new template
const createTemplate = async (req, res) => {
  try {
    const { name, type, category, content, description } = req.body;
    
    // Validation
    if (!name || !type || !category || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name, type, category, and content are required'
      });
    }

    // Validate template type
    const validTypes = ['text', 'text-with-image', 'text-with-video', 'text-with-document'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template type'
      });
    }

    // Validate category
    const validCategories = ['marketing', 'customer-support', 'notifications', 'greetings', 'announcements', 'follow-up', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }

    // Check if media is required but not provided
    if (type !== 'text' && !req.file) {
      return res.status(400).json({
        success: false,
        error: `Media file is required for template type: ${type}`
      });
    }

    const templateData = {
      name,
      type,
      category,
      content,
      description
    };

    const newTemplate = await templateService.createTemplate(templateData, req.file);

    if (!newTemplate) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create template'
      });
    }

    res.status(201).json({
      success: true,
      template: newTemplate,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Failed to create template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update template
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if template exists
    const existingTemplate = await templateService.getTemplateById(id);
    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Validate type if provided
    if (updateData.type) {
      const validTypes = ['text', 'text-with-image', 'text-with-video', 'text-with-document'];
      if (!validTypes.includes(updateData.type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid template type'
        });
      }
    }

    // Validate category if provided
    if (updateData.category) {
      const validCategories = ['marketing', 'customer-support', 'notifications', 'greetings', 'announcements', 'follow-up', 'other'];
      if (!validCategories.includes(updateData.category)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category'
        });
      }
    }

    const updatedTemplate = await templateService.updateTemplate(id, updateData, req.file);

    if (!updatedTemplate) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update template'
      });
    }

    res.json({
      success: true,
      template: updatedTemplate,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Failed to update template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete template
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if template exists
    const existingTemplate = await templateService.getTemplateById(id);
    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const success = await templateService.deleteTemplate(id);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete template'
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Search templates
const searchTemplates = async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      type: req.query.type,
      searchQuery: req.query.q
    };

    const templates = await templateService.searchTemplates(filters);
    
    res.json({
      success: true,
      templates,
      totalCount: templates.length
    });
  } catch (error) {
    console.error('Failed to search templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Serve media files
const getMediaFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = templateService.getMediaFilePath(filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Media file not found'
      });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Failed to serve media file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  searchTemplates,
  getMediaFile
};
