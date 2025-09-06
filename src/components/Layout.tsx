import React from 'react';
import { Truck, FileText, Receipt, CreditCard, Archive, Fuel } from 'lucide-react';
import { COMPANY_LOGO_BASE64 } from '../assets/logo';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Truck },
    { id: 'loading-slip', label: 'Loading Slip', icon: FileText },
    { id: 'memo', label: 'Memo', icon: Receipt },
    { id: 'bills', label: 'Bills', icon: Receipt },
    { id: 'paid-memo', label: 'Paid Memo', icon: Receipt },
    { id: 'received-bills', label: 'Received Bills', icon: Receipt },
    { id: 'banking', label: 'Banking', icon: CreditCard },
    { id: 'cashbook', label: 'Cashbook', icon: CreditCard },
    { id: 'party-ledger', label: 'Party Ledgers', icon: FileText },
    { id: 'supplier-ledger', label: 'Supplier Ledgers', icon: FileText },
    { id: 'general-ledger', label: 'General Ledgers', icon: FileText },
    { id: 'party-commission-ledger', label: 'Party Commission', icon: CreditCard },
    { id: 'fuel-management', label: 'Fuel Management', icon: Fuel },
    { id: 'vehicle-ledger', label: 'Vehicle Ledger', icon: Truck },
    { id: 'vehicle-ownership', label: 'Vehicle Ownership', icon: Truck },
    { id: 'pod', label: 'POD', icon: Archive },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src={COMPANY_LOGO_BASE64} 
                alt="BRC Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback to truck icon if logo fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center hidden">
                <Truck className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">BHAVISHYA ROAD</h1>
              <p className="text-sm text-gray-600">CARRIERS</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Bhavishya Road Carriers - Logistics Management
            </h2>
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>LAN Mode - Real-time Sync Active</span>
            </div>
          </div>
        </header>
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;