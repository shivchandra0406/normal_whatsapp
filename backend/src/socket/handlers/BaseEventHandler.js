/**
 * Base event handler class
 * All specific event handlers should extend this class
 */
class BaseEventHandler {
  constructor(socket, io) {
    this.socket = socket;
    this.io = io;
  }

  /**
   * Send response to the client
   */
  sendResponse(event, data) {
    this.socket.emit(event, data);
  }

  /**
   * Send error response to the client
   */
  sendError(event, error, message = 'An error occurred') {
    this.socket.emit(event, {
      success: false,
      error: message,
      details: error.message || error
    });
  }

  /**
   * Send success response to the client
   */
  sendSuccess(event, data = {}, message = 'Operation successful') {
    this.socket.emit(event, {
      success: true,
      message,
      ...data
    });
  }

  /**
   * Broadcast to all clients
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Broadcast to all clients except sender
   */
  broadcastExcept(event, data) {
    this.socket.broadcast.emit(event, data);
  }

  /**
   * Log event handling
   */
  log(message, data = null) {
    console.log(`[${this.constructor.name}] ${message}`, data || '');
  }

  /**
   * Log error
   */
  logError(message, error) {
    console.error(`[${this.constructor.name}] ${message}:`, error);
  }

  /**
   * Validate required fields in data
   */
  validateRequired(data, requiredFields) {
    const missing = [];
    
    for (const field of requiredFields) {
      if (!data || data[field] === undefined || data[field] === null || data[field] === '') {
        missing.push(field);
      }
    }

    return {
      isValid: missing.length === 0,
      missing
    };
  }

  /**
   * Handle async operations with error catching
   */
  async handleAsync(operation, errorEvent, successEvent = null) {
    try {
      const result = await operation();
      
      if (successEvent) {
        this.sendSuccess(successEvent, result);
      }
      
      return result;
    } catch (error) {
      this.logError(`Error in ${operation.name || 'operation'}`, error);
      this.sendError(errorEvent, error);
      throw error;
    }
  }
}

module.exports = BaseEventHandler;
