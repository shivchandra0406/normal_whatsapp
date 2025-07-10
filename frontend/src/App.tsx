import React, { useState } from 'react';
import QRScanner from './components/QRScanner';
import Sidebar from './components/Sidebar';
import Inbox from './components/pages/Inbox';
import Campaign from './components/pages/Campaign';
import BulkManagement from './components/pages/BulkManagement';
import { useWhatsApp } from './hooks/useWhatsApp';

function App() {
  const [activeTab, setActiveTab] = useState('inbox');
  const {
    session,
    contacts,
    groups,
    loading,
    connect,
    disconnect,
    sendMessage,
    fetchContacts,
    fetchGroups
  } = useWhatsApp();

  const handleRefresh = () => {
    fetchContacts();
    fetchGroups();
  };

  if (!session.isConnected) {
    return <QRScanner onConnected={connect} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'inbox':
        return (
          <Inbox
            contacts={contacts}
            groups={groups}
            onSendMessage={sendMessage}
          />
        );
      case 'campaign':
        return <Campaign onSendMessage={sendMessage} />;
      case 'bulk':
        return (
          <BulkManagement
            contacts={contacts}
            groups={groups}
            onRefresh={handleRefresh}
          />
        );
      default:
        return <Inbox contacts={contacts} groups={groups} onSendMessage={sendMessage} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={disconnect}
        clientInfo={session.clientInfo}
      />
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;