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
import { useSessionManager } from '../../hooks/useSessionManager';

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
  const [operationSummary, setOperationSummary] = useState<any>(null);
  const [detailedHistory, setDetailedHistory] = useState<any>(null);
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

  // Initialize session manager
  useSessionManager({
    showNotification: (type, message, details) => showNotification(type, message, details),
    onSessionExpired: (error) => {
      console.log('WhatsApp session expired:', error);
      // Clear any ongoing operations
      setLoading(false);
      setShowResults(false);
      setOperationResults([]);
      setDetailedHistory(null);
    }
  });

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
        setOperationSummary(result.summary);
        setDetailedHistory(result.detailedHistory);
        setShowResults(true);

        // Enhanced summary with category breakdown
        const { successful, failed, total, byCategory } = result.summary;

        // Get the most common failure category for better messaging
        const failureCategories = Object.keys(byCategory || {});
        const primaryFailureCategory = failureCategories.length > 0 ? failureCategories[0] : null;

        if (successful === total) {
          showNotification(
            'success',
            `🎉 All ${activeOperation === 'add' ? 'additions' : 'removals'} completed successfully!`,
            `${successful} ${successful === 1 ? 'member' : 'members'} ${activeOperation === 'add' ? 'added to' : 'removed from'} ${selectedGroups.length} ${selectedGroups.length === 1 ? 'group' : 'groups'}`
          );
        } else if (successful > 0) {
          const categoryInfo = primaryFailureCategory && byCategory[primaryFailureCategory]
            ? ` Most common issue: ${byCategory[primaryFailureCategory].description}`
            : '';
          showNotification(
            'warning',
            `⚠️ Operation partially completed`,
            `${successful} succeeded, ${failed} failed out of ${total} operations.${categoryInfo}`
          );
        } else {
          const categoryInfo = primaryFailureCategory && byCategory[primaryFailureCategory]
            ? ` Primary issue: ${byCategory[primaryFailureCategory].description}`
            : '';
          showNotification(
            'error',
            `❌ All operations failed`,
            `${failed} out of ${total} operations failed.${categoryInfo} Check detailed results below.`
          );
        }

        // Clear individual members list on success
        if (successful > 0) {
          setMembersList([]);
          setMemberPhone('');
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
        <div className={`fixed top-4 right-4 z-50 max-w-lg p-5 rounded-xl shadow-2xl border-2 transform transition-all duration-300 ${
          notification.type === 'success' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300 text-green-800' :
          notification.type === 'error' ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-300 text-red-800' :
          notification.type === 'warning' ? 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300 text-amber-800' :
          'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 text-blue-800'
        }`}>
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 p-1 rounded-lg ${
              notification.type === 'success' ? 'bg-green-200' :
              notification.type === 'error' ? 'bg-red-200' :
              notification.type === 'warning' ? 'bg-amber-200' :
              'bg-blue-200'
            }`}>
              {notification.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
              {notification.type === 'error' && <XCircle className="w-6 h-6" />}
              {notification.type === 'warning' && <AlertCircle className="w-6 h-6" />}
              {notification.type === 'info' && <AlertCircle className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-relaxed">{notification.message}</p>
              {notification.details && (
                <p className="mt-2 text-sm opacity-90 leading-relaxed">{notification.details}</p>
              )}
            </div>
            <button
              onClick={() => setNotification(null)}
              className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
                notification.type === 'success' ? 'text-green-600 hover:bg-green-200' :
                notification.type === 'error' ? 'text-red-600 hover:bg-red-200' :
                notification.type === 'warning' ? 'text-amber-600 hover:bg-amber-200' :
                'text-blue-600 hover:bg-blue-200'
              }`}
            >
              <X className="w-5 h-5" />
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

          {/* Enhanced Operation Results Display */}
          {showResults && detailedHistory && (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 rounded-lg p-2">
                      {activeOperation === 'add' ? (
                        <Plus className="w-6 h-6 text-white" />
                      ) : (
                        <Minus className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {activeOperation === 'add' ? 'Member Addition' : 'Member Removal'} Results
                      </h2>
                      <div className="text-blue-100 text-sm">
                        Operation completed at {new Date(detailedHistory.operationSummary.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowResults(false)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Enhanced Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-blue-700">
                          {detailedHistory.operationSummary.totalProcessed}
                        </div>
                        <div className="text-sm font-medium text-blue-600">Total Processed</div>
                      </div>
                      <div className="bg-blue-200 rounded-lg p-2">
                        <Users className="w-6 h-6 text-blue-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-green-700">
                          {detailedHistory.operationSummary.totalSuccessful}
                        </div>
                        <div className="text-sm font-medium text-green-600">Successful</div>
                      </div>
                      <div className="bg-green-200 rounded-lg p-2">
                        <CheckCircle2 className="w-6 h-6 text-green-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-red-700">
                          {detailedHistory.operationSummary.totalFailed}
                        </div>
                        <div className="text-sm font-medium text-red-600">Failed</div>
                      </div>
                      <div className="bg-red-200 rounded-lg p-2">
                        <XCircle className="w-6 h-6 text-red-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-purple-700">
                          {Math.round(detailedHistory.operationSummary.successRate)}%
                        </div>
                        <div className="text-sm font-medium text-purple-600">Success Rate</div>
                      </div>
                      <div className="bg-purple-200 rounded-lg p-2">
                        <ArrowRight className="w-6 h-6 text-purple-700" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Failure Analysis with Smart Categorization */}
                {Object.keys(detailedHistory.categoryBreakdown).length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center space-x-2 mb-6">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                      <h3 className="text-xl font-semibold text-gray-800">Issue Analysis & Solutions</h3>
                    </div>

                    <div className="space-y-6">
                      {Object.entries(detailedHistory.categoryBreakdown).map(([category, info]: [string, any]) => {
                        // Determine the color scheme based on category
                        const getColorScheme = (cat: string) => {
                          if (cat.includes('ALREADY_MEMBER')) return 'amber';
                          if (cat.includes('NOT_FOUND')) return 'red';
                          if (cat.includes('PERMISSION')) return 'orange';
                          if (cat.includes('INVALID')) return 'red';
                          return 'gray';
                        };

                        const colorScheme = getColorScheme(category);

                        return (
                          <div key={category} className={`border border-${colorScheme}-200 rounded-xl overflow-hidden shadow-sm`}>
                            {/* Category Header */}
                            <div className={`bg-gradient-to-r from-${colorScheme}-50 to-${colorScheme}-100 px-6 py-4 border-b border-${colorScheme}-200`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className={`bg-${colorScheme}-200 rounded-lg p-2`}>
                                    {category.includes('ALREADY_MEMBER') && <Users className="w-5 h-5 text-amber-700" />}
                                    {category.includes('NOT_FOUND') && <Search className="w-5 h-5 text-red-700" />}
                                    {category.includes('PERMISSION') && <AlertCircle className="w-5 h-5 text-orange-700" />}
                                    {!category.includes('ALREADY_MEMBER') && !category.includes('NOT_FOUND') && !category.includes('PERMISSION') &&
                                      <XCircle className="w-5 h-5 text-gray-700" />}
                                  </div>
                                  <div>
                                    <div className={`font-semibold text-${colorScheme}-800 text-lg`}>
                                      {info.description}
                                    </div>
                                    <div className={`text-${colorScheme}-600 text-sm flex items-center space-x-2`}>
                                      <span className={`bg-${colorScheme}-200 px-2 py-1 rounded-full text-xs font-medium`}>
                                        {info.count} {info.count === 1 ? 'contact' : 'contacts'}
                                      </span>
                                      <span>•</span>
                                      <span>Category: {category}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Solution & Details */}
                            <div className="p-6">
                              {/* Actionable Advice */}
                              <div className="mb-6">
                                <div className="flex items-center space-x-2 mb-3">
                                  <div className="bg-blue-100 rounded-lg p-1">
                                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <span className="text-sm font-semibold text-gray-700">Recommended Action</span>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <div className="text-sm text-blue-800 leading-relaxed">
                                    {info.actionableAdvice}
                                  </div>
                                </div>
                              </div>

                              {/* Affected Contacts */}
                              <div>
                                <div className="text-sm font-semibold text-gray-700 mb-3">
                                  Affected Contacts ({info.contacts.length})
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {info.contacts.map((contact: any, idx: number) => (
                                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-3">
                                            <div className="bg-gray-100 rounded-lg p-2">
                                              <User className="w-4 h-4 text-gray-600" />
                                            </div>
                                            <div>
                                              <div className="font-mono text-sm font-medium text-gray-900">
                                                {contact.contactId}
                                              </div>
                                              <div className="text-xs text-gray-500 truncate max-w-32">
                                                {contact.groupName}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-xs text-gray-400">
                                            {new Date(contact.timestamp).toLocaleTimeString()}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Enhanced Successful Operations */}
                {Object.keys(detailedHistory.groupBreakdown.successful).length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center space-x-2 mb-6">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      <h3 className="text-xl font-semibold text-gray-800">Successful Operations</h3>
                    </div>

                    <div className="space-y-4">
                      {Object.entries(detailedHistory.groupBreakdown.successful).map(([groupName, groupInfo]: [string, any]) => (
                        <div key={groupName} className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-green-100 px-6 py-4 border-b border-green-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="bg-green-200 rounded-lg p-2">
                                  <Users className="w-5 h-5 text-green-700" />
                                </div>
                                <div>
                                  <div className="font-semibold text-green-800 text-lg">{groupName}</div>
                                  <div className="text-green-600 text-sm">Group ID: {groupInfo.groupId}</div>
                                </div>
                              </div>
                              <div className="bg-green-200 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                                ✓ {groupInfo.count} {groupInfo.count === 1 ? 'member' : 'members'} {activeOperation === 'add' ? 'added' : 'removed'}
                              </div>
                            </div>
                          </div>

                          <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {groupInfo.contacts.map((contact: any, idx: number) => (
                                <div key={idx} className="bg-white border border-green-200 rounded-lg p-3 shadow-sm">
                                  <div className="flex items-center space-x-2">
                                    <div className="bg-green-100 rounded-lg p-1">
                                      <User className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div className="font-mono text-sm text-green-700 font-medium">
                                      {contact.contactId}
                                    </div>
                                  </div>
                                  <div className="text-xs text-green-600 mt-1">
                                    {new Date(contact.timestamp).toLocaleTimeString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enhanced Complete Contact Breakdown */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <div className="bg-gray-100 rounded-lg p-2">
                        <Users className="w-6 h-6 text-gray-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800">Complete Operation Log</h3>
                    </div>
                    <div className="text-sm text-gray-500">
                      {detailedHistory.resultsByContact.length} total operations
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Contact Number
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Target Group
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Result & Details
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Timestamp
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {detailedHistory.resultsByContact.map((result: any, index: number) => (
                            <tr key={index} className={`hover:bg-gray-50 transition-colors ${result.success ? 'border-l-4 border-green-400' : 'border-l-4 border-red-400'}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {result.success ? (
                                    <div className="bg-green-100 rounded-full p-1">
                                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </div>
                                  ) : (
                                    <div className="bg-red-100 rounded-full p-1">
                                      <XCircle className="w-5 h-5 text-red-600" />
                                    </div>
                                  )}
                                  <span className={`ml-2 text-xs font-medium px-2 py-1 rounded-full ${
                                    result.success
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {result.success ? 'Success' : 'Failed'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <div className="bg-gray-100 rounded-lg p-1">
                                    <User className="w-4 h-4 text-gray-600" />
                                  </div>
                                  <span className="text-sm font-mono font-medium text-gray-900">
                                    {result.contactId}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 font-medium">
                                  {result.groupName}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                  {result.groupId}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`text-sm font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                  {result.message}
                                </div>
                                {result.category && !result.success && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      {result.category}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(result.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkManagement;