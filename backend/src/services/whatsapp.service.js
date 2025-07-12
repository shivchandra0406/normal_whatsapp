const QRCode = require('qrcode');
const { createWhatsAppClient } = require('../config/whatsapp');

// State management
let client = null;
let isConnected = false;
let qrCodeData = null;
let clientInfo = null;
let isInitializing = false;
let initializationPromise = null;
let connectionTimeout = null;
let retryCount = 0;

// Configuration constants
const MAX_RETRIES = 3;
const CONNECTION_TIMEOUT = 120000; // 120 seconds (increased for stability)
const RETRY_DELAY = 5000; // 5 seconds
const QR_TIMEOUT = 30000; // 30 seconds

// Session state management - Production-grade configuration
let lastSuccessfulOperation = Date.now();
let sessionHealthCheckInterval = null;
let isSessionHealthy = true; // Start optimistic
let consecutiveFailures = 0;
let lastWhatsAppWebCheck = Date.now();
let manualLogoutRequested = false;
let sessionPersistenceEnabled = true;

// Production-grade thresholds
const MAX_CONSECUTIVE_FAILURES = 5; // Increased tolerance
const SESSION_HEALTH_CHECK_INTERVAL = 60000; // 60 seconds (less aggressive)
const SESSION_EXPIRY_THRESHOLD = 1800000; // 30 minutes (realistic for real usage)
const WHATSAPP_WEB_SYNC_INTERVAL = 120000; // 2 minutes - sync with WhatsApp Web state
const NETWORK_RETRY_THRESHOLD = 180000; // 3 minutes for network issues

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Advanced session health monitoring with WhatsApp Web synchronization
const updateSessionHealth = (success = true, context = 'unknown') => {
  const now = Date.now();

  if (success) {
    lastSuccessfulOperation = now;
    consecutiveFailures = 0;
    isSessionHealthy = true;
    console.log(`Session health updated: HEALTHY (context: ${context})`);
  } else {
    consecutiveFailures++;
    console.log(`Session health updated: FAILURE (consecutive: ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}, context: ${context})`);

    // Only mark as unhealthy if we have many consecutive failures AND it's been a while
    const timeSinceLastSuccess = now - lastSuccessfulOperation;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && timeSinceLastSuccess > NETWORK_RETRY_THRESHOLD) {
      isSessionHealthy = false;
      console.log('Session marked as UNHEALTHY due to consecutive failures over extended period');
    }
  }
};

const isSessionExpired = () => {
  // Don't consider session expired if manual logout was requested
  if (manualLogoutRequested) {
    return false;
  }

  const timeSinceLastSuccess = Date.now() - lastSuccessfulOperation;
  const timeSinceWebCheck = Date.now() - lastWhatsAppWebCheck;

  // More sophisticated expiry logic
  const expired = (
    timeSinceLastSuccess > SESSION_EXPIRY_THRESHOLD &&
    !isSessionHealthy &&
    consecutiveFailures >= MAX_CONSECUTIVE_FAILURES &&
    timeSinceWebCheck > WHATSAPP_WEB_SYNC_INTERVAL
  );

  if (expired) {
    console.log(`Session expiry check: EXPIRED (last success: ${timeSinceLastSuccess}ms ago, healthy: ${isSessionHealthy}, failures: ${consecutiveFailures})`);
  }

  return expired;
};

// Check actual WhatsApp Web connection state
const checkWhatsAppWebState = async () => {
  if (!client) return false;

  try {
    // Use WhatsApp Web's own connection state
    const state = await client.getState();
    lastWhatsAppWebCheck = Date.now();

    console.log(`WhatsApp Web state check: ${state}`);

    switch (state) {
      case 'CONNECTED':
        updateSessionHealth(true, 'whatsapp-web-state');
        return true;
      case 'OPENING':
      case 'PAIRING':
        console.log('WhatsApp Web is connecting...');
        return true; // Still valid, just connecting
      case 'UNPAIRED':
      case 'UNPAIRED_IDLE':
        console.log('WhatsApp Web is unpaired - genuine session expiry');
        return false;
      default:
        console.log(`Unknown WhatsApp Web state: ${state}`);
        return true; // Be optimistic for unknown states
    }
  } catch (error) {
    console.log(`Error checking WhatsApp Web state: ${error.message}`);
    // Don't immediately fail on state check errors
    return true;
  }
};

