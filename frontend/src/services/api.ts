import { Contact, Group, Campaign, CampaignResult, BulkActionResult } from '../types';
import { apiClient } from './config';

class WhatsAppService {
  async connectWhatsApp(): Promise<{ success: boolean; clientInfo: any }> {
    const response = await apiClient.post('/whatsapp/connect');
    return response.data;
  }

  async disconnectWhatsApp(): Promise<{ success: boolean }> {
    const response = await apiClient.post('/whatsapp/disconnect');
    return response.data;
  }

  async getQRCode(): Promise<{ success: boolean; qrCode: string }> {
    try {
      const response = await apiClient.get('/whatsapp/qr-code');
      if (response.data.qrCode) {
        console.log('QR code received from backend');
        return response.data;
      } else {
        console.warn('No QR code in response:', response.data);
        throw new Error('No QR code available');
      }
    } catch (error) {
      console.error('Error getting QR code:', error);
      throw error;
    }
  }

  async getStatus(): Promise<{ isConnected: boolean; clientInfo: any }> {
    try {
      const response = await apiClient.get('/whatsapp/status');
      console.log('WhatsApp status:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting status:', error);
      throw error;
    }
  }

  async getContacts(): Promise<{ success: boolean; contacts: Contact[] }> {
    const response = await apiClient.get('/whatsapp/contacts');
    return response.data;
  }

  async getGroups(): Promise<{ success: boolean; groups: Group[] }> {
    const response = await apiClient.get('/whatsapp/groups');
    return response.data;
  }

  async sendMessage(chatId: string, message: string): Promise<{ success: boolean }> {
    const response = await apiClient.post('/whatsapp/send-message', {
      chatId,
      message
    });
    return response.data;
  }
}

class CampaignService {
  async uploadContacts(file: File): Promise<{ success: boolean; contacts: Contact[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/campaign/upload-contacts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async sendCampaign(
    name: string,
    message: string,
    contacts: string[],
    file?: File
  ): Promise<{
    success: boolean;
    campaignName: string;
    totalContacts: number;
    successCount: number;
    failureCount: number;
    results: CampaignResult[];
  }> {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('message', message);
    
    if (contacts && contacts.length > 0) {
      formData.append('contacts', JSON.stringify(contacts));
    }
    
    if (file) {
      formData.append('file', file);
    }

    const response = await apiClient.post('/campaign/send', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async getCampaignHistory(): Promise<{ success: boolean; campaigns: Campaign[] }> {
    const response = await apiClient.get('/campaign/history');
    return response.data;
  }

  async bulkManageMembers(action: 'add' | 'remove', contacts: string[], groups: string[]): Promise<{ success: boolean; results: 
    BulkActionResult[] }> {
    const response = await apiClient.post('/campaign/bulk/manage-members', {
      action,
      contacts,
      groups
    });
    return response.data;
  }
}

export const whatsAppService = new WhatsAppService();
export const campaignService = new CampaignService();
