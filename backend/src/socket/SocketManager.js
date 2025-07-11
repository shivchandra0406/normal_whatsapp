const { Server } = require('socket.io');
const WhatsAppEventHandler = require('./handlers/WhatsAppEventHandler');
const CampaignEventHandler = require('./handlers/CampaignEventHandler');
const TemplateEventHandler = require('./handlers/TemplateEventHandler');

/**
 * Socket.IO manager for handling real-time communication
 */
class SocketManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    }); 

    this.connectedClients = new Map();
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for different modules
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, socket);

      // Setup module-specific event handlers
      this.setupWhatsAppEvents(socket);
      this.setupCampaignEvents(socket);
      this.setupTemplateEvents(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Setup WhatsApp-related events
   */
  setupWhatsAppEvents(socket) {
    const whatsappHandler = new WhatsAppEventHandler(socket, this.io);
    
    socket.on('whatsapp:qr-request', whatsappHandler.handleQRRequest.bind(whatsappHandler));
    socket.on('whatsapp:connect', whatsappHandler.handleConnect.bind(whatsappHandler));
    socket.on('whatsapp:disconnect', whatsappHandler.handleDisconnect.bind(whatsappHandler));
    socket.on('whatsapp:send-message', whatsappHandler.handleSendMessage.bind(whatsappHandler));
    socket.on('whatsapp:get-contacts', whatsappHandler.handleGetContacts.bind(whatsappHandler));
    socket.on('whatsapp:get-groups', whatsappHandler.handleGetGroups.bind(whatsappHandler));
  }

  /**
   * Setup Campaign-related events
   */
  setupCampaignEvents(socket) {
    const campaignHandler = new CampaignEventHandler(socket, this.io);
    
    socket.on('campaign:start', campaignHandler.handleStartCampaign.bind(campaignHandler));
    socket.on('campaign:pause', campaignHandler.handlePauseCampaign.bind(campaignHandler));
    socket.on('campaign:resume', campaignHandler.handleResumeCampaign.bind(campaignHandler));
    socket.on('campaign:stop', campaignHandler.handleStopCampaign.bind(campaignHandler));
    socket.on('campaign:get-status', campaignHandler.handleGetStatus.bind(campaignHandler));
  }

  /**
   * Setup Template-related events
   */
  setupTemplateEvents(socket) {
    const templateHandler = new TemplateEventHandler(socket, this.io);
    
    socket.on('template:create', templateHandler.handleCreateTemplate.bind(templateHandler));
    socket.on('template:update', templateHandler.handleUpdateTemplate.bind(templateHandler));
    socket.on('template:delete', templateHandler.handleDeleteTemplate.bind(templateHandler));
    socket.on('template:get-all', templateHandler.handleGetAllTemplates.bind(templateHandler));
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Send to specific client
   */
  sendToClient(socketId, event, data) {
    const socket = this.connectedClients.get(socketId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  /**
   * Broadcast to all clients except sender
   */
  broadcastExcept(senderSocketId, event, data) {
    this.connectedClients.forEach((socket, socketId) => {
      if (socketId !== senderSocketId) {
        socket.emit(event, data);
      }
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    return this.io;
  }
}

module.exports = SocketManager;
