import { useEffect, useRef, useState } from 'react';
import { apiService } from '../lib/api';
import { useDataStore } from '../lib/store';

export const useApiSync = () => {
  const store = useDataStore();
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncDataRef = useRef<any>(null); // Store syncData function reference

  useEffect(() => {
    const syncData = async () => {
      try {
        // Only sync if user is authenticated
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        // Define handleSyncEvent here so we can reference it
        const handleSyncEvent = () => {
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }
          syncTimeoutRef.current = setTimeout(() => {
            if (syncDataRef.current) {
              syncDataRef.current();
            }
          }, 1000);
        };

        // Store reference to current handleSyncEvent so we can remove it later
        (window as any).__cashbookSyncHandler = handleSyncEvent;

        // Add listener for sync events from other components
        window.addEventListener('data-sync-required', handleSyncEvent);

        // Fetch ALL data from API with high limits to ensure complete import
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
          apiService.getBills({ limit: 10000 }),
          apiService.getParties({ limit: 10000 }),
          apiService.getSuppliers({ limit: 10000 }),
          apiService.getVehicles({ limit: 10000 }),
          apiService.getMemos({ limit: 10000 }),
          apiService.getLoadingSlips({ limit: 10000 }),
          apiService.getBankingEntries({ limit: 1000000 }),
          apiService.getCashbookEntries({ limit: 1000000 }),
          apiService.getLedgerEntries(),
          apiService.getFuelWallets(),
          apiService.getFuelTransactions()
        ]);

        // BULLETPROOF BILLS IMPORT AND SYNC
        if (billsResponse.status === 'fulfilled') {
          const fetchedBills = billsResponse.value.bills || [];
          const currentBills = store.bills;

          // Check if a bill was recently created (within last 5 seconds)
          const recentBillCreation = localStorage.getItem('lastBillCreation');
          const isRecentCreation = recentBillCreation && (Date.now() - parseInt(recentBillCreation)) < 5000;

          if (isRecentCreation) return;

          // ALWAYS ENSURE COMPLETE MONGODB DATA IS IMPORTED
          if (fetchedBills.length > 0) {
            const allBillsMap = new Map();

            currentBills.forEach(bill => {
              const billId = bill.id || (bill as any)._id || bill.bill_number;
              if (billId) allBillsMap.set(billId, bill);
            });

            fetchedBills.forEach(fetchedBill => {
              const billId = fetchedBill.id || (fetchedBill as any)._id || fetchedBill.bill_number;
              if (billId) {
                const billWithId = {
                  ...fetchedBill,
                  id: fetchedBill.id || (fetchedBill as any)._id
                };
                allBillsMap.set(billId, billWithId);
              }
            });

            const completeBills = Array.from(allBillsMap.values()).sort((a, b) => {
              const dateA = new Date(a.created_at || a.date || 0).getTime();
              const dateB = new Date(b.created_at || b.date || 0).getTime();
              return dateB - dateA;
            });

            store.setBills(completeBills);
          }
        }

        // BULLETPROOF MEMOS IMPORT AND SYNC
        if (memosResponse.status === 'fulfilled') {
          const fetchedMemos = memosResponse.value.memos || [];
          const currentMemos = store.memos;

          // Check if a memo was recently created (within last 5 seconds)
          const recentMemoCreation = localStorage.getItem('lastMemoCreation');
          const isRecentCreation = recentMemoCreation && (Date.now() - parseInt(recentMemoCreation)) < 5000;

          if (isRecentCreation) return;

          if (fetchedMemos.length > 0) {
            const allMemosMap = new Map();

            currentMemos.forEach(memo => {
              const memoId = memo.id || (memo as any)._id || memo.memo_number;
              if (memoId) allMemosMap.set(memoId, memo);
            });

            fetchedMemos.forEach(fetchedMemo => {
              const memoId = fetchedMemo.id || (fetchedMemo as any)._id || fetchedMemo.memo_number;
              if (memoId) {
                const memoWithId = {
                  ...fetchedMemo,
                  id: fetchedMemo.id || (fetchedMemo as any)._id
                };
                allMemosMap.set(memoId, memoWithId);
              }
            });

            const completeMemos = Array.from(allMemosMap.values()).sort((a, b) => {
              const dateA = new Date(a.created_at || a.date || 0).getTime();
              const dateB = new Date(b.created_at || b.date || 0).getTime();
              return dateB - dateA;
            });

            store.setMemos(completeMemos);
          }
        }

        // BULLETPROOF LOADING SLIPS IMPORT AND SYNC
        if (loadingSlipsResponse.status === 'fulfilled') {
          const fetchedSlips = loadingSlipsResponse.value.loadingSlips || [];
          const currentSlips = store.loadingSlips;

          // Check if a loading slip was recently created (within last 5 seconds)
          const recentSlipCreation = localStorage.getItem('lastLoadingSlipCreation');
          const isRecentSlipCreation = recentSlipCreation && (Date.now() - parseInt(recentSlipCreation)) < 5000;

          if (!(isRecentSlipCreation && currentSlips.length > 0)) {
            if (fetchedSlips.length > 0) {
              const allSlipsMap = new Map();

              currentSlips.forEach(slip => {
                const slipId = slip.id || (slip as any)._id || slip.slip_number;
                if (slipId) allSlipsMap.set(slipId, slip);
              });

              fetchedSlips.forEach(fetchedSlip => {
                const slipId = fetchedSlip.id || (fetchedSlip as any)._id || fetchedSlip.slip_number;
                if (slipId) {
                  const slipWithId = {
                    ...fetchedSlip,
                    id: fetchedSlip.id || (fetchedSlip as any)._id
                  };
                  allSlipsMap.set(slipId, slipWithId);
                }
              });

              const completeSlips = Array.from(allSlipsMap.values()).sort((a, b) => {
                const dateA = new Date(a.created_at || a.date || 0).getTime();
                const dateB = new Date(b.created_at || b.date || 0).getTime();
                return dateB - dateA;
              });

              store.setLoadingSlips(completeSlips);
            }
          }
        }

        if (bankingEntriesResponse.status === 'fulfilled') {
          // Check if banking entry was recently created (within last 5 seconds)
          const recentBankingCreation = localStorage.getItem('lastBankingCreation');
          const isRecentCreation = recentBankingCreation && (Date.now() - parseInt(recentBankingCreation)) < 5000;

          if (!(isRecentCreation && store.bankingEntries.length > 0)) {
            const fetchedBankingEntries = bankingEntriesResponse.value.bankingEntries || [];

            const normalizedBankingEntries = fetchedBankingEntries.map((entry: any) => ({
              ...entry,
              id: entry.id || entry._id,
            }));

            const uniqueBankingEntries = normalizedBankingEntries.filter((entry: any, index: number, self: any[]) => {
              const entryId = entry.id || entry._id;
              return index === self.findIndex((e: any) => (e.id || e._id) === entryId);
            });

            const mergedMap = new Map<string, any>();

            // CRITICAL: Preserve ALL store entries first - never lose data!
            store.bankingEntries.forEach((entry: any) => {
              const entryId = entry.id || entry._id;
              if (entryId) mergedMap.set(entryId, entry);
            });

            // Then update with backend entries - backend is authoritative for updated data
            uniqueBankingEntries.forEach((entry: any) => {
              const entryId = entry.id || entry._id;
              if (entryId) {
                const existingEntry = mergedMap.get(entryId);
                if (!existingEntry || (entry.updated_at && existingEntry.updated_at && new Date(entry.updated_at) > new Date(existingEntry.updated_at))) {
                  mergedMap.set(entryId, entry);
                }
              }
            });

            const mergedBanking = Array.from(mergedMap.values());

            if (mergedBanking.length > 0 || store.bankingEntries.length === 0) {
              store.setBankingEntries(mergedBanking);
            }
          }
        }

        if (cashbookEntriesResponse.status === 'fulfilled') {
          // Check if cashbook entry was recently created (within last 8 seconds)
          const recentCashbookCreation = localStorage.getItem('lastCashbookCreation');
          const isRecentCreation = recentCashbookCreation && (Date.now() - parseInt(recentCashbookCreation)) < 8000;

          if (!(isRecentCreation && store.cashbookEntries.length > 0)) {
            const fetchedCashbookEntries = cashbookEntriesResponse.value.cashbookEntries || [];

            const normalizedCashbookEntries = fetchedCashbookEntries.map((entry: any) => ({
              ...entry,
              id: entry.id || entry._id,
            }));

            const uniqueCashbookEntries = normalizedCashbookEntries.filter((entry: any, index: number, self: any[]) => {
              const entryId = entry.id || entry._id;
              return index === self.findIndex((e: any) => (e.id || e._id) === entryId);
            });

            const mergedCashMap = new Map<string, any>();

            // CRITICAL: Preserve ALL store entries first - never lose data!
            store.cashbookEntries.forEach((entry: any) => {
              const entryId = entry.id || entry._id;
              if (entryId) mergedCashMap.set(entryId, entry);
            });

            uniqueCashbookEntries.forEach((entry: any) => {
              const entryId = entry.id || entry._id;
              if (entryId) {
                const existingEntry = mergedCashMap.get(entryId);
                if (!existingEntry || (entry.updated_at && existingEntry.updated_at && new Date(entry.updated_at) > new Date(existingEntry.updated_at))) {
                  mergedCashMap.set(entryId, entry);
                }
              }
            });

            const mergedCashbook = Array.from(mergedCashMap.values());

            if (mergedCashbook.length > 0 || store.cashbookEntries.length === 0) {
              store.setCashbookEntries(mergedCashbook);
            }
          }
        }

        if (partiesResponse.status === 'fulfilled') {
          const fetchedParties = partiesResponse.value.parties || [];
          // Single batch update instead of N delete + N add calls
          store.setParties(fetchedParties);
        }

        if (suppliersResponse.status === 'fulfilled') {
          const fetchedSuppliers = suppliersResponse.value.suppliers || [];
          store.setSuppliers(fetchedSuppliers);
        } else {
          console.error('❌ Failed to fetch suppliers:', (suppliersResponse as PromiseRejectedResult).reason);
        }

        if (vehiclesResponse.status === 'fulfilled') {
          const fetchedVehicles = vehiclesResponse.value.vehicles || [];
          store.setVehicles(fetchedVehicles);
        }

        if (fuelWalletsResponse.status === 'fulfilled') {
          const fetchedWallets = fuelWalletsResponse.value.wallets || [];
          store.setFuelWallets(fetchedWallets);
        }

        if (ledgerEntriesResponse.status === 'fulfilled') {
          const fetchedLedgerEntries = ledgerEntriesResponse.value.ledgerEntries || [];
          store.setLedgerEntries(fetchedLedgerEntries);
        }

        if (fuelTransactionsResponse.status === 'fulfilled') {
          // Check if fuel allocation was recently created (within last 8 seconds)
          const recentFuelAllocation = localStorage.getItem('lastFuelAllocation');
          const isRecentAllocation = recentFuelAllocation && (Date.now() - parseInt(recentFuelAllocation)) < 8000;

          if (!isRecentAllocation) {
            const fetchedTransactions = fuelTransactionsResponse.value.transactions || [];
            store.setFuelTransactions(fetchedTransactions);
          }
        }

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
        setIsRealTimeConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const syncEvent = JSON.parse(event.data);
          if (syncEvent.type === 'data_change') {
            setTimeout(() => syncData(), 500);
          }
        } catch (error) {
          console.error('Error parsing sync event:', error);
        }
      };

      eventSource.onerror = () => {
        setIsRealTimeConnected(false);
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connectToRealTimeSync();
          }
        }, 5000);
      };
    };

    // Store reference to syncData so handleSyncEvent can call it
    syncDataRef.current = syncData;

    syncData();
    connectToRealTimeSync();

    // Cleanup event listener and EventSource
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      const handler = (window as any).__cashbookSyncHandler;
      if (handler) {
        window.removeEventListener('data-sync-required', handler);
        delete (window as any).__cashbookSyncHandler;
      }

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
          localStorage.setItem('lastBillCreation', Date.now().toString());
          const billResponse = await apiService.createBill(data);
          store.addBill(billResponse.bill);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'memo':
          if (!data.loading_slip_id) {
            throw new Error('loading_slip_id is required for memo creation');
          }
          localStorage.setItem('lastMemoCreation', Date.now().toString());
          const memoResponse = await apiService.createMemo(data);
          store.addMemo(memoResponse.memo);
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          break;
        case 'loadingSlip':
          localStorage.setItem('lastLoadingSlipCreation', Date.now().toString());
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
          break;
        default:
          console.warn('Unknown sync type:', type);
      }
    } catch (error) {
      console.error(`Failed to create ${type}:`, error);
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

  const retrySync = async () => {
    try {
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
