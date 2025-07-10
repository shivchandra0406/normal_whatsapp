import { useState, useEffect } from 'react';
import { WhatsAppSession, Contact, Group } from '../types';

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
  }, []);

  return {
    session,
    contacts,
    groups,
    loading,
    connect,
    disconnect,
    sendMessage,
    fetchContacts,
    fetchGroups
  };
};