const { Client, LocalAuth } = require('whatsapp-web.js');
const app = require('./app');

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './whatsapp-auth'
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// WhatsApp client events
client.on('qr', (qr) => {
  console.log('QR Code received, scan please!');
});

client.on('ready', () => {
  console.log('WhatsApp client is ready!');
});

client.on('authenticated', () => {
  console.log('WhatsApp client authenticated');
});

client.on('auth_failure', (msg) => {
  console.error('WhatsApp authentication failed:', msg);
  // Notify frontend about authentication failure
  if (global.socketManager) {
    global.socketManager.broadcast('whatsapp:auth_failure', {
      message: 'WhatsApp authentication failed',
      reason: msg
    });
  }
});

client.on('disconnected', (reason) => {
  console.log('WhatsApp client disconnected:', reason);
  // Notify frontend about disconnection
  if (global.socketManager) {
    global.socketManager.broadcast('whatsapp:disconnected', {
      message: 'WhatsApp session disconnected',
      reason: reason
    });
  }
});

// Initialize WhatsApp client
client.initialize();

// Start the server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Initialize Socket.IO
const { SocketManager } = require('./socket');
const socketManager = new SocketManager(server);

// Make socket manager and WhatsApp client available globally
global.socketManager = socketManager;
global.whatsappClient = client;

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  client.destroy();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
