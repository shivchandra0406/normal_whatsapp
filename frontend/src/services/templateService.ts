import { apiClient } from './config';
import { 
  Template, 
  CreateTemplateRequest, 
  UpdateTemplateRequest, 
  TemplateSearchFilters,
  TemplateApiResponse 
} from '../types';

/**
 * Template service for managing message templates
 */
export class TemplateService {
  private baseUrl = '/templates';

  /**
   * Get all templates
   */
  async getAllTemplates(): Promise<Template[]> {
    try {
      const response = await apiClient.get<TemplateApiResponse>(this.baseUrl);
      return response.data.templates || [];
    } catch (error) {
      console.error('Failed to get templates:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<Template | null> {
    try {
      const response = await apiClient.get<TemplateApiResponse>(`${this.baseUrl}/${id}`);
      return response.data.template || null;
    } catch (error) {
      console.error('Failed to get template:', error);
      throw error;
    }
  }

  /**
   * Create new template
   */
  async createTemplate(data: CreateTemplateRequest): Promise<Template> {
    try {
      const formData = new FormData();
      
      formData.append('name', data.name);
      formData.append('type', data.type);
      formData.append('category', data.category);
      formData.append('content', data.content);
      
      if (data.description) {
        formData.append('description', data.description);
      }
      
      if (data.mediaFile) {
        formData.append('mediaFile', data.mediaFile);
      }

      const response = await apiClient.post<TemplateApiResponse>(this.baseUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data.success || !response.data.template) {
        throw new Error(response.data.error || 'Failed to create template');
      }

      return response.data.template;
    } catch (error) {
      console.error('Failed to create template:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, data: UpdateTemplateRequest): Promise<Template> {
    try {
      const formData = new FormData();
      
      if (data.name !== undefined) formData.append('name', data.name);
      if (data.type !== undefined) formData.append('type', data.type);
      if (data.category !== undefined) formData.append('category', data.category);
      if (data.content !== undefined) formData.append('content', data.content);
      if (data.description !== undefined) formData.append('description', data.description);
      if (data.removeMedia !== undefined) formData.append('removeMedia', data.removeMedia.toString());
      
      if (data.mediaFile) {
        formData.append('mediaFile', data.mediaFile);
      }

      const response = await apiClient.put<TemplateApiResponse>(`${this.baseUrl}/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data.success || !response.data.template) {
        throw new Error(response.data.error || 'Failed to update template');
      }

      return response.data.template;
    } catch (error) {
      console.error('Failed to update template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<TemplateApiResponse>(`${this.baseUrl}/${id}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  }

  /**
   * Search templates
   */
  async searchTemplates(filters: TemplateSearchFilters): Promise<Template[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters.category) params.append('category', filters.category);
      if (filters.type) params.append('type', filters.type);
      if (filters.searchQuery) params.append('q', filters.searchQuery);

      const response = await apiClient.get<TemplateApiResponse>(`${this.baseUrl}/search?${params}`);
      return response.data.templates || [];
    } catch (error) {
      console.error('Failed to search templates:', error);
      throw error;
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<Template[]> {
    try {
      const response = await apiClient.get<TemplateApiResponse>(`${this.baseUrl}/search?category=${category}`);
      return response.data.templates || [];
    } catch (error) {
      console.error('Failed to get templates by category:', error);
      throw error;
    }
  }

  /**
   * Get template media URL
   */
  getMediaUrl(filename: string): string {
    return `${this.baseUrl}/media/${filename}`;
  }
}

// Export singleton instance
export const templateService = new TemplateService();
