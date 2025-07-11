import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Upload,
  FileText,
  Image,
  Video,
  FileIcon,
  Eye,
  Smile
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import EmojiPicker from 'emoji-picker-react';
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
import { convertHtmlToPlainText } from '../../utils/textFormat';

const CreateTemplate: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as TemplateType,
    category: 'other' as TemplateCategory,
    content: '',
    description: ''
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [existingTemplate, setExistingTemplate] = useState<Template | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    if (isEditing && id) {
      loadTemplate(id);
    }
  }, [isEditing, id]);

  const loadTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      const template = await templateService.getTemplateById(templateId);
      setExistingTemplate(template);
      setFormData({
        name: template.name,
        type: template.type,
        category: template.category,
        content: template.content,
        description: template.description || ''
      });
    } catch (error) {
      console.error('Failed to load template:', error);
      setErrors(['Failed to load template']);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors([]);
  };

  const handleContentChange = (content: string) => {
    setFormData(prev => ({ ...prev, content }));
    setErrors([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      const position = range ? range.index : quill.getLength();
      quill.insertText(position, emojiData.emoji);
      quill.setSelection(position + emojiData.emoji.length);
    }
    setShowEmojiPicker(false);
  };

  const validateForm = () => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) {
      newErrors.push('Template name is required');
    }

    if (!formData.content.trim()) {
      newErrors.push('Template content is required');
    }

    if (formData.type !== 'text' && !mediaFile && !existingTemplate?.media) {
      newErrors.push(`Media file is required for ${TEMPLATE_TYPES[formData.type]}`);
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (isEditing && id) {
        // Update existing template
        const updateData: UpdateTemplateRequest = {
          ...formData,
          mediaFile: mediaFile || undefined
        };
        await templateService.updateTemplate(id, updateData);
      } else {
        // Create new template
        const createData: CreateTemplateRequest = {
          ...formData,
          mediaFile: mediaFile || undefined
        };
        await templateService.createTemplate(createData);
      }
      
      navigate('/templates');
    } catch (error) {
      console.error('Failed to save template:', error);
      setErrors(['Failed to save template. Please try again.']);
    } finally {
      setSaving(false);
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

  const renderMediaPreview = () => {
    if (formData.type === 'text') return null;

    let mediaUrl = '';
    let mediaName = '';

    if (mediaFile) {
      mediaUrl = URL.createObjectURL(mediaFile);
      mediaName = mediaFile.name;
    } else if (existingTemplate?.media) {
      mediaUrl = templateService.getMediaUrl(existingTemplate.media.filename);
      mediaName = existingTemplate.media.originalName;
    }

    if (!mediaUrl) return null;

    switch (formData.type) {
      case 'text-with-image':
        return (
          <div className="mb-4">
            <img
              src={mediaUrl}
              alt={mediaName}
              className="max-w-full h-auto rounded-lg shadow-sm"
              style={{ maxHeight: '200px' }}
            />
          </div>
        );
      case 'text-with-video':
        return (
          <div className="mb-4">
            <video
              controls
              className="max-w-full h-auto rounded-lg shadow-sm"
              style={{ maxHeight: '200px' }}
            >
              <source src={mediaUrl} />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case 'text-with-document':
        return (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-3">
              <FileIcon className="w-6 h-6 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900 text-sm">{mediaName}</p>
                <p className="text-xs text-gray-500">Document file</p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/templates')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Templates</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Template' : 'Create New Template'}
            </h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row gap-4 p-4">
          {/* Left Side - Form (60% on desktop, full width on mobile) */}
          <div className="w-full lg:w-3/5 bg-white rounded-lg shadow-sm p-6 overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Template Details</h2>
            
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <ul className="text-red-600 text-sm space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Template Name */}
            <div className="mb-6">
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
            <div className="mb-6">
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
            <div className="mb-6">
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
              <div className="mb-6">
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
                  {existingTemplate?.media && !mediaFile && (
                    <p className="text-sm text-blue-600 mt-2">
                      Current: {existingTemplate.media.originalName}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mb-6">
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

            {/* Content Editor */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Message Content *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Smile className="w-4 h-4" />
                    <span>Emoji</span>
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute top-full right-0 mt-2 z-50">
                      <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        width={300}
                        height={400}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <ReactQuill
                  ref={quillRef}
                  value={formData.content}
                  onChange={handleContentChange}
                  theme="snow"
                  placeholder="Enter your message content..."
                  style={{ minHeight: '200px' }}
                />
              </div>
            </div>
          </div>

          {/* Right Side - Preview (40% on desktop, full width on mobile) */}
          <div className="w-full lg:w-2/5 bg-white rounded-lg shadow-sm p-6 overflow-y-auto">
            <div className="flex items-center space-x-2 mb-6">
              <Eye className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">WhatsApp Preview</h2>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
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

                {/* Media Preview */}
                {renderMediaPreview()}

                {/* Message Content */}
                <div className="bg-green-100 rounded-lg p-3 max-w-md">
                  <div className="text-gray-900 text-sm">
                    {formData.content ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: formData.content
                        }}
                        style={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: '1.4'
                        }}
                        className="preview-content"
                      />
                    ) : (
                      <span className="text-gray-500">Your message will appear here...</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 text-right">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Template Info */}
            {formData.name && (
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Template Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="text-gray-700 font-medium">{formData.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <p className="text-gray-700">{TEMPLATE_TYPES[formData.type]}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Category:</span>
                    <p className="text-gray-700">{TEMPLATE_CATEGORIES[formData.category]}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Character Count:</span>
                    <p className="text-gray-700">{convertHtmlToPlainText(formData.content).length} characters</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTemplate;
