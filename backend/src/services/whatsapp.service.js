const QRCode = require('qrcode');
const { createWhatsAppClient } = require('../config/whatsapp');

let client;
let isConnected = false;
let qrCodeData = null;
let clientInfo = null;

const initializeIfNeeded = async () => {
  try {
    if (!client) {
      console.log('Creating new WhatsApp client...');
      client = createWhatsAppClient();
      setupEventListeners();
      console.log('Initializing WhatsApp client...');
      await client.initialize();
      console.log('WhatsApp client initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing WhatsApp client:', error);
    // Clean up if initialization fails
    if (client) {
      try {
        await client.destroy();
      } catch (destroyError) {
        console.error('Error destroying client after failed initialization:', destroyError);
      }
      client = null;
      isConnected = false;
      qrCodeData = null;
      clientInfo = null;
    }
    throw error;
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

  client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    isConnected = true;
    
    client.info.then(info => {
      console.log('Client info retrieved:', info.pushname);
      clientInfo = {
        name: info.pushname || 'Unknown',
        phone: info.wid.user
      };
    }).catch(err => {
      console.error('Error getting client info:', err);
    });
  });

  client.on('disconnected', (reason) => {
    console.log('WhatsApp client disconnected:', reason);
    isConnected = false;
    clientInfo = null;
  });

  client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
    isConnected = false;
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

const getQRCode = () => qrCodeData;
const getClientInfo = () => clientInfo;
const isClientConnected = () => isConnected;

const getContacts = async () => {
  if (!isConnected || !client) {
    throw new Error('WhatsApp not connected');
  }

  const contacts = await client.getContacts();
  return contacts
    .filter(contact => contact.isMyContact && !contact.isGroup)
    .map(contact => ({
      id: contact.id._serialized,
      name: contact.name || contact.pushname || contact.number,
      number: contact.number,
      isGroup: false,
      profilePic: contact.profilePicUrl
    }));
};

const getGroups = async () => {
  if (!isConnected || !client) {
    throw new Error('WhatsApp not connected');
  }

  const chats = await client.getChats();
  return chats
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
  if (!isConnected || !client) {
    throw new Error('WhatsApp not connected');
  }

  if (!query || typeof query !== 'string') {
    throw new Error('Search query is required and must be a string');
  }

  const chats = await client.getChats();
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

  return {
    groups: filteredGroups,
    totalCount: filteredGroups.length
  };
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
  getQRCode,
  getClientInfo,
  isConnected: isClientConnected,
  getContacts,
  getGroups,
  sendMessage,
  sendMessageWithMedia,
  searchGroups,
  getContactByNumber,
  client: () => client
};
