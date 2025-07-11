import { useState, useEffect } from 'react';
import { WhatsAppSession, Contact, Group } from '../types';
import { socketService } from '../services/socketService';

export const useWhatsApp = () => {
  const [session, setSession] = useState<WhatsAppSession>({
    isConnected: false
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);

  const connect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setSession({
          isConnected: true,
          clientInfo: data.clientInfo
        });
        await fetchContacts();
        await fetchGroups();
      }
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
      });
      setSession({ isConnected: false });
      setContacts([]);
      setGroups([]);
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/whatsapp/logout', {
        method: 'POST',
      });
      setSession({ isConnected: false });
      setContacts([]);
      setGroups([]);

      // Show logout notification
      alert('WhatsApp session has been logged out successfully.');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout on frontend even if backend call fails
      setSession({ isConnected: false });
      setContacts([]);
      setGroups([]);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/whatsapp/contacts');
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/whatsapp/groups');
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const sendMessage = async (chatId: string, message: string) => {
    try {
      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatId, message }),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to send message:', error);
      return { success: false, error: 'Failed to send message' };
    }
  };

  useEffect(() => {
    // Initialize socket connection
    socketService.connect();

    // Set up socket event listeners for session management
    const handleSessionExpired = (data: any) => {
      console.log('WhatsApp session expired:', data);
      setSession({ isConnected: false });
      setContacts([]);
      setGroups([]);

      // Show notification to user
      alert(`WhatsApp session expired: ${data.message}. Please reconnect.`);
    };

    const handleAuthFailure = (data: any) => {
      console.log('WhatsApp authentication failed:', data);
      setSession({ isConnected: false });
      setContacts([]);
      setGroups([]);

      // Show notification to user
      alert(`WhatsApp authentication failed: ${data.message}. Please reconnect.`);
    };

    const handleDisconnected = (data: any) => {
      console.log('WhatsApp disconnected:', data);
      setSession({ isConnected: false });
      setContacts([]);
      setGroups([]);

      // Show notification to user
      alert(`WhatsApp disconnected: ${data.message}. Please reconnect.`);
    };

    const handleLoggedOut = (data: any) => {
      console.log('WhatsApp logged out:', data);
      setSession({ isConnected: false });
      setContacts([]);
      setGroups([]);

      // Show notification to user
      alert(data.message || 'WhatsApp session logged out.');
    };

    // Register socket event listeners
    socketService.on('whatsapp:session_expired', handleSessionExpired);
    socketService.on('whatsapp:auth_failure', handleAuthFailure);
    socketService.on('whatsapp:disconnected', handleDisconnected);
    socketService.on('whatsapp:logged_out', handleLoggedOut);

    // Check if already connected
    const checkConnection = async () => {
      try {
        // First check if server is running
        const healthResponse = await fetch('/api/health');
        if (!healthResponse.ok) {
          console.error('Server not responding');
          return;
        }

        const response = await fetch('/api/whatsapp/status');
        const data = await response.json();
        if (data.isConnected) {
          setSession({
            isConnected: true,
            clientInfo: data.clientInfo
          });
          await fetchContacts();
          await fetchGroups();
        }
      } catch (error) {
        console.error('Failed to check connection:', error);
      }
    };

    checkConnection();

    // Cleanup function
    return () => {
      socketService.off('whatsapp:session_expired', handleSessionExpired);
      socketService.off('whatsapp:auth_failure', handleAuthFailure);
      socketService.off('whatsapp:disconnected', handleDisconnected);
      socketService.off('whatsapp:logged_out', handleLoggedOut);
    };
  }, []);

  return {
    session,
    contacts,
    groups,
    loading,
    connect,
    disconnect,
    logout,
    sendMessage,
    fetchContacts,
    fetchGroups
  };
};