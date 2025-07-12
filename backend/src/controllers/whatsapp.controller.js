const whatsappService = require('../services/whatsapp.service');

// Debounce mechanism for logout requests
let logoutInProgress = false;
const LOGOUT_DEBOUNCE_TIME = 2000; // 2 seconds

const getQRCode = async (req, res) => {
  try {
    console.log('QR Code requested, checking current authentication status...');

    // First check if client is already connected and validate the connection
    if (whatsappService.isConnected()) {
      console.log('Client appears to be connected, validating session...');

      // Try to validate the session by making a simple call
      try {
        const client = whatsappService.client();
        if (client && client.info) {
          // Session is valid
          console.log('Session validation successful - client is authenticated and connected');
          return res.json({
            success: true,
            qrCode: null,
            alreadyAuthenticated: true,
            clientInfo: whatsappService.getClientInfo(),
            message: 'WhatsApp is already connected'
          });
        }
      } catch (validationError) {
        console.log('Session validation failed:', validationError.message);
        // Session is invalid, force reset and continue
        console.log('Performing force reset due to invalid session...');
        await whatsappService.forceReset();
      }
    }

    console.log('Client not connected, performing force reset and initializing...');
    await whatsappService.forceReset();
    await whatsappService.initializeIfNeeded();

    // Wait a bit for QR code to be generated
    let attempts = 0;
    const maxAttempts = 10; // 5 seconds max wait

    while (attempts < maxAttempts) {
      // Check if client became connected during initialization
      if (whatsappService.isConnected()) {
        console.log('Client connected during initialization');
        return res.json({
          success: true,
          qrCode: null,
          alreadyAuthenticated: true,
          clientInfo: whatsappService.getClientInfo(),
          message: 'WhatsApp connected during initialization'
        });
      }

      const qrCode = whatsappService.getQRCode();
      if (qrCode) {
        console.log('QR Code found, sending to frontend');
        return res.json({
          success: true,
          qrCode: qrCode,
          alreadyAuthenticated: false,
          message: 'QR Code generated successfully'
        });
      }

      // Wait 500ms before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
      console.log(`Waiting for QR code... attempt ${attempts}/${maxAttempts}`);
    }

    // If no QR code after waiting, check one more time if connected
    if (whatsappService.isConnected()) {
      console.log('Client connected after waiting period');
      return res.json({
        success: true,
        qrCode: null,
        alreadyAuthenticated: true,
        clientInfo: whatsappService.getClientInfo(),
        message: 'WhatsApp connected after initialization'
      });
    }

    // If still no QR code and not connected, there might be an issue
    console.log('No QR code generated and not connected - initialization may have failed');
    res.json({
      success: false,
      error: 'Failed to generate QR code or establish connection',
      message: 'Please try refreshing the page'
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
    // Prevent multiple simultaneous logout requests
    if (logoutInProgress) {
      console.log('Logout already in progress, ignoring duplicate request');
      return res.json({
        success: true,
        message: 'Logout already in progress'
      });
    }

    logoutInProgress = true;

    // Check if this should preserve WhatsApp Web session (default: true)
    const preserveWhatsAppWeb = req.query.preserveWhatsAppWeb !== 'false';
    console.log(`Processing logout request (preserve WhatsApp Web: ${preserveWhatsAppWeb})...`);

    await whatsappService.logout(preserveWhatsAppWeb);

    res.json({
      success: true,
      message: 'WhatsApp session logged out successfully',
      preservedWhatsAppWeb: preserveWhatsAppWeb
    });

    // Reset debounce flag after delay
    setTimeout(() => {
      logoutInProgress = false;
    }, LOGOUT_DEBOUNCE_TIME);

  } catch (error) {
    console.error('Logout failed:', error);
    logoutInProgress = false; // Reset on error
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Force logout - completely disconnects from WhatsApp Web
const forceLogout = async (req, res) => {
  try {
    if (logoutInProgress) {
      console.log('Logout already in progress, ignoring duplicate request');
      return res.json({
        success: true,
        message: 'Logout already in progress'
      });
    }

    logoutInProgress = true;
    console.log('Processing force logout request...');

    await whatsappService.forceLogout();

    res.json({
      success: true,
      message: 'WhatsApp session force logged out successfully',
      preservedWhatsAppWeb: false
    });

    setTimeout(() => {
      logoutInProgress = false;
    }, LOGOUT_DEBOUNCE_TIME);

  } catch (error) {
    console.error('Force logout failed:', error);
    logoutInProgress = false;
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
    console.log('Groups search API called with query:', req.query);
    const { query, searchType } = req.query;

    if (!query) {
      console.log('No query provided');
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    console.log(`Searching groups with query: "${query}", searchType: "${searchType}"`);
    const result = await whatsappService.searchGroups(query, searchType);
    console.log('Groups search result:', result);
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

const keepAlive = async (req, res) => {
  try {
    console.log('Keep-alive request received');

    if (!whatsappService.isConnected()) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not connected'
      });
    }

    // Perform a lightweight operation to keep the session active
    const client = whatsappService.client();
    if (!client) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp client not available'
      });
    }

    // Get client info as a lightweight keep-alive operation
    const clientInfo = client.info;

    res.json({
      success: true,
      message: 'Session keep-alive successful',
      timestamp: new Date().toISOString(),
      clientInfo: {
        wid: clientInfo?.wid?._serialized || null,
        pushname: clientInfo?.pushname || null
      }
    });

  } catch (error) {
    console.error('Keep-alive error:', error);

    // Check if this is a session-related error
    const isSessionError = (
      error.message.includes('Session closed') ||
      error.message.includes('Protocol error') ||
      error.message.includes('not connected')
    );

    res.status(isSessionError ? 401 : 500).json({
      success: false,
      error: error.message,
      isSessionExpired: isSessionError
    });
  }
};

const forceReset = async (req, res) => {
  try {
    console.log('Force reset requested');
    await whatsappService.forceReset();

    res.json({
      success: true,
      message: 'WhatsApp client has been force reset successfully'
    });
  } catch (error) {
    console.error('Force reset error:', error);
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
  forceLogout,
  getContacts,
  getGroups,
  sendMessage,
  searchGroups,
  getContactByNumber,
  keepAlive,
  forceReset
};
