import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { TemplateFormatModal } from './TemplateFormatModal';

interface Template {
  name: string;
  headers: string[];
  description: string;
  sample: any[];
}

interface TemplateSelectorProps {
  onTemplateSelect: (templateName: string) => void;
}

export const TemplateSelector = ({ onTemplateSelect }: TemplateSelectorProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('basic');
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [templateToDownload, setTemplateToDownload] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const downloadTemplate = async (templateName: string, format: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/templates/${templateName}/sample`);
      const data = await response.json();
      
      if (data.success) {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data.sample.data);
        
        // Add headers
        XLSX.utils.sheet_add_aoa(worksheet, [data.sample.headers], { origin: 'A1' });
        
        if (format === 'csv') {
          // Convert to CSV
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          saveAs(blob, `whatsapp_contacts_${templateName}_template.csv`);
        } else {
          // Save as XLSX
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
          const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          const blob = new Blob([excelBuffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
          saveAs(blob, `whatsapp_contacts_${templateName}_template.xlsx`);
        }
      }
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const handleDownloadClick = (templateName: string) => {
    setTemplateToDownload(templateName);
    setIsFormatModalOpen(true);
  };

  const handleFormatSelect = (format: string) => {
    if (templateToDownload) {
      downloadTemplate(templateToDownload, format);
      setTemplateToDownload(null);
    }
  };

  const handleTemplateChange = (templateName: string) => {
    setSelectedTemplate(templateName);
    onTemplateSelect(templateName);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Contact Template</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Template Type
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {templates.map((template) => (
              <option key={template.name} value={template.name}>
                {template.name.charAt(0).toUpperCase() + template.name.slice(1)} - {template.description}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex space-x-4">
          <button
            onClick={() => handleDownloadClick(selectedTemplate)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Template
          </button>
        </div>

        <TemplateFormatModal
          isOpen={isFormatModalOpen}
          onClose={() => setIsFormatModalOpen(false)}
          onFormatSelect={handleFormatSelect}
        />

        {selectedTemplate && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Required Fields:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600">
              <li>Name (required)</li>
              <li>Phone Number (required)</li>
              <li>Country Code (required)</li>
              {templates.find(t => t.name === selectedTemplate)?.headers.map(header => {
                if (!['name', 'phone', 'countryCode'].includes(header)) {
                  return (
                    <li key={header}>
                      {header.charAt(0).toUpperCase() + header.slice(1)} (optional)
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