const isTemporaryError = (error) => {
  const temporaryErrorPatterns = [
    'net::ERR_INTERNET_DISCONNECTED',
    'net::ERR_NETWORK_CHANGED',
    'Navigation timeout',
    'Waiting for selector',
    'Execution context was destroyed',
    'Cannot find context with specified id'
  ];

  return temporaryErrorPatterns.some(pattern =>
    error.message && error.message.includes(pattern)
  );
};

const isGenuineSessionExpiry = async (error) => {
  // Definitive session expiry patterns
  const definitiveExpiryPatterns = [
    'AUTHENTICATION_FAILURE',
    'Session closed',
    'Authentication failed',
    'QR code expired',
    'Session invalidated',
    'UNPAIRED',
    'auth_failure'
  ];

  // Temporary/network error patterns that should NOT trigger session cleanup
  const temporaryErrorPatterns = [
    'Target closed',
    'Protocol error',
    'Navigation timeout',
    'net::ERR_INTERNET_DISCONNECTED',
    'net::ERR_NETWORK_CHANGED',
    'Execution context was destroyed',
    'Cannot find context with specified id',
    'Waiting for selector'
  ];

  const matchesDefinitivePattern = definitiveExpiryPatterns.some(pattern =>
    error.message && error.message.toLowerCase().includes(pattern.toLowerCase())
  );

  const matchesTemporaryPattern = temporaryErrorPatterns.some(pattern =>
    error.message && error.message.includes(pattern)
  );

  // If it's a temporary error, definitely not a session expiry
  if (matchesTemporaryPattern) {
    console.log(`Temporary error detected, not session expiry: ${error.message}`);
    return false;
  }

  // If it matches definitive patterns, check WhatsApp Web state
  if (matchesDefinitivePattern) {
    console.log(`Definitive expiry pattern detected: ${error.message}`);
    const webStateValid = await checkWhatsAppWebState();
    if (webStateValid) {
      console.log('WhatsApp Web still connected, ignoring error pattern');
      return false;
    }
    return true;
  }

  // For other errors, use comprehensive analysis
  const sessionTimedOut = isSessionExpired();
  const webStateValid = await checkWhatsAppWebState();

  const isGenuine = sessionTimedOut && !webStateValid && !manualLogoutRequested;

  console.log(`Session expiry analysis: pattern=${matchesDefinitivePattern}, temporary=${matchesTemporaryPattern}, timedOut=${sessionTimedOut}, webValid=${webStateValid}, manual=${manualLogoutRequested}, genuine=${isGenuine}`);

  return isGenuine;
};

const startSessionHealthMonitoring = () => {
  if (sessionHealthCheckInterval) {
    clearInterval(sessionHealthCheckInterval);
  }

  sessionHealthCheckInterval = setInterval(async () => {
    if (!client || !isConnected || manualLogoutRequested) {
      return;
    }

    try {
      console.log('Performing comprehensive session health check...');

      // Check WhatsApp Web state first
      const webStateValid = await checkWhatsAppWebState();

      if (webStateValid) {
        // Perform lightweight operation to verify functionality
        try {
          await client.getState();
          updateSessionHealth(true, 'health-monitor');
          console.log('Session health check: PASSED (WhatsApp Web synchronized)');
        } catch (operationError) {
          console.log(`Session operation failed but WhatsApp Web connected: ${operationError.message}`);
          // Don't mark as failure if WhatsApp Web is still connected
          updateSessionHealth(true, 'web-connected-despite-error');
        }
      } else {
        console.log('Session health check: WhatsApp Web disconnected');
        updateSessionHealth(false, 'web-disconnected');
      }
    } catch (error) {
      console.log(`Session health check error: ${error.message}`);
      // Check if this is a temporary error
      if (isTemporaryError(error)) {
        console.log('Temporary error in health check, not marking as failure');
      } else {
        updateSessionHealth(false, 'health-check-error');
      }
    }
  }, SESSION_HEALTH_CHECK_INTERVAL);

  console.log(`Session health monitoring started (interval: ${SESSION_HEALTH_CHECK_INTERVAL}ms)`);
};

const stopSessionHealthMonitoring = () => {
  if (sessionHealthCheckInterval) {
    clearInterval(sessionHealthCheckInterval);
    sessionHealthCheckInterval = null;
    console.log('Session health monitoring stopped');
  }
};

