const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { templateRepository } = require('../repositories');

const UPLOADS_DIR = path.join(__dirname, '../uploads/templates');

// Ensure directories exist
const ensureDirectories = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
};

// Get all templates
const getAllTemplates = async () => {
  return await templateRepository.findAll();
};

// Get template by ID
const getTemplateById = async (id) => {
  return await templateRepository.findById(id);
};

// Create new template
const createTemplate = async (templateData, mediaFile = null) => {
  ensureDirectories();

  const newTemplateData = {
    name: templateData.name,
    type: templateData.type,
    category: templateData.category,
    content: templateData.content,
    description: templateData.description || ''
  };

  // Handle media file if provided
  if (mediaFile && templateData.type !== 'text') {
    const mediaInfo = saveMediaFile(mediaFile);
    if (mediaInfo) {
      newTemplateData.media = mediaInfo;
    }
  }

  return await templateRepository.create(newTemplateData);
};

// Update template
const updateTemplate = async (id, updateData, mediaFile = null) => {
  ensureDirectories();

  const existingTemplate = await templateRepository.findById(id);
  if (!existingTemplate) {
    return null;
  }

  // Handle media file updates
  if (updateData.removeMedia) {
    // Remove existing media
    if (existingTemplate.media) {
      deleteMediaFile(existingTemplate.media.filename);
      updateData.media = null;
    }
  } else if (mediaFile && updateData.type !== 'text') {
    // Add or replace media
    if (existingTemplate.media) {
      deleteMediaFile(existingTemplate.media.filename);
    }
    const mediaInfo = saveMediaFile(mediaFile);
    if (mediaInfo) {
      updateData.media = mediaInfo;
    }
  }

  return await templateRepository.updateById(id, updateData);
};

// Delete template
const deleteTemplate = async (id) => {
  const template = await templateRepository.findById(id);
  if (!template) {
    return false;
  }

  // Delete associated media file
  if (template.media) {
    deleteMediaFile(template.media.filename);
  }

  return await templateRepository.deleteById(id);
};

// Search templates
const searchTemplates = async (filters = {}) => {
  return await templateRepository.findWithFilters(filters);
};

// Save media file
const saveMediaFile = (file) => {
  try {
    const fileExtension = path.extname(file.originalname);
    const filename = `${uuidv4()}${fileExtension}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    
    fs.writeFileSync(filepath, file.buffer);
    
    return {
      id: uuidv4(),
      type: getMediaType(file.mimetype),
      filename: filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/api/templates/media/${filename}`,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error saving media file:', error);
    return null;
  }
};

// Delete media file
const deleteMediaFile = (filename) => {
  try {
    const filepath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error('Error deleting media file:', error);
  }
};

// Get media type from mime type
const getMediaType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
};

// Get media file path
const getMediaFilePath = (filename) => {
  return path.join(UPLOADS_DIR, filename);
};

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  searchTemplates,
  getMediaFilePath
};
