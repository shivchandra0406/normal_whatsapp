import React from 'react';
import { X, FileText, Image, Video, FileIcon, Download } from 'lucide-react';
import { Template, TEMPLATE_CATEGORIES, TEMPLATE_TYPES } from '../../types';
import { templateService } from '../../services/templateService';
import { convertHtmlToWhatsApp } from '../../utils/textFormat';

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template | null;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({ isOpen, onClose, template }) => {
  if (!isOpen || !template) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'text-with-image':
        return <Image className="w-5 h-5 text-green-500" />;
      case 'text-with-video':
        return <Video className="w-5 h-5 text-purple-500" />;
      case 'text-with-document':
        return <FileIcon className="w-5 h-5 text-orange-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      marketing: 'bg-blue-100 text-blue-800',
      'customer-support': 'bg-green-100 text-green-800',
      notifications: 'bg-yellow-100 text-yellow-800',
      greetings: 'bg-purple-100 text-purple-800',
      announcements: 'bg-red-100 text-red-800',
      'follow-up': 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const renderMedia = () => {
    if (!template.media) return null;

    const mediaUrl = templateService.getMediaUrl(template.media.filename);

    switch (template.media.type) {
      case 'image':
        return (
          <div className="mb-4">
            <img
              src={mediaUrl}
              alt={template.media.originalName}
              className="max-w-full h-auto rounded-lg shadow-sm"
              style={{ maxHeight: '300px' }}
            />
          </div>
        );
      case 'video':
        return (
          <div className="mb-4">
            <video
              controls
              className="max-w-full h-auto rounded-lg shadow-sm"
              style={{ maxHeight: '300px' }}
            >
              <source src={mediaUrl} type={template.media.mimeType} />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case 'document':
        return (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileIcon className="w-8 h-8 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">{template.media.originalName}</p>
                  <p className="text-sm text-gray-500">
                    {(template.media.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <a
                href={mediaUrl}
                download={template.media.originalName}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </a>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Template Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Template Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getTypeIcon(template.type)}
                <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getCategoryColor(template.category)}`}>
                {TEMPLATE_CATEGORIES[template.category as keyof typeof TEMPLATE_CATEGORIES]}
              </span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Type: {TEMPLATE_TYPES[template.type as keyof typeof TEMPLATE_TYPES]}</span>
              <span>•</span>
              <span>Created: {new Date(template.createdAt).toLocaleDateString()}</span>
              {template.updatedAt !== template.createdAt && (
                <>
                  <span>•</span>
                  <span>Updated: {new Date(template.updatedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          {template.description && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{template.description}</p>
            </div>
          )}

          {/* Media Preview */}
          {renderMedia()}

          {/* Message Content */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Message Content</h4>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">WA</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Your Business</div>
                    <div className="text-xs text-gray-500">WhatsApp Message</div>
                  </div>
                </div>
                <div className="bg-green-100 rounded-lg p-3 max-w-md">
                  <div className="whitespace-pre-wrap text-gray-900 text-sm">{template.content}</div>
                  <div className="text-xs text-gray-500 mt-2 text-right">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Template Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Template Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Template ID:</span>
                <p className="font-mono text-xs text-gray-700 break-all">{template.id}</p>
              </div>
              <div>
                <span className="text-gray-500">Character Count:</span>
                <p className="text-gray-700">{template.content.length} characters</p>
              </div>
              {template.media && (
                <>
                  <div>
                    <span className="text-gray-500">Media Type:</span>
                    <p className="text-gray-700 capitalize">{template.media.type}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">File Size:</span>
                    <p className="text-gray-700">{(template.media.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreviewModal;
