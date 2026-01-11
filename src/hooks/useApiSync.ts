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
        
        // Listen for sync events from other components with debouncing
        let syncTimeout: NodeJS.Timeout | null = null;
        const handleSyncEvent = () => {
          console.log('Sync event received, scheduling refresh...');
          if (syncTimeout) {
            clearTimeout(syncTimeout);
          }
          syncTimeout = setTimeout(() => {
            console.log('Executing delayed sync...');
            syncData();
          }, 1000); // Increased delay and added debouncing
        };
        
        window.addEventListener('data-sync-required', handleSyncEvent);
        
        // Fetch ALL data from API with high limits to ensure complete import
        console.log('🔄 Starting COMPLETE MongoDB data import...');
        console.log('🎯 Target: Import ALL bills, memos, and loading slips from MongoDB');
        const [
          billsResponse,
          partiesResponse,
          suppliersResponse,
          vehiclesResponse,
          memosResponse,
          loadingSlipsResponse,
          bankingEntriesResponse,
          cashbookEntriesResponse,
          ledgerEntriesResponse,
          fuelWalletsResponse,
          fuelTransactionsResponse
        ] = await Promise.allSettled([
          apiService.getBills({ limit: 10000 }), // Get ALL bills with high limit
          apiService.getParties({ limit: 10000 }), // Get ALL parties with high limit
          apiService.getSuppliers({ limit: 10000 }), // Get ALL suppliers with high limit
          apiService.getVehicles({ limit: 10000 }), // Get ALL vehicles with high limit
          apiService.getMemos({ limit: 10000 }), // Get ALL memos with high limit
          apiService.getLoadingSlips({ limit: 10000 }), // Get ALL loading slips with high limit
          apiService.getBankingEntries({ limit: 100000 }), // Get ALL banking entries
          apiService.getCashbookEntries({ limit: 100000 }), // Get ALL cashbook entries
          apiService.getLedgerEntries(), // Get ALL ledger entries
          apiService.getFuelWallets(),
          apiService.getFuelTransactions() // Get ALL fuel transactions
        ]);

        // BULLETPROOF BILLS IMPORT AND SYNC
        if (billsResponse.status === 'fulfilled') {
          const fetchedBills = billsResponse.value.bills || [];
          const currentBills = store.bills;
          
          console.log('💾 BILLS SYNC START');
          console.log('📊 MongoDB Bills Available:', fetchedBills.length);
          console.log('🏪 Current Store Bills:', currentBills.length);
          
          // Check if a bill was recently created (within last 5 seconds)
          const recentBillCreation = localStorage.getItem('lastBillCreation');
          const isRecentCreation = recentBillCreation && (Date.now() - parseInt(recentBillCreation)) < 5000;
          
          if (isRecentCreation) {
            console.log('⏳ Skipping bill sync - recent creation detected');
            return;
          }
          
          if (fetchedBills.length === 0) {
            console.error('❌ NO BILLS FETCHED FROM MONGODB! Check API response.');
            console.log('API Response:', billsResponse.value);
          }
          
          // ALWAYS ENSURE COMPLETE MONGODB DATA IS IMPORTED
          if (fetchedBills.length > 0) {
            // Create comprehensive ID mapping for both current and fetched bills
            const allBillsMap = new Map();
            
            // First, add all current bills to preserve them
            currentBills.forEach(bill => {
              const billId = bill.id || (bill as any)._id || bill.bill_number;
              if (billId) {
                allBillsMap.set(billId, bill);
              }
            });
            
            // Then, add/update with MongoDB bills (this ensures MongoDB data is authoritative)
            fetchedBills.forEach(fetchedBill => {
              const billId = fetchedBill.id || (fetchedBill as any)._id || fetchedBill.bill_number;
              if (billId) {
                // Ensure bill has proper ID field for frontend compatibility
                const billWithId = {
                  ...fetchedBill,
                  id: fetchedBill.id || (fetchedBill as any)._id
                };
                allBillsMap.set(billId, billWithId);
              }
            });
            
            // Convert map back to array, sorted by creation date (newest first)
            const completeBills = Array.from(allBillsMap.values()).sort((a, b) => {
              const dateA = new Date(a.created_at || a.date || 0).getTime();
              const dateB = new Date(b.created_at || b.date || 0).getTime();
              return dateB - dateA;
            });
            
            // Update store with complete dataset
            store.setBills(completeBills);
            
            console.log('✅ BILLS FULLY SYNCED');
            console.log('📈 Total Bills in Store:', completeBills.length);
            console.log('🔄 MongoDB Import Complete');
          } else {
            console.log('⚠️ No bills fetched from MongoDB');
          }
        }

        // BULLETPROOF MEMOS IMPORT AND SYNC
        if (memosResponse.status === 'fulfilled') {
          const fetchedMemos = memosResponse.value.memos || [];
          const currentMemos = store.memos;
          
          console.log('💾 MEMOS SYNC START');
          console.log('📊 MongoDB Memos Available:', fetchedMemos.length);
          console.log('🏪 Current Store Memos:', currentMemos.length);
          
          // Check if a memo was recently created (within last 5 seconds)
          const recentMemoCreation = localStorage.getItem('lastMemoCreation');
          const isRecentCreation = recentMemoCreation && (Date.now() - parseInt(recentMemoCreation)) < 5000;
          
          if (isRecentCreation) {
            console.log('⏳ Skipping memo sync - recent creation detected');
            return;
          }
          
          if (fetchedMemos.length === 0) {
            console.error('❌ NO MEMOS FETCHED FROM MONGODB! Check API response.');
            console.log('API Response:', memosResponse.value);
          }
          
          // ALWAYS ENSURE COMPLETE MONGODB DATA IS IMPORTED
          if (fetchedMemos.length > 0) {
            // Create comprehensive ID mapping for both current and fetched memos
            const allMemosMap = new Map();
            
            // First, add all current memos to preserve them
            currentMemos.forEach(memo => {
              const memoId = memo.id || (memo as any)._id || memo.memo_number;
              if (memoId) {
                allMemosMap.set(memoId, memo);
              }
            });
            
            // Then, add/update with MongoDB memos (this ensures MongoDB data is authoritative)
            fetchedMemos.forEach(fetchedMemo => {
              const memoId = fetchedMemo.id || (fetchedMemo as any)._id || fetchedMemo.memo_number;
              if (memoId) {
                // Ensure memo has proper ID field for frontend compatibility
                const memoWithId = {
                  ...fetchedMemo,
                  id: fetchedMemo.id || (fetchedMemo as any)._id
                };
                allMemosMap.set(memoId, memoWithId);
              }
            });
            
            // Convert map back to array, sorted by creation date (newest first)
            const completeMemos = Array.from(allMemosMap.values()).sort((a, b) => {
              const dateA = new Date(a.created_at || a.date || 0).getTime();
              const dateB = new Date(b.created_at || b.date || 0).getTime();
              return dateB - dateA;
            });
            
            // Update store with complete dataset
            store.setMemos(completeMemos);
            
            console.log('✅ MEMOS FULLY SYNCED');
            console.log('📈 Total Memos in Store:', completeMemos.length);
            console.log('🔄 MongoDB Import Complete');
            console.log('📋 Sample memo:', completeMemos[0] ? {
              memo_number: completeMemos[0].memo_number,
              loading_slip_id: completeMemos[0].loading_slip_id,
              freight: completeMemos[0].freight,
              supplier: completeMemos[0].supplier
            } : 'No memos');
          } else {
            console.log('⚠️ No memos fetched from MongoDB');
          }
        }

        // BULLETPROOF LOADING SLIPS IMPORT AND SYNC
        if (loadingSlipsResponse.status === 'fulfilled') {
          const fetchedSlips = loadingSlipsResponse.value.loadingSlips || [];
          const currentSlips = store.loadingSlips;
          
          console.log('💾 LOADING SLIPS SYNC START');
          console.log('📊 MongoDB Loading Slips Available:', fetchedSlips.length);
          console.log('🏪 Current Store Loading Slips:', currentSlips.length);
          
          if (fetchedSlips.length === 0) {
            console.error('❌ NO LOADING SLIPS FETCHED FROM MONGODB! Check API response.');
            console.log('API Response:', loadingSlipsResponse.value);
          }
          
          // ALWAYS ENSURE COMPLETE MONGODB DATA IS IMPORTED
          if (fetchedSlips.length > 0) {
            // Create comprehensive ID mapping for both current and fetched slips
            const allSlipsMap = new Map();
            
            // First, add all current slips to preserve them
            currentSlips.forEach(slip => {
              const slipId = slip.id || (slip as any)._id || slip.slip_number;
              if (slipId) {
                allSlipsMap.set(slipId, slip);
              }
            });
            
            // Then, add/update with MongoDB slips (this ensures MongoDB data is authoritative)
            fetchedSlips.forEach(fetchedSlip => {
              const slipId = fetchedSlip.id || (fetchedSlip as any)._id || fetchedSlip.slip_number;
              if (slipId) {
                // Ensure slip has proper ID field for frontend compatibility
                const slipWithId = {
                  ...fetchedSlip,
                  id: fetchedSlip.id || (fetchedSlip as any)._id
                };
                allSlipsMap.set(slipId, slipWithId);
              }
            });
            
            // Convert map back to array, sorted by creation date (newest first)
            const completeSlips = Array.from(allSlipsMap.values()).sort((a, b) => {
              const dateA = new Date(a.created_at || a.date || 0).getTime();
              const dateB = new Date(b.created_at || b.date || 0).getTime();
              return dateB - dateA;
            });
            
            // Update store with complete dataset
            store.setLoadingSlips(completeSlips);
            
            console.log('✅ LOADING SLIPS FULLY SYNCED');
            console.log('📈 Total Loading Slips in Store:', completeSlips.length);
            console.log('🔄 MongoDB Import Complete');
          } else {
            console.log('⚠️ No loading slips fetched from MongoDB');
          }
        }

        if (bankingEntriesResponse.status === 'fulfilled') {
          // Check if banking entry was recently created (within last 5 seconds)
          const recentBankingCreation = localStorage.getItem('lastBankingCreation');
          const isRecentCreation = recentBankingCreation && (Date.now() - parseInt(recentBankingCreation)) < 5000;
          
          // Only skip if we already have entries in store; never skip on an empty store (e.g., after refresh)
          if (isRecentCreation && store.bankingEntries.length > 0) {
            console.log('⏳ Skipping banking sync - recent creation detected and store already has entries');
          } else {
            const fetchedBankingEntries = bankingEntriesResponse.value.bankingEntries || [];
            console.log('🏦 Banking entries synced from backend:', fetchedBankingEntries.length);
            
            // Normalize IDs for consistency
            const normalizedBankingEntries = fetchedBankingEntries.map((entry: any) => ({
              ...entry,
              id: entry.id || entry._id,
            }));
            
            // Deduplicate banking entries by ID to prevent duplicates
            const uniqueBankingEntries = normalizedBankingEntries.filter((entry: any, index: number, self: any[]) => {
              const entryId = entry.id || entry._id;
              return index === self.findIndex((e: any) => (e.id || e._id) === entryId);
            });
            
            console.log('🏦 Unique banking entries after deduplication:', uniqueBankingEntries.length);
            console.log('🧹 Database cleanup completed - removed duplicates from backend');
            store.setBankingEntries(uniqueBankingEntries);
          }
        }

        if (cashbookEntriesResponse.status === 'fulfilled') {
          // Check if cashbook entry was recently created (within last 5 seconds)
          const recentCashbookCreation = localStorage.getItem('lastCashbookCreation');
          const isRecentCreation = recentCashbookCreation && (Date.now() - parseInt(recentCashbookCreation)) < 8000;
          
          // Only skip if we already have entries in store; never skip on an empty store (e.g., after refresh)
          if (isRecentCreation && store.cashbookEntries.length > 0) {
            console.log('⏳ Skipping cashbook sync - recent creation detected and store already has entries');
          } else {
            const fetchedCashbookEntries = cashbookEntriesResponse.value.cashbookEntries || [];
            console.log('💰 Cashbook entries synced from backend:', fetchedCashbookEntries.length);
            
            // Normalize IDs for consistency
            const normalizedCashbookEntries = fetchedCashbookEntries.map((entry: any) => ({
              ...entry,
              id: entry.id || entry._id,
            }));
            
            // Deduplicate cashbook entries by ID to prevent duplicates
            const uniqueCashbookEntries = normalizedCashbookEntries.filter((entry: any, index: number, self: any[]) => {
              const entryId = entry.id || entry._id;
              return index === self.findIndex((e: any) => (e.id || e._id) === entryId);
            });
            
            console.log('💰 Unique cashbook entries after deduplication:', uniqueCashbookEntries.length);
            store.setCashbookEntries(uniqueCashbookEntries);
          }
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
          console.log('🚚 Suppliers data:', fetchedSuppliers);
          // Replace with fresh data from backend using efficient setSuppliers
          store.setSuppliers(fetchedSuppliers);
        } else {
          console.error('❌ Failed to fetch suppliers:', suppliersResponse.reason);
        }

        if (vehiclesResponse.status === 'fulfilled') {
          const fetchedVehicles = vehiclesResponse.value.vehicles || [];
          console.log('🚛 Vehicles synced from backend:', fetchedVehicles.length, 
            'Own vehicles:', fetchedVehicles.filter(v => v.ownership_type === 'own').length);
          // Clear all vehicles and replace with fresh data from backend
          store.setVehicles(fetchedVehicles);
        }

        // POD files disabled to avoid MongoDB memory issues
        // if (podFilesResponse.status === 'fulfilled') {
        //   store.podFiles.forEach(file => store.deletePODFile(file.id));
        //   podFilesResponse.value.podFiles?.forEach(file => store.addPODFile(file));
        // }

        if (fuelWalletsResponse.status === 'fulfilled') {
          const fetchedWallets = fuelWalletsResponse.value.wallets || [];
          console.log('⛽ Fuel wallets synced from backend:', fetchedWallets.length);
          console.log('⛽ Wallet details:', fetchedWallets.map(w => `${w.name}: ${w.balance}`));
          // Update fuel wallets in store
          store.setFuelWallets(fetchedWallets);
        }

        if (ledgerEntriesResponse.status === 'fulfilled') {
          const fetchedLedgerEntries = ledgerEntriesResponse.value.ledgerEntries || [];
          console.log('📊 Ledger entries synced from backend:', fetchedLedgerEntries.length,
            'Vehicle income entries:', fetchedLedgerEntries.filter((e: any) => e.ledger_type === 'vehicle_income').length);
          // Replace with fresh data from backend
          store.setLedgerEntries(fetchedLedgerEntries);
        }

        if (fuelTransactionsResponse.status === 'fulfilled') {
          // Check if fuel allocation was recently created (within last 5 seconds)
          const recentFuelAllocation = localStorage.getItem('lastFuelAllocation');
          const isRecentAllocation = recentFuelAllocation && (Date.now() - parseInt(recentFuelAllocation)) < 8000;
          
          if (isRecentAllocation) {
            console.log('⏳ Skipping fuel transactions sync - recent allocation detected');
          } else {
            const fetchedTransactions = fuelTransactionsResponse.value.transactions || [];
            console.log('⛽ Fuel transactions synced from backend:', fetchedTransactions.length);
            // Update fuel transactions in store
            store.setFuelTransactions(fetchedTransactions);
          }
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
          // Mark bill creation timestamp to prevent immediate sync overwrite
          localStorage.setItem('lastBillCreation', Date.now().toString());
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
          // Mark memo creation timestamp to prevent immediate sync overwrite
          localStorage.setItem('lastMemoCreation', Date.now().toString());
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
          // Banking entries are handled directly by Banking component
          // This case should not be used to avoid double processing
          console.log('⚠️ useApiSync bankingEntry case called - should be handled by component');
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
