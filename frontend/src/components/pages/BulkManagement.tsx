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
  Loader2
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

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string, details?: string) => {
    setNotification({ type, message, details });
    setTimeout(() => setNotification(null), 5000); // Auto-hide after 5 seconds
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
    const numbers = parseContactNumbers(contactNumbers);

    if (numbers.length === 0) {
      showNotification('warning', 'Please enter at least one contact number');
      return;
    }

    if (selectedGroups.length === 0) {
      showNotification('warning', 'Please select at least one group from the search results');
      return;
    }

    // Validate contact numbers format
    const invalidNumbers = numbers.filter(num => {
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
        numbers,
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
          <h1 className="text-2xl font-bold text-gray-800">Bulk Management</h1>
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

      <div className="p-4">
        <div className="space-y-6">
          {/* Contact Numbers Input */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Contact Numbers</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter contact numbers (one per line or comma-separated)
                </label>
                <textarea
                  value={contactNumbers}
                  onChange={(e) => setContactNumbers(e.target.value)}
                  placeholder="Enter contact numbers here...&#10;Example:&#10;+1234567890&#10;9876543210&#10;+91-9876543210"
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="text-sm text-gray-500">
                {parseContactNumbers(contactNumbers).length} contact number(s) entered
              </div>
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
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => handleGroupToggle(group.id)}
                    className={`p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                      selectedGroups.includes(group.id) ? 'bg-blue-50 border-blue-300' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                        selectedGroups.includes(group.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedGroups.includes(group.id) && (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="bg-green-500 rounded-full p-1 mr-3">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">{group.name}</h3>
                        <p className="text-sm text-gray-500">{group.participants.length} members</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                {selectedGroups.length} group(s) selected
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-center">
              <button
                onClick={handleBulkOperation}
                disabled={
                  loading ||
                  parseContactNumbers(contactNumbers).length === 0 ||
                  selectedGroups.length === 0
                }
                className={`px-8 py-3 rounded-lg font-medium text-white transition-colors duration-200 flex items-center ${
                  activeOperation === 'add'
                    ? 'bg-green-500 hover:bg-green-600 disabled:bg-gray-400'
                    : 'bg-red-500 hover:bg-red-600 disabled:bg-gray-400'
                } disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    {activeOperation === 'add' ? 'Adding...' : 'Removing...'}
                  </>
                ) : (
                  <>
                    {activeOperation === 'add' ? (
                      <Plus className="w-5 h-5 mr-2" />
                    ) : (
                      <Minus className="w-5 h-5 mr-2" />
                    )}
                    {activeOperation === 'add' ? 'Add to Groups' : 'Remove from Groups'}
                  </>
                )}
              </button>
            </div>

            {/* Summary */}
            <div className="mt-4 text-center text-sm text-gray-600">
              <p>
                {parseContactNumbers(contactNumbers).length} contact number(s) • {selectedGroups.length} group(s) selected
              </p>
            </div>
          </div>

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