const cleanupClient = async (isManualLogout = false) => {
  console.log(`Cleaning up WhatsApp client... (manual: ${isManualLogout})`);

  // Set manual logout flag
  if (isManualLogout) {
    manualLogoutRequested = true;
  }

  // Stop session health monitoring
  stopSessionHealthMonitoring();

  // Clear timeouts
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
  }

  // Reset state
  isConnected = false;
  qrCodeData = null;
  clientInfo = null;
  isInitializing = false;
  initializationPromise = null;
  isSessionHealthy = false;
  consecutiveFailures = 0;
  lastSuccessfulOperation = Date.now();
  lastWhatsAppWebCheck = Date.now();

  // Destroy client
  if (client) {
    try {
      await client.destroy();
      console.log('Client destroyed successfully');
    } catch (error) {
      console.error('Error destroying client:', error);
    }
    client = null;
  }

  // Reset manual logout flag after cleanup
  if (isManualLogout) {
    setTimeout(() => {
      manualLogoutRequested = false;
      console.log('Manual logout flag reset');
    }, 5000); // Reset after 5 seconds
  }
};

const initializeIfNeeded = async () => {
  // Prevent multiple simultaneous initializations
  if (isInitializing && initializationPromise) {
    console.log('Initialization already in progress, waiting...');
    return await initializationPromise;
  }

  if (client && isConnected) {
    console.log('Client already initialized and connected');
    return;
  }

  isInitializing = true;
  initializationPromise = performInitialization();

  try {
    await initializationPromise;
  } finally {
    isInitializing = false;
    initializationPromise = null;
  }
};

const performInitialization = async () => {
  try {
    console.log('Starting WhatsApp client initialization...');

    // Clean up any existing client
    await cleanupClient();

    // Create new client
    console.log('Creating new WhatsApp client...');
    client = createWhatsAppClient();

    // Setup event listeners
    setupEventListeners();

    // Set connection timeout
    connectionTimeout = setTimeout(() => {
      console.error('Connection timeout reached');
      cleanupClient();
    }, CONNECTION_TIMEOUT);

    // Initialize client
    console.log('Initializing WhatsApp client...');
    await client.initialize();
    console.log('WhatsApp client initialized successfully');

  } catch (error) {
    console.error('Error initializing WhatsApp client:', error);
    await cleanupClient();

    // Retry logic
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`Retrying initialization (attempt ${retryCount}/${MAX_RETRIES})...`);
      await delay(RETRY_DELAY);
      return await performInitialization();
    } else {
      retryCount = 0;
      throw new Error(`Failed to initialize WhatsApp client after ${MAX_RETRIES} attempts: ${error.message}`);
    }
  }
};

const setupEventListeners = () => {
  client.on('qr', (qr) => {
    console.log('QR Code event received');
    QRCode.toDataURL(qr, (err, url) => {
      if (err) {
        console.error('Error generating QR code:', err);
        qrCodeData = null;
      } else {
        console.log('QR Code successfully generated');
        qrCodeData = url;
      }
    });
  });

  client.on('loading_screen', (percent, message) => {
    console.log('Loading screen:', percent, '%', message);
  });

  client.on('ready', async () => {
    console.log('WhatsApp client is ready!');

    // Clear connection timeout since we're now ready
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
      console.log('Connection timeout cleared - client is ready');
    }

    // Wait a bit for WhatsApp Web to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));

    isConnected = true;
    retryCount = 0; // Reset retry count on successful connection
    manualLogoutRequested = false; // Reset manual logout flag
    sessionPersistenceEnabled = true;

    // Initialize session health with optimistic state
    updateSessionHealth(true, 'client-ready');
    lastWhatsAppWebCheck = Date.now();

    // Start comprehensive session monitoring
    startSessionHealthMonitoring();

    try {
      const info = await client.info;
      console.log('Client info retrieved:', info.pushname);
      clientInfo = {
        name: info.pushname || 'Unknown',
        phone: info.wid.user
      };
      updateSessionHealth(true, 'client-info-retrieved');

      // Verify WhatsApp Web state synchronization
      const webState = await checkWhatsAppWebState();
      console.log(`Session synchronized with WhatsApp Web: ${webState}`);

    } catch (err) {
      console.error('Error getting client info:', err);
      updateSessionHealth(false, 'client-info-error');
    }
  });

  client.on('disconnected', (reason) => {
    console.log('WhatsApp client disconnected:', reason);
    isConnected = false;
    clientInfo = null;
    qrCodeData = null;

    // Stop session health monitoring
    stopSessionHealthMonitoring();
    updateSessionHealth(false);

    // Notify frontend about disconnection
    if (global.socketManager && global.socketManager.io) {
      global.socketManager.io.emit('whatsapp:session_expired', {
        message: 'WhatsApp session has expired',
        reason: reason,
        action: 'logout'
      });
    }
  });

  client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
    isConnected = false;
    clientInfo = null;
    qrCodeData = null;

    // Notify frontend about authentication failure
    if (global.socketManager && global.socketManager.io) {
      global.socketManager.io.emit('whatsapp:session_expired', {
        message: 'WhatsApp authentication failed',
        reason: msg,
        action: 'logout'
      });
    }
  });
};

