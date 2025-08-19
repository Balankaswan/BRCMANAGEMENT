import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LoadingSlip from './components/LoadingSlip';
import Memo from './components/Memo';
import Bills from './components/Bills';
import Banking from './components/Banking';
import Ledgers from './components/Ledgers';
import POD from './components/POD';
import Party from './components/Party';
import Supplier from './components/Supplier';
import LedgerDetail from './components/LedgerDetail';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showLedgerDetail, setShowLedgerDetail] = useState<{
    name: string;
    type: 'party' | 'supplier';
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
      case 'party':
        return <Party />;
      case 'supplier':
        return <Supplier />;
      case 'banking':
        return <Banking />;
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