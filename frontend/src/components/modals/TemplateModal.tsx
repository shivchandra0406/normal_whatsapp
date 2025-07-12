import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Image, Video, FileIcon } from 'lucide-react';
import { 
  Template, 
  CreateTemplateRequest, 
  UpdateTemplateRequest,
  TemplateCategory, 
  TemplateType,
  TEMPLATE_CATEGORIES,
  TEMPLATE_TYPES 
} from '../../types';
import { templateService } from '../../services/templateService';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: Template | null;
  onSave: () => void;
}

const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, template, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as TemplateType,
    category: 'other' as TemplateCategory,
    content: '',
    description: ''
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        type: template.type,
        category: template.category,
        content: template.content,
        description: template.description || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'text',
        category: 'other',
        content: '',
        description: ''
      });
    }
    setMediaFile(null);
    setErrors([]);
  }, [template, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
    }
  };

  const validateForm = () => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) {
      newErrors.push('Template name is required');
    }

    if (!formData.content.trim()) {
      newErrors.push('Template content is required');
    }

    if (formData.type !== 'text' && !mediaFile && !template?.media) {
      newErrors.push(`Media file is required for ${TEMPLATE_TYPES[formData.type]}`);
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (template) {
        // Update existing template
        const updateData: UpdateTemplateRequest = {
          ...formData,
          mediaFile: mediaFile || undefined
        };
        await templateService.updateTemplate(template.id, updateData);
      } else {
        // Create new template
        const createData: CreateTemplateRequest = {
          ...formData,
          mediaFile: mediaFile || undefined
        };
        await templateService.createTemplate(createData);
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
      setErrors(['Failed to save template. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: TemplateType) => {
    switch (type) {
      case 'text':
        return <FileText className="w-5 h-5" />;
      case 'text-with-image':
        return <Image className="w-5 h-5" />;
      case 'text-with-video':
        return <Video className="w-5 h-5" />;
      case 'text-with-document':
        return <FileIcon className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getAcceptedFileTypes = () => {
    switch (formData.type) {
      case 'text-with-image':
        return 'image/*';
      case 'text-with-video':
        return 'video/*';
      case 'text-with-document':
        return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {template ? 'Edit Template' : 'Create New Template'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="text-red-600 text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter template name"
              required
            />
          </div>

          {/* Template Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(TEMPLATE_TYPES).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="type"
                    value={key}
                    checked={formData.type === key}
                    onChange={handleInputChange}
                    className="text-green-500 focus:ring-green-500"
                  />
                  {getTypeIcon(key as TemplateType)}
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              {Object.entries(TEMPLATE_CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Media Upload */}
          {formData.type !== 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Media File *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Upload {TEMPLATE_TYPES[formData.type].toLowerCase()}
                </p>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept={getAcceptedFileTypes()}
                  className="hidden"
                  id="media-upload"
                />
                <label
                  htmlFor="media-upload"
                  className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer transition-colors"
                >
                  Choose File
                </label>
                {mediaFile && (
                  <p className="text-sm text-green-600 mt-2">
                    Selected: {mediaFile.name}
                  </p>
                )}
                {template?.media && !mediaFile && (
                  <p className="text-sm text-blue-600 mt-2">
                    Current: {template.media.originalName}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Content *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your message content..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Brief description of the template's purpose..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateModal;
