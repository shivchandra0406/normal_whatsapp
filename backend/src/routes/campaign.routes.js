const express = require('express');
const campaignController = require('../controllers/campaign.controller');
const { upload } = require('../config/upload');

const router = express.Router();

router.post('/upload-contacts', upload.single('file'), campaignController.uploadContacts);
router.post('/send', upload.single('file'), campaignController.sendCampaign);
router.post('/process-and-send', upload.single('file'), campaignController.processAndSendCampaign);
router.get('/history', campaignController.getCampaignHistory);
router.post('/bulk/manage-members', campaignController.bulkManageMembers);

module.exports = router;
