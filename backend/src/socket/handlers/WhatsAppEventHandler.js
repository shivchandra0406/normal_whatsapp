const BaseEventHandler = require('./BaseEventHandler');

/**
 * WhatsApp event handler for real-time WhatsApp operations
 */
class WhatsAppEventHandler extends BaseEventHandler {
  constructor(socket, io) {
    super(socket, io);
    this.whatsappClient = null; // Will be injected
  }

  /**
   * Set WhatsApp client instance
   */
  setWhatsAppClient(client) {
    this.whatsappClient = client;
  }

  /**
   * Handle QR code request
   */
  async handleQRRequest(data) {
    this.log('QR code requested');
    
    try {
      if (!this.whatsappClient) {
        throw new Error('WhatsApp client not initialized');
      }

      // Generate QR code
      const qrCode = await this.whatsappClient.generateQR();
      
      this.sendSuccess('whatsapp:qr-generated', { qrCode });
    } catch (error) {
      this.sendError('whatsapp:qr-error', error);
    }
  }

  /**
   * Handle connection request
   */
  async handleConnect(data) {
    this.log('Connection requested');
    
    try {
      if (!this.whatsappClient) {
        throw new Error('WhatsApp client not initialized');
      }

      const result = await this.whatsappClient.connect();
      
      if (result.success) {
        this.sendSuccess('whatsapp:connected', {
          clientInfo: result.clientInfo
        });
        
        // Broadcast connection status to all clients
        this.broadcast('whatsapp:status-changed', {
          status: 'connected',
          clientInfo: result.clientInfo
        });
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (error) {
      this.sendError('whatsapp:connection-error', error);
    }
  }

  /**
   * Handle disconnection request
   */
  async handleDisconnect(data) {
    this.log('Disconnection requested');
    
    try {
      if (!this.whatsappClient) {
        throw new Error('WhatsApp client not initialized');
      }

      await this.whatsappClient.disconnect();
      
      this.sendSuccess('whatsapp:disconnected');
      
      // Broadcast disconnection to all clients
      this.broadcast('whatsapp:status-changed', {
        status: 'disconnected'
      });
    } catch (error) {
      this.sendError('whatsapp:disconnection-error', error);
    }
  }

  /**
   * Handle send message request
   */
  async handleSendMessage(data) {
    this.log('Send message requested', { to: data.to });
    
    const validation = this.validateRequired(data, ['to', 'message']);
    if (!validation.isValid) {
      return this.sendError('whatsapp:send-error', 
        new Error(`Missing required fields: ${validation.missing.join(', ')}`));
    }

    try {
      if (!this.whatsappClient) {
        throw new Error('WhatsApp client not initialized');
      }

      const result = await this.whatsappClient.sendMessage(data.to, data.message);
      
      if (result.success) {
        this.sendSuccess('whatsapp:message-sent', {
          messageId: result.messageId,
          to: data.to
        });
        
        // Broadcast message sent event
        this.broadcastExcept('whatsapp:message-sent-broadcast', {
          to: data.to,
          message: data.message,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      this.sendError('whatsapp:send-error', error);
    }
  }

  /**
   * Handle get contacts request
   */
  async handleGetContacts(data) {
    this.log('Get contacts requested');
    
    try {
      if (!this.whatsappClient) {
        throw new Error('WhatsApp client not initialized');
      }

      const contacts = await this.whatsappClient.getContacts();
      
      this.sendSuccess('whatsapp:contacts-loaded', { contacts });
    } catch (error) {
      this.sendError('whatsapp:contacts-error', error);
    }
  }

  /**
   * Handle get groups request
   */
  async handleGetGroups(data) {
    this.log('Get groups requested');
    
    try {
      if (!this.whatsappClient) {
        throw new Error('WhatsApp client not initialized');
      }

      const groups = await this.whatsappClient.getGroups();
      
      this.sendSuccess('whatsapp:groups-loaded', { groups });
    } catch (error) {
      this.sendError('whatsapp:groups-error', error);
    }
  }

  /**
   * Handle incoming message (called by WhatsApp client)
   */
  handleIncomingMessage(message) {
    this.log('Incoming message received', { from: message.from });
    
    // Broadcast incoming message to all clients
    this.broadcast('whatsapp:message-received', {
      id: message.id,
      from: message.from,
      to: message.to,
      body: message.body,
      timestamp: message.timestamp,
      type: message.type
    });
  }

  /**
   * Handle WhatsApp client events
   */
  handleClientEvent(event, data) {
    this.log(`Client event: ${event}`, data);
    
    // Broadcast client events to all connected clients
    this.broadcast(`whatsapp:${event}`, data);
  }
}

module.exports = WhatsAppEventHandler;
