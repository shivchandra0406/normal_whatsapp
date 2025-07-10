import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Minus, 
  Search, 
  CheckCircle2, 
  XCircle,
  ArrowRight,
  User
} from 'lucide-react';
import { Contact, Group } from '../../types';

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
  const [activeTab, setActiveTab] = useState<'add-to-groups' | 'remove-from-groups' | 'add-to-multiple'>('add-to-groups');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredContacts = contacts.filter(contact =>
    ((contact.name || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contact.number && contact.number.includes(searchTerm))
  );

  const filteredGroups = groups.filter(group =>
    (group.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleBulkAction = async (action: 'add' | 'remove') => {
    if (selectedContacts.length === 0 || selectedGroups.length === 0) {
      alert('Please select contacts and groups');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/bulk/manage-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          contacts: selectedContacts,
          groups: selectedGroups,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully ${action === 'add' ? 'added' : 'removed'} members!`);
        setSelectedContacts([]);
        setSelectedGroups([]);
        onRefresh();
      } else {
        alert(`Failed to ${action} members: ` + data.error);
      }
    } catch (error) {
      alert(`Failed to ${action} members`);
    } finally {
      setLoading(false);
    }
  };

  const selectAllContacts = () => {
    setSelectedContacts(
      selectedContacts.length === filteredContacts.length
        ? []
        : filteredContacts.map(c => c.id)
    );
  };

  const selectAllGroups = () => {
    setSelectedGroups(
      selectedGroups.length === filteredGroups.length
        ? []
        : filteredGroups.map(g => g.id)
    );
  };

  return (
    <div className="h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Bulk Management</h1>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('add-to-groups')}
              className={`py-2 px-4 rounded-md transition-colors duration-200 text-sm ${
                activeTab === 'add-to-groups'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Add to Groups
            </button>
            <button
              onClick={() => setActiveTab('remove-from-groups')}
              className={`py-2 px-4 rounded-md transition-colors duration-200 text-sm ${
                activeTab === 'remove-from-groups'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Remove from Groups
            </button>
            <button
              onClick={() => setActiveTab('add-to-multiple')}
              className={`py-2 px-4 rounded-md transition-colors duration-200 text-sm ${
                activeTab === 'add-to-multiple'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Add to Multiple
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contacts Selection */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Select Contacts ({selectedContacts.length})
                  </h2>
                  <button
                    onClick={selectAllContacts}
                    className="text-sm text-green-600 hover:text-green-700"
                  >
                    {selectedContacts.length === filteredContacts.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No contacts found</p>
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => handleContactToggle(contact.id)}
                      className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                        selectedContacts.includes(contact.id) ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                          selectedContacts.includes(contact.id)
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedContacts.includes(contact.id) && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="bg-blue-500 rounded-full p-1 mr-3">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-800">{contact.name}</h3>
                          <p className="text-sm text-gray-500">{contact.number}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="bg-white rounded-full p-4 shadow-sm">
                <ArrowRight className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            {/* Groups Selection */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Select Groups ({selectedGroups.length})
                  </h2>
                  <button
                    onClick={selectAllGroups}
                    className="text-sm text-green-600 hover:text-green-700"
                  >
                    {selectedGroups.length === filteredGroups.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {filteredGroups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No groups found</p>
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      onClick={() => handleGroupToggle(group.id)}
                      className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                        selectedGroups.includes(group.id) ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                          selectedGroups.includes(group.id)
                            ? 'bg-green-500 border-green-500'
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
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-center space-x-4">
            {activeTab === 'add-to-groups' && (
              <button
                onClick={() => handleBulkAction('add')}
                disabled={loading || selectedContacts.length === 0 || selectedGroups.length === 0}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Add to Groups
                  </>
                )}
              </button>
            )}

            {activeTab === 'remove-from-groups' && (
              <button
                onClick={() => handleBulkAction('remove')}
                disabled={loading || selectedContacts.length === 0 || selectedGroups.length === 0}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Removing...
                  </>
                ) : (
                  <>
                    <Minus className="w-5 h-5 mr-2" />
                    Remove from Groups
                  </>
                )}
              </button>
            )}

            {activeTab === 'add-to-multiple' && (
              <button
                onClick={() => handleBulkAction('add')}
                disabled={loading || selectedContacts.length === 0 || selectedGroups.length === 0}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Add to Multiple Groups
                  </>
                )}
              </button>
            )}
          </div>

          {/* Summary */}
          <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-medium text-gray-800 mb-2">Action Summary</h3>
            <div className="text-sm text-gray-600">
              <p>
                Selected Contacts: <span className="font-medium">{selectedContacts.length}</span>
              </p>
              <p>
                Selected Groups: <span className="font-medium">{selectedGroups.length}</span>
              </p>
              <p>
                Action: <span className="font-medium capitalize">
                  {activeTab === 'add-to-groups' ? 'Add contacts to groups' :
                   activeTab === 'remove-from-groups' ? 'Remove contacts from groups' :
                   'Add contacts to multiple groups'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkManagement;