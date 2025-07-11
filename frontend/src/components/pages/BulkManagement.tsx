import React, { useState } from 'react';
import {
  Users,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  XCircle,
  ArrowRight,
  User,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { Contact, Group, BulkActionResult } from '../../types';
import { whatsAppService, campaignService } from '../../services/api.ts';

interface BulkManagementProps {
  contacts: Contact[];
  groups: Group[];
  onRefresh: () => void;
}

const BulkManagement: React.FC<BulkManagementProps> = ({
  contacts,
  groups,
  onRefresh
}) => {
  const [activeOperation, setActiveOperation] = useState<'add' | 'remove'>('add');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [contactNumbers, setContactNumbers] = useState('');
  const [searchType, setSearchType] = useState<'exact' | 'startsWith' | 'contains'>('contains');
  const [searchResults, setSearchResults] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [operationResults, setOperationResults] = useState<BulkActionResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    details?: string;
  } | null>(null);

  // Individual member addition states
  const [memberPhone, setMemberPhone] = useState('');
  const [membersList, setMembersList] = useState<Array<{id: string, phone: string}>>([]);

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string, details?: string) => {
    setNotification({ type, message, details });
    setTimeout(() => setNotification(null), 5000); // Auto-hide after 5 seconds
  };

  const handleAddMember = () => {
    if (!memberPhone.trim()) {
      showNotification('warning', 'Please enter a phone number');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(memberPhone.replace(/[\s\-\(\)]/g, ''))) {
      showNotification('warning', 'Please enter a valid phone number');
      return;
    }

    // Check for duplicate phone numbers
    if (membersList.some(member => member.phone === memberPhone)) {
      showNotification('warning', 'This phone number is already in the list');
      return;
    }

    const newMember = {
      id: Date.now().toString(),
      phone: memberPhone.trim()
    };

    setMembersList(prev => [...prev, newMember]);
    setMemberPhone('');
    showNotification('success', `Added ${memberPhone} to the list`);
  };

  const handleRemoveMember = (id: string) => {
    setMembersList(prev => prev.filter(member => member.id !== id));
    showNotification('info', 'Member removed from list');
  };

  const handleSearchGroups = async () => {
    if (!groupSearchQuery.trim()) {
      showNotification('warning', 'Please enter a group name to search');
      return;
    }

    setSearching(true);
    setNotification(null); // Clear previous notifications

    try {
      const result = await whatsAppService.searchGroups(groupSearchQuery.trim(), searchType);
      if (result.success) {
        setSearchResults(result.groups);
        setSelectedGroups([]); // Clear previous selections

        if (result.groups.length === 0) {
          showNotification('info', `No groups found matching "${groupSearchQuery}" using ${searchType} search`);
        } else {
          showNotification('success', `Found ${result.groups.length} group(s) matching "${groupSearchQuery}"`);
        }
      } else {
        showNotification('error', 'Failed to search groups', 'Please check your connection and try again');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification('error', 'Failed to search groups', errorMessage);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const parseContactNumbers = (input: string): string[] => {
    return input
      .split(/[,\n]/)
      .map(num => num.trim())
      .filter(num => num.length > 0);
  };

  const handleBulkOperation = async () => {
    const bulkNumbers = parseContactNumbers(contactNumbers);
    const individualNumbers = membersList.map(member => member.phone);
    const allNumbers = [...bulkNumbers, ...individualNumbers];

    if (allNumbers.length === 0) {
      showNotification('warning', 'Please enter at least one contact number or add individual members');
      return;
    }

    if (selectedGroups.length === 0) {
      showNotification('warning', 'Please select at least one group from the search results');
      return;
    }

    // Validate contact numbers format
    const invalidNumbers = allNumbers.filter(num => {
      const cleaned = num.replace(/[^\d+]/g, '');
      return cleaned.length < 10 || (cleaned.startsWith('+') && cleaned.length < 11);
    });

    if (invalidNumbers.length > 0) {
      showNotification(
        'warning',
        'Some contact numbers appear to be invalid',
        `Invalid numbers: ${invalidNumbers.join(', ')}`
      );
      return;
    }

    setLoading(true);
    setOperationResults([]);
    setShowResults(false);
    setNotification(null);

    try {
      const result = await campaignService.bulkManageMembersByNumbers(
        activeOperation,
        allNumbers,
        selectedGroups
      );

      if (result.success) {
        setOperationResults(result.results);
        setShowResults(true);

        // Show summary
        const { successful, failed, total } = result.summary;

        if (successful === total) {
          showNotification(
            'success',
            `All operations completed successfully!`,
            `${successful} out of ${total} operations succeeded`
          );
        } else if (successful > 0) {
          showNotification(
            'warning',
            `Operation partially completed`,
            `${successful} succeeded, ${failed} failed out of ${total} total operations`
          );
        } else {
          showNotification(
            'error',
            `All operations failed`,
            `${failed} out of ${total} operations failed. Check the results below for details.`
          );
        }

        // Clear form on success
        if (successful > 0) {
          setContactNumbers('');
          setSelectedGroups([]);
          onRefresh();
        }
      } else {
        const errorMessage = (result as any).error || 'Unknown error occurred';
        showNotification('error', 'Failed to perform bulk operation', errorMessage);
      }
    } catch (error) {
      console.error('Bulk operation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network or server error occurred';
      showNotification('error', 'Failed to perform bulk operation', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg border ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {notification.type === 'error' && <XCircle className="w-5 h-5" />}
              {notification.type === 'warning' && <AlertCircle className="w-5 h-5" />}
              {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
            </div>
            <div className="ml-3 flex-1">
              <p className="font-medium">{notification.message}</p>
              {notification.details && (
                <p className="mt-1 text-sm opacity-90">{notification.details}</p>
              )}
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bulk Management</h1>
            <p className="text-gray-600 mt-1">Add or remove contacts from multiple groups</p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Add Member Button */}
            {selectedGroups.length > 0 && membersList.length > 0 && (
              <button
                onClick={handleBulkOperation}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>
                  {loading
                    ? `${activeOperation === 'add' ? 'Adding' : 'Removing'} to Groups...`
                    : `${activeOperation === 'add' ? 'Add to' : 'Remove from'} ${selectedGroups.length} Group${selectedGroups.length !== 1 ? 's' : ''}`
                  }
                </span>
              </button>
            )}

            {/* Operation Toggle */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveOperation('add')}
                className={`py-2 px-4 rounded-md transition-colors duration-200 text-sm ${
                  activeOperation === 'add'
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Add to Groups
              </button>
              <button
                onClick={() => setActiveOperation('remove')}
                className={`py-2 px-4 rounded-md transition-colors duration-200 text-sm ${
                  activeOperation === 'remove'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Remove from Groups
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-6">


          {/* Individual Phone Numbers */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Individual Phone Numbers</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                    placeholder="Enter phone number (e.g., +1234567890)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddMember}
                    disabled={!memberPhone.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Number</span>
                  </button>
                </div>
              </div>

              {membersList.length > 0 && (
                <div className="flex justify-end">
                  <span className="text-sm text-gray-600">
                    {membersList.length} number{membersList.length !== 1 ? 's' : ''} added
                  </span>
                </div>
              )}

              {/* Phone Numbers List */}
              {membersList.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Added Phone Numbers:</h3>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
                    {membersList.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-100 rounded-full p-1">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.phone}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Remove phone number"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Group Search */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Search Groups</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    placeholder="Enter group name to search..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchGroups()}
                  />
                </div>
                <div className="flex-shrink-0">
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as 'exact' | 'startsWith' | 'contains')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="exact">Exact Match</option>
                    <option value="startsWith">Starts With</option>
                    <option value="contains">Contains</option>
                  </select>
                </div>
                <button
                  onClick={handleSearchGroups}
                  disabled={searching || !groupSearchQuery.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Group Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Search Results ({searchResults.length} groups found)
              </h2>
              <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {searchResults.map((group) => (
                  <div
                    key={group.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      {/* Checkbox for selection */}
                      <input
                        type="checkbox"
                        id={`group-${group.id}`}
                        checked={selectedGroups.includes(group.id)}
                        onChange={() => handleGroupToggle(group.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />

                      {/* Group icon */}
                      <div className="bg-green-500 rounded-full p-1">
                        <Users className="w-4 h-4 text-white" />
                      </div>

                      {/* Group info */}
                      <div className="flex-1">
                        <label
                          htmlFor={`group-${group.id}`}
                          className="font-medium text-gray-800 cursor-pointer"
                        >
                          {group.name}
                        </label>
                        <p className="text-sm text-gray-500">{group.participants.length} members</p>
                      </div>

                      {/* Selected indicator */}
                      {selectedGroups.includes(group.id) && (
                        <div className="flex items-center text-green-600 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Selected
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {searchResults.length === 0 && searchQuery && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No groups found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>

              {/* Selected Groups Summary */}
              {selectedGroups.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {selectedGroups.length} group{selectedGroups.length !== 1 ? 's' : ''} selected for {activeOperation === 'add' ? 'adding contacts' : 'removing contacts'}
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedGroups.map(groupId => {
                      const group = searchResults.find(g => g.id === groupId);
                      return group ? (
                        <div key={groupId} className="flex items-center justify-between bg-white p-2 rounded border">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">{group.name}</span>
                            <span className="text-xs text-gray-500">({group.participants.length} members)</span>
                          </div>
                          <button
                            onClick={() => handleGroupToggle(groupId)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Remove from selection"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {(parseContactNumbers(contactNumbers).length > 0 || membersList.length > 0 || selectedGroups.length > 0) && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="text-center text-sm text-gray-600">
                <p className="flex items-center justify-center space-x-4 flex-wrap">
                  <span className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {parseContactNumbers(contactNumbers).length} bulk contact(s)
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {membersList.length} individual number(s)
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {selectedGroups.length} group(s) selected
                  </span>
                </p>
                {selectedGroups.length > 0 && (parseContactNumbers(contactNumbers).length > 0 || membersList.length > 0) && (
                  <p className="mt-2 text-xs text-blue-600">
                    Ready to {activeOperation === 'add' ? 'add' : 'remove'} members using the button above
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Operation Results */}
          {showResults && operationResults.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Operation Results</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {operationResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center">
                      {result.success ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 mr-3" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          Contact: {result.contactId}
                        </p>
                        <p className="text-xs text-gray-600">
                          Group: {searchResults.find(g => g.id === result.groupId)?.name || result.groupId}
                        </p>
                        {result.error && (
                          <p className="text-xs text-red-600 mt-1">{result.error}</p>
                        )}
                        {result.success && (result as any).message && (
                          <p className="text-xs text-green-600 mt-1">{(result as any).message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkManagement;