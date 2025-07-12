import React from 'react';
import {
  MessageCircle,
  Megaphone,
  Users,
  LogOut,
  Settings,
  Home,
  FileText
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  clientInfo?: {
    name: string;
    phone: string;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  onLogout, 
  clientInfo 
}) => {
  const menuItems = [
    { id: 'inbox', label: 'Inbox', icon: MessageCircle },
    { id: 'campaign', label: 'Campaign', icon: Megaphone },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'bulk', label: 'Bulk Management', icon: Users },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center mb-4">
          <div className="bg-green-500 rounded-full p-2 mr-3">
            <Home className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">WhatsApp Manager</h1>
        </div>
        
        {clientInfo && (
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-green-800">Connected</span>
            </div>
            <p className="text-xs text-green-600 mt-1">{clientInfo.name}</p>
            <p className="text-xs text-green-500">{clientInfo.phone}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;