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

export interface CampaignResult {
  contactId: string;
  success: boolean;
  error?: string;
}

export interface BulkActionResult {
  groupId: string;
  groupName?: string;
  contactId?: string;
  success: boolean;
  error?: string;
  errorCategory?: string;
  message?: string;
  timestamp?: string;
  operation?: string;
}

export interface BulkOperationSummary {
  total: number;
  successful: number;
  failed: number;
  operation?: string;
  timestamp?: string;
  byCategory: {
    [category: string]: {
      count: number;
      description: string;
      actionableAdvice?: string;
      contacts: Array<{
        contactId: string;
        groupName: string;
        groupId: string;
        error: string;
        timestamp: string;
      }>;
    };
  };
  successfulByGroup?: {
    [groupName: string]: {
      groupId: string;
      groupName: string;
      count: number;
      contacts: Array<{
        contactId: string;
        message: string;
        timestamp: string;
      }>;
    };
  };
  failedByGroup?: {
    [groupName: string]: {
      groupId: string;
      groupName: string;
      count: number;
      contacts: Array<{
        contactId: string;
        error: string;
        errorCategory: string;
        timestamp: string;
      }>;
    };
  };
}

export interface DetailedOperationHistory {
  operationSummary: {
    operation: string;
    timestamp: string;
    totalProcessed: number;
    totalSuccessful: number;
    totalFailed: number;
    successRate: number;
  };
  resultsByContact: Array<{
    contactId: string;
    groupName: string;
    groupId: string;
    success: boolean;
    message: string;
    category?: string;
    timestamp: string;
    operation: string;
  }>;
  categoryBreakdown: {
    [category: string]: {
      count: number;
      description: string;
      actionableAdvice: string;
      contacts: Array<{
        contactId: string;
        groupName: string;
        groupId: string;
        error: string;
        timestamp: string;
      }>;
    };
  };
  groupBreakdown: {
    successful: {
      [groupName: string]: {
        groupId: string;
        groupName: string;
        count: number;
        contacts: Array<{
          contactId: string;
          message: string;
          timestamp: string;
        }>;
      };
    };
    failed: {
      [groupName: string]: {
        groupId: string;
        groupName: string;
        count: number;
        contacts: Array<{
          contactId: string;
          error: string;
          errorCategory: string;
          timestamp: string;
        }>;
      };
    };
  };
}

export interface GroupSearchCriteria {
  query: string;
  searchType: 'exact' | 'startsWith' | 'contains';
}

export interface GroupSearchResult {
  success: boolean;
  groups: Group[];
  totalCount: number;
}

export type TemplateCategory =
  | 'marketing'
  | 'customer-support'
  | 'notifications'
  | 'greetings'
  | 'announcements'
  | 'follow-up'
  | 'other';

export type TemplateType =
  | 'text'
  | 'text-with-image'
  | 'text-with-video'
  | 'text-with-document';

export interface TemplateMedia {
  id: string;
  type: 'image' | 'video' | 'document';
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  category: TemplateCategory;
  content: string;
  media?: TemplateMedia;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateRequest {
  name: string;
  type: TemplateType;
  category: TemplateCategory;
  content: string;
  description?: string;
  mediaFile?: File;
}

export interface UpdateTemplateRequest {
  name?: string;
  type?: TemplateType;
  category?: TemplateCategory;
  content?: string;
  description?: string;
  mediaFile?: File;
  removeMedia?: boolean;
}

export interface TemplateSearchFilters {
  category?: TemplateCategory;
  type?: TemplateType;
  searchQuery?: string;
}

export interface TemplateApiResponse {
  success: boolean;
  template?: Template;
  templates?: Template[];
  message?: string;
  error?: string;
}

export const TEMPLATE_CATEGORIES = {
  marketing: 'Marketing/Promotional',
  'customer-support': 'Customer Support',
  notifications: 'Notifications',
  greetings: 'Greetings',
  announcements: 'Announcements',
  'follow-up': 'Follow-up',
  other: 'Other'
} as const;

export const TEMPLATE_TYPES = {
  text: 'Text Only',
  'text-with-image': 'Text with Image',
  'text-with-video': 'Text with Video',
  'text-with-document': 'Text with Document'
} as const;

export interface CreateTemplateRequest {
  name: string;
  category: TemplateCategory;
  content: string;
  description?: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  category?: TemplateCategory;
  content?: string;
  description?: string;
}

export interface TemplateSearchFilters {
  category?: TemplateCategory;
  searchQuery?: string;
}

export interface TemplateApiResponse {
  success: boolean;
  template?: Template;
  templates?: Template[];
  message?: string;
  error?: string;
}