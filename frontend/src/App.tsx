import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import QRScanner from './components/QRScanner';
import Sidebar from './components/Sidebar';
import Inbox from './components/pages/Inbox';
import Campaign from './components/pages/Campaign';
import Templates from './components/pages/Templates';
import CreateTemplate from './components/pages/CreateTemplate';
import BulkManagement from './components/pages/BulkManagement';
import { useWhatsApp } from './hooks/useWhatsApp';
import { useSessionManager } from './hooks/useSessionManager';
// Import session keep-alive service (it will auto-start)
import './services/sessionKeepAlive';

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
    logout,
    sendMessage,
    fetchContacts,
    fetchGroups
  } = useWhatsApp();

  const handleRefresh = () => {
    fetchContacts();
    fetchGroups();
  };

  // Global session management with notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    details?: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string, details?: string) => {
    setNotification({ type, message, details });
    setTimeout(() => setNotification(null), 5000);
  };

  // Initialize global session manager
  useSessionManager({
    showNotification: (type, message, details) => showNotification(type, message, details),
    onSessionExpired: (error) => {
      console.log('Global session expired handler:', error);
      // Perform any global cleanup here
      logout();
    }
  });

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
      {/* Global Notification */}
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
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Sidebar
        activeTab={getActiveTab()}
        onTabChange={handleTabChange}
        onLogout={logout}
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