const connect = async () => {
  console.log('Connecting to WhatsApp...');
  try {
    if (!client) {
      console.log('Initializing new WhatsApp client...');
      await initializeIfNeeded();
    }

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      const timeout = setTimeout(() => {
        console.log('Connection timeout reached');
        clearInterval(checkInterval);
        reject(new Error('Connection timeout'));
      }, 30000);

      const checkInterval = setInterval(() => {
        attempts++;
        console.log(`Checking connection status (${attempts}/${maxAttempts}):`, isConnected ? 'Connected' : 'Waiting for connection');
        
        if (isConnected) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          console.log('Successfully connected to WhatsApp');
          resolve(clientInfo);
        } else if (attempts >= maxAttempts) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          reject(new Error('Connection timeout - max attempts reached'));
        } else if (!client) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          reject(new Error('Client was destroyed during connection attempt'));
        }
      }, 1000);

      // Add error handler
      if (client) {
        client.on('auth_failure', (err) => {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          reject(new Error(`Authentication failed: ${err}`));
        });
      }
    });
  } catch (error) {
    console.error('Connection error:', error);
    throw error;
  }
};

const disconnect = async () => {
  if (client) {
    await client.destroy();
    isConnected = false;
    clientInfo = null;
    client = null;
  }
};

// Manual logout - disconnects application but preserves WhatsApp Web session
const logout = async (preserveWhatsAppWeb = true) => {
  console.log(`Logout requested (preserve WhatsApp Web: ${preserveWhatsAppWeb})`);

  try {
    // Set manual logout flag to prevent automatic session cleanup
    manualLogoutRequested = true;

    if (client) {
      if (preserveWhatsAppWeb) {
        // Just destroy the client without logging out from WhatsApp Web
        console.log('Destroying client while preserving WhatsApp Web session...');
        await client.destroy();
      } else {
        // Full logout including WhatsApp Web
        console.log('Performing full logout including WhatsApp Web...');
        await client.logout();
        await client.destroy();
      }
    }

    // Clean up application state
    await cleanupClient(true); // Pass true for manual logout

    // Notify frontend about logout
    if (global.socketManager && global.socketManager.io) {
      global.socketManager.io.emit('whatsapp:logged_out', {
        message: 'WhatsApp session logged out successfully',
        action: 'logout',
        preservedWhatsAppWeb: preserveWhatsAppWeb
      });
    }

    console.log('Manual logout completed successfully');

  } catch (error) {
    console.error('Error during logout:', error);
    // Force cleanup even if logout fails
    await cleanupClient(true);
  }
};

// Force logout - completely disconnects from WhatsApp Web
const forceLogout = async () => {
  console.log('Force logout requested - will disconnect from WhatsApp Web');
  return await logout(false);
};

const getQRCode = () => qrCodeData;
const getClientInfo = () => clientInfo;
const isClientConnected = () => isConnected;
const getClient = () => client;

// Helper function to clean up expired session
const cleanupExpiredSession = () => {
  console.log('Cleaning up expired session...');
  isConnected = false;
  clientInfo = null;
  qrCodeData = null;

  if (client) {
    try {
      client.destroy();
    } catch (error) {
      console.error('Error destroying expired client:', error);
    }
    client = null;
  }

  // Notify frontend about session expiration
  if (global.socketManager && global.socketManager.io) {
    global.socketManager.io.emit('session_expired', {
      message: 'WhatsApp session has expired'
    });
  }
};

