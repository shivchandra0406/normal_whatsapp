const campaignService = require('../services/campaign.service');
const whatsappService = require('../services/whatsapp.service');
const { upload } = require('../config/upload');
const { convertHtmlToWhatsApp } = require('../utils/htmlToWhatsApp');
const fs = require('fs');
const path = require('path');

const uploadContacts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const contacts = await campaignService.processContactsFile(req.file.path);
    res.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('Failed to upload contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const sendCampaign = async (req, res) => {
  try {
    let name, message, contacts = [];
    const file = req.file;

    // Handle FormData submission
    if (req.is('multipart/form-data')) {
      name = req.body.name;
      message = req.body.message;
      
      // If we have a file, process it and ignore manual contacts
      if (file) {
        const fileContacts = await campaignService.processContactsFile(file.path);
        if (fileContacts && fileContacts.length > 0) {
          contacts = fileContacts.map(c => c.id);
        } else {
          return res.status(400).json({
            success: false,
            error: 'No valid contacts found in the uploaded file'
          });
        }
      } 
      // Only use manual contacts if no file is provided
      else if (req.body.contacts) {
        try {
          contacts = JSON.parse(req.body.contacts);
        } catch (e) {
          console.warn('Failed to parse contacts from FormData:', e);
        }
      }
    } else {
      // Handle JSON submission
      ({ name, message, contacts = [] } = req.body);
    }

    if (!name || !message) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name and message are required'
      });
    }

    // Convert HTML message to WhatsApp formatted text
    const whatsappMessage = convertHtmlToWhatsApp(message);

    if (!contacts && !file) {
      return res.status(400).json({
        success: false,
        error: 'Either contacts or a file must be provided'
      });
    }

    const results = await campaignService.sendCampaign(
      name,
      whatsappMessage,
      contacts || [],
      file
    );

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('Failed to send campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const getCampaignHistory = (req, res) => {
  const campaigns = campaignService.getCampaignHistory();
  res.json({
    success: true,
    campaigns
  });
};

const bulkManageMembers = async (req, res) => {
  try {
    const { action, contacts, groups } = req.body;
    const results = await campaignService.bulkManageMembers(action, contacts, groups);
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Failed to manage members:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const processAndSendCampaign = async (req, res) => {
  try {
    // Validate required fields
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { campaignName, message, sendMode = 'contacts', selectedGroups = '[]' } = req.body;
    
    if (!campaignName || !message) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name and message are required'
      });
    }

    // Convert HTML message to WhatsApp formatted text
    const whatsappMessage = convertHtmlToWhatsApp(message);
    
    // Process the uploaded file
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    // Check if file is valid
    if (!['.xlsx', '.xls', '.csv'].includes(fileExtension)) {
      fs.unlinkSync(filePath); // Clean up the uploaded file
      return res.status(400).json({
        success: false,
        error: 'Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV file.'
      });
    }

    // Process the file to extract contacts
    const contacts = await campaignService.processContactsFile(filePath);
    
    if (!contacts || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid contacts found in the uploaded file'
      });
    }

    // Determine recipients based on sendMode
    let recipients = [];
    if (sendMode === 'groups') {
      try {
        const groups = JSON.parse(selectedGroups);
        recipients = groups.map(group => ({
          id: group.id,
          name: group.name,
          isGroup: true
        }));
      } catch (e) {
        console.error('Error parsing selected groups:', e);
        return res.status(400).json({
          success: false,
          error: 'Invalid groups data'
        });
      }
    } else {
      // Use contacts from file
      recipients = contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        number: contact.number,
        isGroup: false
      }));
    }

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid recipients found'
      });
    }

    // Send messages to all recipients
    const results = {
      total: recipients.length,
      success: 0,
      failed: 0,
      errors: []
    };

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchPromises = batch.map(recipient => {
        return whatsappService.sendMessage(recipient.id, whatsappMessage, recipient.isGroup)
          .then(() => {
            results.success++;
          })
          .catch(error => {
            results.failed++;
            results.errors.push({
              recipient: recipient.id,
              error: error.message
            });
          });
      });

      // Wait for current batch to complete before proceeding
      await Promise.all(batchPromises);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Save campaign to history
    const campaign = {
      id: Date.now().toString(),
      name: campaignName,
      message: whatsappMessage,
      totalRecipients: results.total,
      successCount: results.success,
      failedCount: results.failed,
      timestamp: new Date().toISOString()
    };
    
    campaignService.saveCampaignToHistory(campaign);

    res.json({
      success: true,
      message: `Campaign sent successfully to ${results.success} recipients`,
      ...results
    });
  } catch (error) {
    console.error('Error processing and sending campaign:', error);
    
    // Clean up uploaded file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process and send campaign'
    });
  }
};

module.exports = {
  uploadContacts,
  sendCampaign,
  getCampaignHistory,
  bulkManageMembers,
  processAndSendCampaign
};
