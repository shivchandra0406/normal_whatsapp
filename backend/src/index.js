const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs-extra');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: function(origin, callback) {
    if(!origin) return callback(null, true);
    if(origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Configure multer for file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../uploads/'),
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'text/csv' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only XLSX and CSV files are allowed!'), false);
    }
  }
});

// Ensure uploads directory exists
fs.ensureDirSync(path.join(__dirname, '../uploads'));

// Initialize WhatsApp client
const client = new Client({
  puppeteer: {
    headless: true,
    args: ['--no-sandbox']
  }
});

let qr = '';

client.on('qr', (qrCode) => {
  qrcode.toDataURL(qrCode, (err, url) => {
    if (!err) {
      qr = url;
    }
  });
});

client.on('ready', () => {
  console.log('WhatsApp client is ready!');
});

client.initialize();

// Helper function to process contacts in the background
async function processContacts(contacts, campaign, message) {
  for (const contact of contacts) {
    try {
      const formattedNumber = formatPhoneNumber(contact.phone, contact.countryCode);
      if (!validatePhoneNumber(formattedNumber)) {
        throw new Error(`Invalid phone number: ${contact.phone}`);
      }
      const chatId = `${formattedNumber}@c.us`;
      await client.sendMessage(chatId, message);
      campaign.sentCount++;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error sending to ${contact.phone}:`, error);
    }
  }

  campaign.status = 'completed';
  campaign.completedAt = new Date().toISOString();
}

// Import routes
require('./routes/campaign')(app, upload, processContacts);
require('./routes/templates')(app);
require('./routes/whatsapp')(app, client);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
