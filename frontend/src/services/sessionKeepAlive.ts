import { whatsAppService } from './api';

class SessionKeepAliveService {
  private static instance: SessionKeepAliveService;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private readonly KEEP_ALIVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private retryCount: number = 0;

  static getInstance(): SessionKeepAliveService {
    if (!SessionKeepAliveService.instance) {
      SessionKeepAliveService.instance = new SessionKeepAliveService();
    }
    return SessionKeepAliveService.instance;
  }

  start() {
    if (this.isActive) {
      console.log('Session keep-alive is already active');
      return;
    }

    console.log('Starting WhatsApp session keep-alive service');
    this.isActive = true;
    this.retryCount = 0;

    // Start the keep-alive interval
    this.keepAliveInterval = setInterval(() => {
      this.performKeepAlive();
    }, this.KEEP_ALIVE_INTERVAL);

    // Perform initial keep-alive check
    this.performKeepAlive();
  }

  stop() {
    if (!this.isActive) {
      return;
    }

    console.log('Stopping WhatsApp session keep-alive service');
    this.isActive = false;

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private async performKeepAlive() {
    try {
      console.log('Performing session keep-alive check...');

      // Use the dedicated keep-alive endpoint
      const keepAliveResult = await whatsAppService.keepAlive();

      if (keepAliveResult.success) {
        console.log('Session keep-alive: Success', keepAliveResult.message);
        this.retryCount = 0; // Reset retry count on success
      } else {
        console.warn('Session keep-alive: Failed', keepAliveResult);

        if (keepAliveResult.isSessionExpired) {
          console.error('Session expired during keep-alive check');
          this.stop();

          // Trigger session expired event
          window.dispatchEvent(new CustomEvent('whatsapp-session-expired', {
            detail: { error: 'Session expired during keep-alive check' }
          }));
          return;
        }

        this.handleConnectionLoss();
      }
    } catch (error) {
      console.error('Session keep-alive check failed:', error);
      this.handleKeepAliveError(error);
    }
  }

  private handleConnectionLoss() {
    this.retryCount++;
    
    if (this.retryCount >= this.MAX_RETRY_ATTEMPTS) {
      console.error('Max retry attempts reached. Session appears to be lost.');
      this.stop();
      
      // Trigger session expired event
      window.dispatchEvent(new CustomEvent('whatsapp-session-expired', {
        detail: { error: 'WhatsApp connection lost after multiple retry attempts' }
      }));
    } else {
      console.log(`Connection lost. Retry attempt ${this.retryCount}/${this.MAX_RETRY_ATTEMPTS}`);
    }
  }

  private handleKeepAliveError(error: any) {
    const errorMessage = error?.response?.data?.error || error?.message || '';
    
    // Check if this is a session expiration error
    const isSessionExpired = (
      errorMessage.includes('Session closed') ||
      errorMessage.includes('Protocol error') ||
      errorMessage.includes('session expired') ||
      errorMessage.includes('not connected')
    );

    if (isSessionExpired) {
      console.error('Session expired during keep-alive check');
      this.stop();
      
      // Trigger session expired event
      window.dispatchEvent(new CustomEvent('whatsapp-session-expired', {
        detail: { error: errorMessage }
      }));
    } else {
      // For other errors, increment retry count
      this.retryCount++;
      
      if (this.retryCount >= this.MAX_RETRY_ATTEMPTS) {
        console.error('Max retry attempts reached due to errors');
        this.stop();
      }
    }
  }

  isRunning(): boolean {
    return this.isActive;
  }

  getRetryCount(): number {
    return this.retryCount;
  }
}

export const sessionKeepAlive = SessionKeepAliveService.getInstance();

// Auto-start session keep-alive when the service is imported
// This ensures it starts as soon as the app loads
if (typeof window !== 'undefined') {
  // Start keep-alive after a short delay to ensure app is initialized
  setTimeout(() => {
    sessionKeepAlive.start();
  }, 2000);

  // Stop keep-alive when the page is about to unload
  window.addEventListener('beforeunload', () => {
    sessionKeepAlive.stop();
  });

  // Handle visibility change to pause/resume keep-alive
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Page is hidden, but keep the service running
      console.log('Page hidden, but keeping session alive');
    } else {
      // Page is visible again, ensure service is running
      if (!sessionKeepAlive.isRunning()) {
        console.log('Page visible again, restarting session keep-alive');
        sessionKeepAlive.start();
      }
    }
  });
}
