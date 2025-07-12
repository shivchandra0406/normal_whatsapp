const express = require('express');
const multer = require('multer');
const templateController = require('../controllers/template.controller');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and documents
    const allowedMimes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      // Videos
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/webm',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'), false);
    }
  }
});

// Routes
router.get('/', templateController.getAllTemplates);
router.get('/search', templateController.searchTemplates);
router.get('/media/:filename', templateController.getMediaFile);
router.get('/:id', templateController.getTemplateById);
router.post('/', upload.single('mediaFile'), templateController.createTemplate);
router.put('/:id', upload.single('mediaFile'), templateController.updateTemplate);
router.delete('/:id', templateController.deleteTemplate);

module.exports = router;
