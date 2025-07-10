import React, { useState } from 'react';
import { 
  Search, 
  Users, 
  User, 
  Send, 
  Plus, 
  Minus,
  MessageCircle,
  Phone
} from 'lucide-react';
import { Contact, Group } from '../../types';

interface InboxProps {
  contacts: Contact[];
  groups: Group[];
  onSendMessage: (chatId: string, message: string) => Promise<any>;
}

const Inbox: React.FC<InboxProps> = ({ contacts, groups, onSendMessage }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChat, setSelectedChat] = useState<Contact | Group | null>(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'groups' | 'contacts'>('groups');
  const [sending, setSending] = useState(false);
  const [sendMode, setSendMode] = useState<'individual' | 'group' | 'both' | null>(null);
  const [groupSearch, setGroupSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const filteredGroups = groups.filter(group =>
    (group.name || '').toLowerCase().includes(
      (sendMode === 'group' || sendMode === 'both' ? groupSearch : searchTerm).toLowerCase()
    )
  );

  const filteredContacts = contacts.filter(contact =>
    ((contact.name || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contact.number && contact.number.includes(searchTerm))
  );

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    if (!sendMode) {
      alert('Please select how you want to send: Individual, Group, or Both.');
      return;
    }
  // No group radio selection logic needed
    // Only allow sending to group if selectedChat is a group, or to individual if contact
    if (!selectedChat) return;
    if (sendMode === 'individual' && 'participants' in selectedChat) {
      alert('Selected chat is a group. Please select a contact or change send mode.');
      return;
    }
  // No redundant group mode check needed
    setSending(true);
    try {
      // For 'both', just send to the selected chat
      const result = await onSendMessage(selectedChat.id, message);
      if (result.success) {
        setMessage('');
        alert('Message sent successfully!');
      } else {
        alert('Failed to send message: ' + result.error);
      }
    } catch (error) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-screen flex">
      {/* Chat List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search contacts and groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-2 px-3 rounded-md transition-colors duration-200 ${
                activeTab === 'groups'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users className="w-4 h-4 mx-auto mb-1" />
              <span className="text-sm">Groups</span>
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex-1 py-2 px-3 rounded-md transition-colors duration-200 ${
                activeTab === 'contacts'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <User className="w-4 h-4 mx-auto mb-1" />
              <span className="text-sm">Contacts</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'groups' ? (
            <div className="p-2">
              {/* Show group search and selection only for group/both send mode */}
              {(sendMode === 'group' || sendMode === 'both') && (
                <>
                  <input
                    type="text"
                    placeholder="Search groups..."
                    value={groupSearch}
                    onChange={e => setGroupSearch(e.target.value)}
                    className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Group</label>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {filteredGroups.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p>No groups found</p>
                        </div>
                      ) : (
                        filteredGroups.map(group => (
                          <div
                            key={group.id}
                            onClick={() => {
                              setSelectedGroupId(group.id);
                              setSelectedChat(group);
                            }}
                            className={`p-2 rounded-lg cursor-pointer flex items-center transition-colors duration-200 ${
                              selectedGroupId === group.id ? 'bg-green-100 border-l-4 border-green-500' : 'hover:bg-gray-50'
                            }`}
                          >
                            <Users className="w-4 h-4 text-green-600 mr-2" />
                            <span className="flex-1">{group.name}</span>
                            <span className="text-xs text-gray-400">{group.participants.length} members</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
              {/* If not group/both mode, show normal group list for browsing */}
              {!(sendMode === 'group' || sendMode === 'both') && (
                filteredGroups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No groups found</p>
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      onClick={() => setSelectedChat(group)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 mb-2 ${
                        selectedChat?.id === group.id
                          ? 'bg-green-100 border-l-4 border-green-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="bg-green-500 rounded-full p-2 mr-3">
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-800">{group.name}</h3>
                          <p className="text-sm text-gray-500">{group.participants.length} members</p>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          ) : (
            <div className="p-2">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No contacts found</p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedChat(contact)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 mb-2 ${
                      selectedChat?.id === contact.id
                        ? 'bg-green-100 border-l-4 border-green-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="bg-blue-500 rounded-full p-2 mr-3">
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
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`${
                    'participants' in selectedChat ? 'bg-green-500' : 'bg-blue-500'
                  } rounded-full p-2 mr-3`}>
                    {'participants' in selectedChat ? (
                      <Users className="w-5 h-5 text-white" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800">{selectedChat.name}</h2>
                    <p className="text-sm text-gray-500">
                      {'participants' in selectedChat 
                        ? `${selectedChat.participants.length} members`
                        : (selectedChat as Contact).number
                      }
                    </p>
                  </div>
                </div>
                
                {'participants' in selectedChat && (
                  <div className="flex space-x-2">
                    <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                      <Plus className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Minus className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
              <div className="text-center text-gray-500 mb-4">
                <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                <p>Start a conversation with {selectedChat.name}</p>
              </div>
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="mb-2">
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
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    rows={3}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sending || !sendMode}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white p-3 rounded-lg transition-colors duration-200 flex items-center"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Select a chat</h3>
              <p>Choose a contact or group to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;