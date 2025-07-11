const whatsappService = require('../services/whatsapp.service');

const getQRCode = (req, res) => {
  whatsappService.initializeIfNeeded();
  res.json({
    success: true,
    qrCode: whatsappService.getQRCode()
  });
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
