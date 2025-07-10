export interface Contact {
  id: string;
  name: string;
  number: string;
  isGroup: boolean;
  lastSeen?: string;
  profilePic?: string;
}

export interface Group {
  id: string;
  name: string;
  participants: Contact[];
  description?: string;
  profilePic?: string;
}

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: string;
  chatId: string;
}

export interface Campaign {
  id: string;
  name: string;
  message: string;
  contacts: Contact[];
  status: 'draft' | 'sending' | 'completed' | 'failed';
  sentCount: number;
  totalCount: number;
  createdAt: Date;
}

export interface WhatsAppSession {
  isConnected: boolean;
  qrCode?: string;
  clientInfo?: {
    name: string;
    phone: string;
  };
}