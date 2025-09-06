import React, { useState } from 'react';
import { DataStoreProvider } from './lib/store';
import { AuthProvider, useAuth } from './lib/auth';
import { useApiSync } from './hooks/useApiSync';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LoadingSlip from './components/LoadingSlip';
import Memo from './components/Memo';
import Bills from './components/Bills';
import Banking from './components/Banking';
import Cashbook from './components/Cashbook';
import Ledgers from './components/Ledgers';
import POD from './components/POD';
import LedgerDetail from './components/LedgerDetail';
import PartyLedger from './components/PartyLedger';
import SupplierLedger from './components/SupplierLedger';
import GeneralLedger from './components/GeneralLedger';
import PartyCommissionLedger from './components/PartyCommissionLedger';
// import PartyMaster from './components/PartyMaster';
// import SupplierMaster from './components/SupplierMaster';
import FuelManagement from './components/FuelManagement';
import VehicleLedger from './components/VehicleLedger';
import VehicleOwnershipManager from './components/VehicleOwnershipManager';
import { SyncErrorHandler } from './components/SyncErrorHandler';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showLedgerDetail, setShowLedgerDetail] = useState<{
    name: string;
    type: 'party' | 'supplier' | 'general';
  } | null>(null);
  
  // Initialize API sync when user is authenticated
  useApiSync();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'loading-slip':
        return <LoadingSlip />;
      case 'memo':
        return <Memo />;
      case 'bills':
        return <Bills />;
      case 'paid-memo':
        return <Memo showOnlyFullyPaid />;
      case 'received-bills':
        return <Bills showOnlyFullyReceived />;
      case 'parties':
        return <div className="p-6 bg-white rounded-lg shadow"><h2 className="text-xl font-semibold">Parties</h2><p className="text-gray-600 mt-2">Party management component temporarily disabled due to missing form dependencies.</p></div>;
      case 'supplier-master':
        return <div className="p-6 bg-white rounded-lg shadow"><h2 className="text-xl font-semibold">Suppliers</h2><p className="text-gray-600 mt-2">Supplier management component temporarily disabled due to missing form dependencies.</p></div>;
      case 'party-ledger':
        return <PartyLedger />;
      case 'supplier-ledger':
        return <SupplierLedger />;
      case 'general-ledger':
        return <GeneralLedger />;
      case 'party-commission-ledger':
        return <PartyCommissionLedger />;
      case 'banking':
        return <Banking />;
      case 'cashbook':
        return <Cashbook />;
      case 'fuel-management':
        return <FuelManagement />;
      case 'vehicle-ledger':
        return <VehicleLedger />;
      case 'vehicle-ownership':
        return <VehicleOwnershipManager />;
      case 'ledgers':
        return <Ledgers onViewLedger={(name, type) => setShowLedgerDetail({ name, type })} key={Date.now()} />;
      case 'pod':
        return <POD />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderCurrentPage()}
      </Layout>
      
      {showLedgerDetail && (
        <LedgerDetail
          ledgerName={showLedgerDetail.name}
          ledgerType={showLedgerDetail.type}
          onClose={() => setShowLedgerDetail(null)}
        />
      )}
      
      <SyncErrorHandler />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <DataStoreProvider>
        <AppContent />
      </DataStoreProvider>
    </AuthProvider>
  );
}

export default App;