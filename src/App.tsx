import { useState } from 'react';
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
import PartyMaster from './components/PartyMaster';
import SupplierMaster from './components/SupplierMaster';
import FuelManagement from './components/FuelManagement';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showLedgerDetail, setShowLedgerDetail] = useState<{
    name: string;
    type: 'party' | 'supplier' | 'general';
  } | null>(null);

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
      case 'party-master':
        return <PartyMaster />;
      case 'supplier-master':
        return <SupplierMaster />;
      case 'party-ledger':
        return <PartyLedger />;
      case 'supplier-ledger':
        return <SupplierLedger />;
      case 'banking':
        return <Banking />;
      case 'cashbook':
        return <Cashbook />;
      case 'fuel-management':
        return <FuelManagement />;
      case 'ledgers':
        return (
          <Ledgers
            onViewLedger={(name, type) => setShowLedgerDetail({ name, type })}
          />
        );
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
    </div>
  );
}

export default App;