// Force reset function to completely clean up everything
const forceReset = async () => {
  console.log('Force resetting WhatsApp client...');

  try {
    // Clear timeouts
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }

    // Reset all state variables
    isConnected = false;
    clientInfo = null;
    qrCodeData = null;
    isInitializing = false;
    initializationPromise = null;
    retryCount = 0;

    // Destroy existing client if any
    if (client) {
      try {
        console.log('Destroying existing client...');
        await client.destroy();
      } catch (error) {
        console.error('Error destroying client during force reset:', error);
      }
      client = null;
    }

    // Clear any session files (if they exist)
    try {
      const fs = require('fs');
      const path = require('path');

      // Try multiple possible session paths
      const sessionPaths = [
        path.join(__dirname, '../../.wwebjs_auth'),
        path.join(__dirname, '../../whatsapp-auth'),
        path.join(__dirname, '../../../.wwebjs_cache'),
        path.join(__dirname, '../../.wwebjs_cache')
      ];

      for (const sessionPath of sessionPaths) {
        if (fs.existsSync(sessionPath)) {
          console.log(`Removing session files from: ${sessionPath}`);
          try {
            fs.rmSync(sessionPath, { recursive: true, force: true });
          } catch (error) {
            console.error(`Error removing ${sessionPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error during session cleanup:', error);
    }

    console.log('Force reset completed');

    // Notify frontend
    if (global.socketManager && global.socketManager.io) {
      global.socketManager.io.emit('whatsapp_reset', {
        message: 'WhatsApp client has been reset'
      });
    }

  } catch (error) {
    console.error('Error during force reset:', error);
    throw error;
  }
};

const getContacts = async (retryCount = 0) => {
  console.log(`getContacts called (attempt ${retryCount + 1})`);

  if (!isConnected || !client) {
    throw new Error('WhatsApp not connected');
  }

  try {
    // Add a small delay to ensure WhatsApp Web is ready
    if (retryCount === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Fetching contacts from WhatsApp...');
    const contacts = await client.getContacts();

    // Mark successful operation
    updateSessionHealth(true);
    console.log(`Successfully retrieved ${contacts.length} contacts`);

    return contacts
      .filter(contact => contact.isMyContact && !contact.isGroup)
      .map(contact => ({
        id: contact.id._serialized,
        name: contact.name || contact.pushname || contact.number,
        number: contact.number,
        isGroup: false,
        profilePic: contact.profilePicUrl
      }));

  } catch (error) {
    console.error(`getContacts error (attempt ${retryCount + 1}):`, error.message);

    // Mark failed operation
    updateSessionHealth(false);

    // Check if this is a temporary error that we should retry
    if (isTemporaryError(error) && retryCount < 2) {
      console.log(`Retrying getContacts due to temporary error (attempt ${retryCount + 2}/3)...`);
      await delay(3000);
      return getContacts(retryCount + 1);
    }

    // Check if this is a genuine session expiry (not just a temporary issue)
    if (isGenuineSessionExpiry(error)) {
      console.log('GENUINE session expiry detected in getContacts - triggering cleanup');
      cleanupExpiredSession();
    } else {
      console.log('Error in getContacts but session appears to be valid - not triggering cleanup');
    }

    throw error;
  }
};

const getGroups = async (retryCount = 0) => {
  console.log(`getGroups called (attempt ${retryCount + 1})`);

  if (!isConnected || !client) {
    throw new Error('WhatsApp not connected');
  }

  try {
    // Add a small delay to ensure WhatsApp Web is ready
    if (retryCount === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Fetching groups from WhatsApp...');
    const chats = await client.getChats();

    // Mark successful operation
    updateSessionHealth(true);

    const groups = chats.filter(chat => chat.isGroup);
    console.log(`Successfully retrieved ${groups.length} groups from ${chats.length} total chats`);

    return groups.map(group => ({
      id: group.id._serialized,
      name: group.name,
      participants: group.participants.map(p => ({
        id: p.id._serialized,
        name: p.id.user,
        number: p.id.user,
        isGroup: false
      })),
      description: group.description,
      profilePic: group.profilePicUrl
    }));

  } catch (error) {
    console.error(`getGroups error (attempt ${retryCount + 1}):`, error.message);

    // Mark failed operation with context
    updateSessionHealth(false, 'getGroups-error');

    // Check if this is a temporary error that we should retry
    if (isTemporaryError(error) && retryCount < 2) {
      console.log(`Retrying getGroups due to temporary error (attempt ${retryCount + 2}/3)...`);
      await delay(3000);
      return getGroups(retryCount + 1);
    }

    // Check if this is a genuine session expiry with improved detection
    const isGenuine = await isGenuineSessionExpiry(error);
    if (isGenuine) {
      console.log('GENUINE session expiry detected in getGroups - triggering cleanup');
      cleanupExpiredSession();
    } else {
      console.log('Error in getGroups but WhatsApp Web session appears to be valid - preserving session');
    }

    throw error;
  }
};

const sendMessage = async (chatId, message) => {
  if (!isConnected || !client) {
    throw new Error('WhatsApp not connected');
  }

  if (!chatId || !message) {
    throw new Error('Chat ID and message are required');
  }

  await client.sendMessage(chatId, message);
};

const sendMessageWithMedia = async (chatId, message, mediaPath) => {
  if (!isConnected || !client) {
    throw new Error('WhatsApp not connected');
  }

  if (!chatId) {
    throw new Error('Chat ID is required');
  }

  try {
    const { MessageMedia } = require('whatsapp-web.js');

    if (mediaPath) {
      // Send media with caption
      const media = MessageMedia.fromFilePath(mediaPath);
      await client.sendMessage(chatId, media, { caption: message || '' });
    } else {
      // Send text only if no media
      if (!message) {
        throw new Error('Either message or media is required');
      }
      await client.sendMessage(chatId, message);
    }
  } catch (error) {
    console.error('Error sending message with media:', error);
    throw error;
  }
};

const searchGroups = async (query, searchType = 'contains') => {
  console.log(`searchGroups called with query: "${query}", searchType: "${searchType}"`);

  if (!isConnected || !client) {
    console.log('WhatsApp not connected, isConnected:', isConnected, 'client:', !!client);
    throw new Error('WhatsApp not connected');
  }

  if (!query || typeof query !== 'string') {
    console.log('Invalid search query:', query);
    throw new Error('Search query is required and must be a string');
  }

  try {
    console.log('Getting chats from WhatsApp client...');
    const chats = await client.getChats();
    console.log(`Total chats found: ${chats.length}`);

    // Mark successful operation
    updateSessionHealth(true);

    const groups = chats
      .filter(chat => chat.isGroup)
      .map(group => ({
        id: group.id._serialized,
        name: group.name,
        participants: group.participants.map(p => ({
          id: p.id._serialized,
          name: p.id.user,
          number: p.id.user,
          isGroup: false
        })),
        description: group.description,
        profilePic: group.profilePicUrl
      }));

    console.log(`Total groups found: ${groups.length}`);

    const queryLower = query.toLowerCase();

    const filteredGroups = groups.filter(group => {
      const groupNameLower = (group.name || '').toLowerCase();

      switch (searchType) {
        case 'exact':
          return groupNameLower === queryLower;
        case 'startsWith':
          return groupNameLower.startsWith(queryLower);
        case 'contains':
        default:
          return groupNameLower.includes(queryLower);
      }
    });

    console.log(`Filtered groups found: ${filteredGroups.length}`);

    return {
      groups: filteredGroups,
      totalCount: filteredGroups.length
    };
  } catch (error) {
    console.error('Error in searchGroups:', error);

    // Mark failed operation
    updateSessionHealth(false);

    // Check if this is a genuine session expiry (not just a temporary issue)
    if (isGenuineSessionExpiry(error)) {
      console.log('GENUINE session expiry detected in searchGroups - triggering cleanup');
      cleanupExpiredSession();
    } else {
      console.log('Error in searchGroups but session appears to be valid - not triggering cleanup');
    }

    throw error;
  }
};

const getContactByNumber = async (phoneNumber) => {
  if (!isConnected || !client) {
    throw new Error('WhatsApp not connected');
  }

  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  // Clean the phone number (remove spaces, dashes, etc.)
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');

  try {
    // Try to get contact by number
    const contactId = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@c.us`;
    const contact = await client.getContactById(contactId);

    if (contact) {
      return {
        id: contact.id._serialized,
        name: contact.name || contact.pushname || contact.number,
        number: contact.number,
        isGroup: false,
        profilePic: contact.profilePicUrl
      };
    }

    return null;
  } catch (error) {
    console.error(`Error getting contact for number ${phoneNumber}:`, error);
    return null;
  }
};

module.exports = {
  initializeIfNeeded,
  connect,
  disconnect,
  logout,
  forceLogout,
  getQRCode,
  getClientInfo,
  isConnected: isClientConnected,
  getContacts,
  getGroups,
  sendMessage,
  sendMessageWithMedia,
  searchGroups,
  getContactByNumber,
  client: () => client,
  cleanupExpiredSession,
  forceReset,
  checkWhatsAppWebState,
  updateSessionHealth
};
