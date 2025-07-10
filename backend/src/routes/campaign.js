const xlsx = require('xlsx');
const fs = require('fs-extra');
const { formatPhoneNumber, validatePhoneNumber } = require('../utils/phoneNumberHelper');
const { validateContactData } = require('../utils/contactTemplates');

module.exports = function(app, upload, processContacts) {
  app.post('/api/campaign/process-xlsx', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const { campaignName, message } = req.body;
      if (!campaignName || !message) {
        return res.status(400).json({ success: false, error: 'Campaign name and message are required' });
      }

      const workbook = xlsx.readFile(req.file.path, {
        type: req.file.originalname.endsWith('.csv') ? 'string' : 'buffer',
        raw: req.file.originalname.endsWith('.csv')
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: ''
      });

      if (data.length === 0) {
        return res.status(400).json({ success: false, error: 'No contacts found in the file' });
      }

      const campaignId = Date.now().toString();
      const campaign = {
        id: campaignId,
        name: campaignName,
        message,
        totalCount: data.length,
        sentCount: 0,
        status: 'sending',
        createdAt: new Date().toISOString()
      };

      global.campaigns = global.campaigns || [];
      global.campaigns.push(campaign);

      processContacts(data, campaign, message);

      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });

      return res.json({ 
        success: true, 
        message: 'Campaign created and processing started',
        campaignId
      });
    } catch (error) {
      console.error('Error processing XLSX:', error);
      return res.status(500).json({ success: false, error: 'Failed to process file' });
    }
  });

  app.post('/api/campaign/upload-contacts', upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const templateName = req.body.template || 'basic';
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      const validation = validateContactData(data, templateName);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid data format',
          details: validation.errors
        });
      }

      const contacts = data.map(row => {
        const formattedNumber = formatPhoneNumber(row.phone, row.countryCode);
        if (!validatePhoneNumber(formattedNumber)) {
          throw new Error(`Invalid phone number: ${row.phone}`);
        }
        return {
          id: `${formattedNumber}@c.us`,
          name: row.name || `Contact ${formattedNumber}`,
          number: formattedNumber,
          email: row.email || '',
          group: row.group || '',
          notes: row.notes || '',
          isGroup: false
        };
      });

      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });

      return res.json({ success: true, contacts });
    } catch (error) {
      console.error('Error processing contacts:', error);
      return res.status(500).json({ success: false, error: 'Failed to process contacts' });
    }
  });

  app.get('/api/campaign/history', (req, res) => {
    res.json({ campaigns: global.campaigns || [] });
  });
};
