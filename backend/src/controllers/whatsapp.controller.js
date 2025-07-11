const whatsappService = require('../services/whatsapp.service');

const getQRCode = async (req, res) => {
  try {
    console.log('QR Code requested, initializing WhatsApp client...');
    await whatsappService.initializeIfNeeded();

    // Wait a bit for QR code to be generated
    let attempts = 0;
    const maxAttempts = 10; // 5 seconds max wait

    while (attempts < maxAttempts) {
      const qrCode = whatsappService.getQRCode();
      if (qrCode) {
        console.log('QR Code found, sending to frontend');
        return res.json({
          success: true,
          qrCode: qrCode
        });
      }

      // Wait 500ms before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
      console.log(`Waiting for QR code... attempt ${attempts}/${maxAttempts}`);
    }

    // If no QR code after waiting, return success but no QR code
    console.log('No QR code generated after waiting, client might already be authenticated');
    res.json({
      success: true,
      qrCode: null,
      message: 'Client initialization started, QR code will be available shortly'
    });

  } catch (error) {
    console.error('Error getting QR code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const connect = async (req, res) => {
  try {
    const clientInfo = await whatsappService.connect();
    res.json({
      success: true,
      clientInfo
    });
  } catch (error) {
    console.error('Connection failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const getStatus = (req, res) => {
  res.json({
    isConnected: whatsappService.isConnected(),
    clientInfo: whatsappService.getClientInfo()
  });
};

const disconnect = async (req, res) => {
  try {
    await whatsappService.disconnect();
    res.json({
      success: true
    });
  } catch (error) {
    console.error('Disconnect failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const logout = async (req, res) => {
  try {
    await whatsappService.logout();
    res.json({
      success: true,
      message: 'WhatsApp session logged out successfully'
    });
  } catch (error) {
    console.error('Logout failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const getContacts = async (req, res) => {
  try {
    const contacts = await whatsappService.getContacts();
    res.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('Failed to get contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const getGroups = async (req, res) => {
  try {
    const groups = await whatsappService.getGroups();
    res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('Failed to get groups:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { chatId, message } = req.body;
    await whatsappService.sendMessage(chatId, message);
    res.json({
      success: true
    });
  } catch (error) {
    console.error('Failed to send message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const searchGroups = async (req, res) => {
  try {
    const { query, searchType } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const result = await whatsappService.searchGroups(query, searchType);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Failed to search groups:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const getContactByNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const contact = await whatsappService.getContactByNumber(phoneNumber);
    res.json({
      success: true,
      contact
    });
  } catch (error) {
    console.error('Failed to get contact by number:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getQRCode,
  connect,
  getStatus,
  disconnect,
  logout,
  getContacts,
  getGroups,
  sendMessage,
  searchGroups,
  getContactByNumber
};
