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

module.exports = {
  getQRCode,
  connect,
  getStatus,
  disconnect,
  getContacts,
  getGroups,
  sendMessage
};
