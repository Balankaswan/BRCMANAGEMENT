import { useEffect, useRef, useState } from 'react';
import { apiService } from '../lib/api';
import { useDataStore } from '../lib/store';

export const useApiSync = () => {
  const store = useDataStore();
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const syncData = async () => {
      try {
        // Only sync if user is authenticated
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        console.log('Starting comprehensive API sync...');
        
        // Listen for sync events from other components
        const handleSyncEvent = () => {
          console.log('Sync event received, refreshing data...');
          setTimeout(() => syncData(), 500);
        };
        
        window.addEventListener('data-sync-required', handleSyncEvent);
        
        // Fetch all data from API and update local store
        const [
          billsResponse,
          partiesResponse,
          suppliersResponse,
          vehiclesResponse,
          memosResponse,
          loadingSlipsResponse,
          bankingResponse,
          ledgerResponse,
          podFilesResponse,
          fuelWalletsResponse,
          fuelTransactionsResponse
        ] = await Promise.allSettled([
          apiService.getBills(),
          apiService.getParties(),
          apiService.getSuppliers(),
          apiService.getVehicles(),
          apiService.getMemos(),
          apiService.getLoadingSlips(),
          apiService.getBankingEntries(),
          apiService.getLedgerEntries(),
          apiService.getPODFiles(),
          apiService.getFuelWallets(),
          apiService.getFuelTransactions()
        ]);

        // Update store with fetched data - improved sync accuracy
        if (billsResponse.status === 'fulfilled') {
          const fetchedBills = billsResponse.value.bills || [];
          // Clear and replace with fresh data
          store.setBills(fetchedBills);
          console.log('Bills synced:', fetchedBills.length);
        }

        if (memosResponse.status === 'fulfilled') {
          const fetchedMemos = memosResponse.value.memos || [];
          // Clear and replace with fresh data
          store.setMemos(fetchedMemos);
          console.log('📋 Memos synced:', fetchedMemos.length);
          console.log('📋 Sample memo:', fetchedMemos[0] ? {
            memo_number: fetchedMemos[0].memo_number,
            loading_slip_id: fetchedMemos[0].loading_slip_id,
            freight: fetchedMemos[0].freight,
            supplier: fetchedMemos[0].supplier
          } : 'No memos');
        }

        if (loadingSlipsResponse.status === 'fulfilled') {
          const fetchedSlips = loadingSlipsResponse.value.loadingSlips || [];
          // Clear and replace with fresh data
          store.setLoadingSlips(fetchedSlips);
          console.log('🚛 Loading slips synced:', fetchedSlips.length);
          console.log('🚛 Sample loading slip:', fetchedSlips[0] ? {
            id: fetchedSlips[0].id,
            _id: (fetchedSlips[0] as any)._id,
            vehicle_no: fetchedSlips[0].vehicle_no
          } : 'No loading slips');
        }

        if (bankingResponse.status === 'fulfilled') {
          store.setBankingEntries(bankingResponse.value.bankingEntries || []);
        }

        if (partiesResponse.status === 'fulfilled') {
          const fetchedParties = partiesResponse.value.parties || [];
          console.log('🏢 Parties synced from backend:', fetchedParties.length);
          // Replace with fresh data from backend
          store.parties.forEach(party => store.deleteParty(party.id));
          fetchedParties.forEach(party => store.addParty(party));
        }

        if (suppliersResponse.status === 'fulfilled') {
          const fetchedSuppliers = suppliersResponse.value.suppliers || [];
          console.log('🚚 Suppliers synced from backend:', fetchedSuppliers.length);
          // Replace with fresh data from backend
          store.suppliers.forEach(supplier => store.deleteSupplier(supplier.id));
          fetchedSuppliers.forEach(supplier => store.addSupplier(supplier));
        }

        if (vehiclesResponse.status === 'fulfilled') {
          const fetchedVehicles = vehiclesResponse.value.vehicles || [];
          console.log('🚛 Vehicles synced from backend:', fetchedVehicles.length, 
            'Own vehicles:', fetchedVehicles.filter(v => v.ownership_type === 'own').length);
          // Clear all vehicles and replace with fresh data from backend
          store.setVehicles(fetchedVehicles);
        }

        if (podFilesResponse.status === 'fulfilled') {
          store.podFiles.forEach(file => store.deletePODFile(file.id));
          podFilesResponse.value.podFiles?.forEach(file => store.addPODFile(file));
        }

        if (fuelWalletsResponse.status === 'fulfilled') {
          const fetchedWallets = fuelWalletsResponse.value.wallets || [];
          console.log('⛽ Fuel wallets synced from backend:', fetchedWallets.length);
          console.log('⛽ Wallet details:', fetchedWallets.map(w => `${w.name}: ${w.balance}`));
          // Update fuel wallets in store
          store.setFuelWallets(fetchedWallets);
        }

        if (ledgerResponse.status === 'fulfilled') {
          const fetchedLedgerEntries = ledgerResponse.value.ledgerEntries || [];
          console.log('📊 Ledger entries synced from backend:', fetchedLedgerEntries.length,
            'Vehicle income entries:', fetchedLedgerEntries.filter(e => e.ledger_type === 'vehicle_income').length);
          // Replace with fresh data from backend
          store.setLedgerEntries(fetchedLedgerEntries);
        }

        if (fuelTransactionsResponse.status === 'fulfilled') {
          const fetchedTransactions = fuelTransactionsResponse.value.transactions || [];
          console.log('⛽ Fuel transactions synced from backend:', fetchedTransactions.length);
          // Update fuel transactions in store
          store.setFuelTransactions(fetchedTransactions);
        }

        console.log('Complete data synchronization finished - all modules synced including ledger entries');
      } catch (error) {
        console.error('Failed to sync data from API:', error);
      }
    };

    // Real-time sync connection
    const connectToRealTimeSync = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const baseUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:5001';
      
      const eventSource = new EventSource(`${baseUrl}/api/sync/events`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ Real-time sync connected');
        setIsRealTimeConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const syncEvent = JSON.parse(event.data);
          
          if (syncEvent.type === 'data_change') {
            console.log(`📡 Real-time change detected in ${syncEvent.collection}`);
            // Trigger data sync when changes are detected
            setTimeout(() => syncData(), 500);
          }
        } catch (error) {
          console.error('Error parsing sync event:', error);
        }
      };

      eventSource.onerror = () => {
        console.error('❌ Real-time sync error');
        setIsRealTimeConnected(false);
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connectToRealTimeSync();
          }
        }, 5000);
      };
    };

    syncData();
    connectToRealTimeSync();
    
    // Cleanup event listener and EventSource
    return () => {
      window.removeEventListener('data-sync-required', () => {});
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Return functions to sync data after mutations
  const syncAfterCreate = async (type: string, data: any) => {
    try {
      switch (type) {
        case 'bill':
          const billResponse = await apiService.createBill(data);
          store.addBill(billResponse.bill);
          // Trigger sync event for other components
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'memo':
          console.log('syncAfterCreate memo data received:', data);
          if (!data.loading_slip_id) {
            console.error('ERROR: loading_slip_id is missing from memo data!');
            throw new Error('loading_slip_id is required for memo creation');
          }
          const memoResponse = await apiService.createMemo(data);
          store.addMemo(memoResponse.memo);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'loadingSlip':
          const slipResponse = await apiService.createLoadingSlip(data);
          store.addLoadingSlip(slipResponse.loadingSlip);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'party':
          const partyResponse = await apiService.createParty(data);
          store.addParty(partyResponse.party);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'supplier':
          const supplierResponse = await apiService.createSupplier(data);
          store.addSupplier(supplierResponse.supplier);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'vehicle':
          const vehicleResponse = await apiService.createVehicle(data);
          store.addVehicle(vehicleResponse.vehicle);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'bankingEntry':
          const bankingResponse = await apiService.createBankingEntry(data);
          store.addBankingEntry(bankingResponse.bankingEntry);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        default:
          console.warn('Unknown sync type:', type);
      }
    } catch (error) {
      console.error(`Failed to create ${type}:`, error);
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      window.dispatchEvent(new CustomEvent('sync-error', { 
        detail: { type: 'create', entity: type, error: errorMessage } 
      }));
      throw error;
    }
  };

  const syncAfterUpdate = async (type: string, id: string, data: any) => {
    try {
      switch (type) {
        case 'bill':
          const billResponse = await apiService.updateBill(id, data);
          store.updateBill(billResponse.bill);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'memo':
          const memoResponse = await apiService.updateMemo(id, data);
          store.updateMemo(memoResponse.memo);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'loadingSlip':
          const slipResponse = await apiService.updateLoadingSlip(id, data);
          store.updateLoadingSlip(slipResponse.loadingSlip);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'party':
          const partyResponse = await apiService.updateParty(id, data);
          store.updateParty(partyResponse.party);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'supplier':
          const supplierResponse = await apiService.updateSupplier(id, data);
          store.updateSupplier(supplierResponse.supplier);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'vehicle':
          const vehicleResponse = await apiService.updateVehicle(id, data);
          store.updateVehicle(vehicleResponse.vehicle);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'bankingEntry':
          const bankingResponse = await apiService.updateBankingEntry(id, data);
          store.updateBankingEntry(id, bankingResponse.bankingEntry);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        default:
          console.warn('Unknown sync type:', type);
      }
    } catch (error) {
      console.error(`Failed to update ${type}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      window.dispatchEvent(new CustomEvent('sync-error', { 
        detail: { type: 'update', entity: type, error: errorMessage } 
      }));
      throw error;
    }
  };

  const syncAfterDelete = async (type: string, id: string) => {
    try {
      switch (type) {
        case 'bill':
          await apiService.deleteBill(id);
          store.deleteBill(id);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'memo':
          await apiService.deleteMemo(id);
          store.deleteMemo(id);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'loadingSlip':
          await apiService.deleteLoadingSlip(id);
          store.deleteLoadingSlip(id);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'party':
          await apiService.deleteParty(id);
          store.deleteParty(id);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'supplier':
          await apiService.deleteSupplier(id);
          store.deleteSupplier(id);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'vehicle':
          await apiService.deleteVehicle(id);
          store.deleteVehicle(id);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'bankingEntry':
          await apiService.deleteBankingEntry(id);
          store.deleteBankingEntry(id);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        default:
          console.warn('Unknown sync type:', type);
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      window.dispatchEvent(new CustomEvent('sync-error', { 
        detail: { type: 'delete', entity: type, error: errorMessage } 
      }));
      throw error;
    }
  };

  // Add error recovery function
  const retrySync = async () => {
    try {
      console.log('Retrying data synchronization...');
      window.dispatchEvent(new CustomEvent('data-sync-required'));
    } catch (error) {
      console.error('Failed to retry sync:', error);
    }
  };

  return {
    syncAfterCreate,
    syncAfterUpdate,
    syncAfterDelete,
    retrySync,
    isRealTimeConnected
  };
};
