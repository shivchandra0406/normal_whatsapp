import React, { useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import QRScanner from './components/QRScanner';
import Sidebar from './components/Sidebar';
import Inbox from './components/pages/Inbox';
import Campaign from './components/pages/Campaign';
import Templates from './components/pages/Templates';
import CreateTemplate from './components/pages/CreateTemplate';
import BulkManagement from './components/pages/BulkManagement';
import { useWhatsApp } from './hooks/useWhatsApp';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
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

  // Get active tab from current route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/campaign')) return 'campaign';
    if (path.startsWith('/templates')) return 'templates';
    if (path.startsWith('/bulk')) return 'bulk';
    return 'inbox';
  };

  const handleTabChange = (tab: string) => {
    switch (tab) {
      case 'inbox':
        navigate('/');
        break;
      case 'campaign':
        navigate('/campaign');
        break;
      case 'templates':
        navigate('/templates');
        break;
      case 'bulk':
        navigate('/bulk');
        break;
      default:
        navigate('/');
    }
  };

  if (!session.isConnected) {
    return <QRScanner onConnected={connect} />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        activeTab={getActiveTab()}
        onTabChange={handleTabChange}
        onLogout={disconnect}
        clientInfo={session.clientInfo}
      />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route
            path="/"
            element={
              <Inbox
                contacts={contacts}
                groups={groups}
                onSendMessage={sendMessage}
              />
            }
          />
          <Route
            path="/campaign"
            element={<Campaign onSendMessage={sendMessage} />}
          />
          <Route
            path="/templates"
            element={<Templates />}
          />
          <Route
            path="/templates/create"
            element={<CreateTemplate />}
          />
          <Route
            path="/templates/edit/:id"
            element={<CreateTemplate />}
          />
          <Route
            path="/bulk"
            element={
              <BulkManagement
                contacts={contacts}
                groups={groups}
                onRefresh={handleRefresh}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;