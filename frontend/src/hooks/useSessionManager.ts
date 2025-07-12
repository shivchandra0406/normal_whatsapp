import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface SessionManagerOptions {
  onSessionExpired?: (error: string) => void;
  showNotification?: (type: 'error' | 'warning', message: string, details?: string) => void;
}

export const useSessionManager = (options: SessionManagerOptions = {}) => {
  const navigate = useNavigate();
  const { onSessionExpired, showNotification } = options;

  const handleSessionExpired = useCallback((event: CustomEvent) => {
    const errorMessage = event.detail?.error || 'WhatsApp session has expired';
    
    // Show notification to user
    if (showNotification) {
      showNotification(
        'warning',
        'Your WhatsApp session has expired. Please login again.',
        'You will be redirected to the login page.'
      );
    }

    // Clear session data
    localStorage.removeItem('whatsapp_session');
    localStorage.removeItem('auth_token');
    sessionStorage.clear();

    // Call custom handler if provided
    if (onSessionExpired) {
      onSessionExpired(errorMessage);
    }

    // Redirect to login after a short delay to show notification
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 2000);
  }, [navigate, onSessionExpired, showNotification]);

  useEffect(() => {
    // Listen for session expiration events
    const handleEvent = (event: Event) => {
      handleSessionExpired(event as CustomEvent);
    };

    window.addEventListener('whatsapp-session-expired', handleEvent);

    return () => {
      window.removeEventListener('whatsapp-session-expired', handleEvent);
    };
  }, [handleSessionExpired]);

  return {
    clearSession: () => {
      localStorage.removeItem('whatsapp_session');
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
    },
    redirectToLogin: () => {
      navigate('/login', { replace: true });
    }
  };
};
