import React, { useState, useEffect } from 'react';
// Import icons
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  Download,
  Upload,
  Trash2,
  Send
} from 'lucide-react';
import { convertHtmlToWhatsApp, convertWhatsAppToHtml } from '../../utils/textFormat';
interface Contact {
  id: string;
  name: string;
  number: string;
  isGroup: boolean;
  originalNumber?: string;
}

interface Group {
  id: string;
  name: string;
}

interface CampaignType {
  id: string;
  name: string;
  status: string;
  sentCount: number;
  totalCount: number;
  createdAt: Date;
}
// @ts-ignore
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './Campaign.css';

function Campaign() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [manualNumbers, setManualNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [campaigns, setCampaigns] = useState<CampaignType[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [sending, setSending] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [manualContacts, setManualContacts] = useState<Contact[]>([]);
  const [sendMode, setSendMode] = useState<'individual' | 'group' | 'both' | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch groups on mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch('/api/whatsapp/groups');
        const data = await response.json();
        setGroups(data.groups || []);
      } catch (error) {
        setGroups([]);
      }
    };
    fetchGroups();
  }, []);

  // Handle manual add contacts
  function handleAddManualContacts() {
    // Split by comma, semicolon, or new line, trim, and filter valid numbers
    const numbers = manualNumbers
      .split(/[,;\n]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);
    if (numbers.length === 0) {
      alert('Please enter at least one valid number.');
      return;
    }
    // Add to contacts list as manual contacts with WhatsApp ID format
    const manualContacts = numbers.map((number) => {
      // Clean the number - remove any special characters and spaces
      let cleanNumber = number.replace(/[^0-9]/g, '');
      
      if (number.startsWith('+')) {
        cleanNumber = number.substring(1);
      }
      
      // Try to detect country code
      // Common country codes: India (91), US (1), UAE (971)
      const commonCodes = ['91', '1', '971'];
      let hasCountryCode = false;
      
      for (const code of commonCodes) {
        if (cleanNumber.startsWith(code)) {
          hasCountryCode = true;
          break;
        }
      }
      
      // If no country code detected and number length is correct for a local number
      if (!hasCountryCode && cleanNumber.length === 10) {
        // Default to India (91) if the number starts with 6-9
        if (/^[6-9]/.test(cleanNumber)) {
          cleanNumber = '91' + cleanNumber;
        }
        // Default to UAE (971) if the number starts with 5
        else if (/^5/.test(cleanNumber)) {
          cleanNumber = '971' + cleanNumber;
        }
        // Default to US (1) if the number starts with anything else
        else {
          cleanNumber = '1' + cleanNumber;
        }
      }
      
      // Validate the number
      if (cleanNumber.length < 11) {
        alert(`Invalid number format: ${number}. Please include country code.`);
        return null;
      }
      
      return {
        id: cleanNumber + '@c.us',  // WhatsApp Web format: [number]@c.us
        name: `Contact ${cleanNumber}`,
        number: cleanNumber,
        originalNumber: number, // Keep original for reference
        isGroup: false
      };
    }).filter(contact => contact !== null);
    setContacts(prev => [...prev, ...manualContacts]);
    setManualNumbers('');
  }

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      alert('Please upload a CSV or Excel file');
      return;
    }

    setUploadStatus('uploading');
    setUploadedFile(file);
    setUploadedFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/campaign/upload-contacts', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.contacts) {
        // Only use contacts with valid WhatsApp IDs
        const validContacts = result.contacts.filter((contact: any) => 
          typeof contact.id === 'string' && contact.id.endsWith('@c.us')
        );
        
        if (validContacts.length === 0) {
          setUploadStatus('error');
          setUploadedFileName('');
          alert('No valid contacts found in the uploaded file.');
          return;
        }
        
        setContacts(prev => [...prev, ...validContacts]);
        setUploadStatus('success');
        alert(`File "${file.name}" uploaded successfully. ${validContacts.length} contacts added.`);
      } else {
        setUploadStatus('error');
        setUploadedFileName('');
        alert('Failed to upload contacts: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('File upload error:', error);
      setUploadStatus('error');
      setUploadedFileName('');
      alert('Failed to upload file. Please try again.');
    }
  };

  const handleSendCampaign = async () => {
    if (!campaignName.trim() || !message.trim()) {
      alert('Please fill in all fields.');
      return;
    }
    
    // Convert HTML message to WhatsApp format
    const whatsappMessage = convertHtmlToWhatsApp(message);
    
    if (!sendMode) {
      alert('Please select how you want to send: Individual, Group, or Both.');
      return;
    }

    // For individual or both modes, we need either contacts or a file
    if ((sendMode === 'individual' || sendMode === 'both') && contacts.length === 0 && !uploadedFile) {
      alert('Please add contacts manually or upload a file with contacts.');
      return;
    }

    // For group mode, we need at least one group selected
    if (sendMode === 'group' && selectedGroups.length === 0) {
      alert('Please select at least one group.');
      return;
    }

    setSending(true);

    try {
      const formData = new FormData();
      
      formData.append('campaignName', campaignName);
      formData.append('message', whatsappMessage);
      formData.append('sendMode', sendMode);
      
      // Add groups if in group mode
      if (sendMode === 'group' || sendMode === 'both') {
        formData.append('selectedGroups', JSON.stringify(selectedGroups));
      }
      
      // Add file if uploaded
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }
      
      // Always include manual contacts, even if a file is uploaded
      if (contacts.length > 0) {
        // Create a CSV string from manual contacts
        const csvContent = 'name,phone\n' + 
          contacts
            .filter(c => !c.isGroup) // Only include non-group contacts
            .map(c => `"${c.name}",${c.number}`)
            .join('\n');
        
        if (csvContent !== 'name,phone\n') { // Only add if there are actual contacts
          const blob = new Blob([csvContent], { type: 'text/csv' });
          formData.append('file', blob, 'manual_contacts.csv');
        }
      }

      const response = await fetch('/api/campaign/process-and-send', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Campaign started successfully! The messages will be sent in the background.');
        // Reset form
        setCampaignName('');
        setMessage('');
        setContacts([]);
        setUploadStatus('idle');
        setUploadedFile(null);
        setUploadedFileName('');
        setSendMode(null);
        setSelectedGroups([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Refresh campaign history
        if (activeTab === 'history') {
          fetchCampaigns();
        }
      } else {
        throw new Error(data.error || 'Failed to start campaign');
      }
    } catch (error) {
      console.error('Error starting campaign:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to start campaign'}`);
    } finally {
      setSending(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaign/history');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `name,phone
John Doe,+919876543210
Jane Smith,+971501234567
Bob Johnson,+12345678901
Alice Brown,919876543210
Charlie Wilson,971501234567`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'sending':
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  React.useEffect(() => {
    if (activeTab === 'history') {
      fetchCampaigns();
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Campaign Manager</h1>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('create')}
              className={`py-2 px-4 rounded-md transition-colors duration-200 ${
                activeTab === 'create'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Create Campaign
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-4 rounded-md transition-colors duration-200 ${
                activeTab === 'history'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Campaign History
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'create' ? (
          <div className="max-w-full mx-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {/* Upload & Manual Add Section */}
              <div className="bg-white rounded-lg shadow-sm p-3">
                <h2 className="text-lg font-semibold mb-3">Add Contacts</h2>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Enter campaign name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                {/* Manual Add Numbers */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Add Numbers (comma, semicolon, or new line separated)
                  </label>
                  <textarea
                    value={manualNumbers}
                    onChange={e => setManualNumbers(e.target.value)}
                    placeholder="e.g. +1234567890, +0987654321 or one per line"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    rows={3}
                  />
                  <button
                    onClick={handleAddManualContacts}
                    className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Add Numbers
                  </button>
                </div>
                {/* File Upload */}
                {/* Group Selection with Search/Filter - Only show when send mode is group or both */}
                {(sendMode === 'group' || sendMode === 'both') && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Groups
                    </label>
                    <input
                      type="text"
                      placeholder="Search group name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
                      value={groupSearch}
                      onChange={e => setGroupSearch(e.target.value)}
                    />
                    <div className="max-h-60 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                      {groups
                        .filter(group => (group.name || '').toLowerCase().includes(groupSearch.toLowerCase()))
                        .map((group) => (
                          <div 
                            key={group.id} 
                            onClick={() => {
                              setSelectedGroups(prev =>
                                prev.includes(group.id)
                                  ? prev.filter(id => id !== group.id)
                                  : [...prev, group.id]
                              );
                            }}
                            className={`flex items-center space-x-2 p-2 mb-1 cursor-pointer rounded-md hover:bg-gray-100 ${
                              selectedGroups.includes(group.id) ? 'bg-green-50 border border-green-200' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedGroups.includes(group.id)}
                              onChange={() => {}}
                              className="text-green-500 rounded"
                            />
                            <div className="flex flex-col flex-1">
                              <span className="text-sm font-medium text-gray-700">{group.name}</span>
                              <span className="text-xs text-gray-500">{group.participants?.length || 0} members</span>
                            </div>
                            {selectedGroups.includes(group.id) && (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                        ))
                      }
                      {groups.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          <p>No groups found</p>
                        </div>
                      )}
                    </div>
                    {selectedGroups.length > 0 && (
                      <p className="text-sm text-green-600 mt-2">
                        {selectedGroups.length} group{selectedGroups.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Upload Contact File
                    </label>
                    <button
                      onClick={downloadTemplate}
                      className="text-sm text-green-600 hover:text-green-700 flex items-center"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Template
                    </button>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    <p>• <strong>CSV/XLSX format:</strong> name,phone (with country code)</p>
                    <p>• <strong>Examples:</strong> +919876543210, +971501234567, +12345678901</p>
                    <p>• <strong>Local numbers:</strong> 9876543210 (auto-detects country)</p>
                  </div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        const input = fileInputRef.current;
                        if (input) {
                          const dataTransfer = new DataTransfer();
                          dataTransfer.items.add(file);
                          input.files = dataTransfer.files;
                          handleFileUpload({ target: input } as any);
                        }
                      }
                    }}
                    className="relative"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ${
                        uploadStatus === 'success' ? 'border-green-300 bg-green-50' :
                        uploadStatus === 'error' ? 'border-red-300 bg-red-50' :
                        'border-gray-300 hover:border-green-400 hover:bg-green-50'
                      }`}
                    >
                      {uploadStatus === 'success' && uploadedFileName ? (
                        <>
                          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                          <p className="text-sm font-medium text-green-600">
                            {uploadedFileName}
                          </p>
                          <p className="text-xs text-green-500 mt-1">
                            File uploaded successfully
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            For XLSX: Fill campaign name & message first
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {uploadStatus === 'uploading' && (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Uploading...</p>
                  </div>
                )}
                {contacts.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span className="font-medium text-green-800">
                        {contacts.length} contacts added
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {contacts.slice(0, 10).map((contact, index) => (
                        <div key={index} className="flex items-center justify-between py-1">
                          <span className="text-sm text-green-700">
                            {contact.name} - {contact.number}
                          </span>
                          <button
                            onClick={() => removeContact(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {contacts.length > 10 && (
                        <p className="text-xs text-green-600 mt-2">
                          +{contacts.length - 10} more contacts
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Message Section */}
              <div className="bg-white rounded-lg shadow-sm p-3">
                <h2 className="text-lg font-semibold mb-3">Message Content</h2>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Message
                  </label>
                  <div className="editor-container" style={{ minHeight: '300px' }}>
                    <div className="quill-wrapper">
                      <ReactQuill
                        theme="snow"
                        value={message}
                        onChange={setMessage}
                        modules={{
                          toolbar: [
                            ['bold', 'italic', 'underline'],
                            [{ list: 'ordered' }, { list: 'bullet' }],
                            ['emoji'],
                            ['clean']
                          ]
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <h3 className="font-medium text-gray-800 mb-1">Preview</h3>
                    <div className="bg-white rounded-lg p-3 border whitespace-pre-wrap">
                      {message ? message : 'Your message will appear here...'}
                    </div>
                  </div>

                  {/* Send Mode Selection */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Send Mode</label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-lg border ${sendMode === 'individual' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 border-gray-300'}`}
                        onClick={() => setSendMode('individual')}
                      >
                        Individual
                      </button>
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-lg border ${sendMode === 'group' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 border-gray-300'}`}
                        onClick={() => setSendMode('group')}
                      >
                        Group
                      </button>
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-lg border ${sendMode === 'both' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 border-gray-300'}`}
                        onClick={() => setSendMode('both')}
                      >
                        Both
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleSendCampaign}
                    disabled={
                      sending || 
                      !campaignName.trim() || 
                      !message.trim() || 
                      !sendMode ||
                      (sendMode === 'individual' && contacts.length === 0) ||
                      (sendMode === 'group' && selectedGroups.length === 0) ||
                      (sendMode === 'both' && contacts.length === 0 && selectedGroups.length === 0)
                    }
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                  >
                    {sending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Sending Campaign...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Send Campaign
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-full mx-2">
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No campaigns found
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((campaign) => (
                      <tr key={campaign.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{campaign.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(campaign.status)}
                            <span className="ml-2 text-sm text-gray-900 capitalize">
                              {campaign.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {campaign.sentCount} / {campaign.totalCount}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${(campaign.sentCount / campaign.totalCount) * 100}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(campaign.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {campaign.message}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Campaign;
