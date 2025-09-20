import React, { createContext, useContext, useState } from 'react';
import { apiService } from './api';
import type { LoadingSlip, Memo, Bill, BankingEntry, CashbookEntry, LedgerEntry, Party, Supplier, Vehicle, FuelWallet, VehicleFuelExpense, FuelTransaction, PODFile, AdvancePayment } from '../types';

interface DataStoreState {
  loadingSlips: LoadingSlip[];
  memos: Memo[];
  bills: Bill[];
  bankingEntries: BankingEntry[];
  cashbookEntries: CashbookEntry[];
  ledgerEntries: LedgerEntry[];
  parties: Party[];
  suppliers: Supplier[];
  vehicles: Vehicle[];
  fuelWallets: FuelWallet[];
  fuelTransactions: FuelTransaction[];
  vehicleFuelExpenses: VehicleFuelExpense[];
  podFiles: PODFile[];
  // actions
  addLoadingSlip: (slip: LoadingSlip) => void;
  updateLoadingSlip: (slip: LoadingSlip) => void;
  deleteLoadingSlip: (id: string) => void;
  addMemo: (memo: Memo) => void;
  updateMemo: (memo: Memo) => void;
  deleteMemo: (id: string) => void;
  markMemoAsPaid: (id: string, paidDate: string, paidAmount: number) => void;
  addBill: (bill: Bill) => void;
  updateBill: (bill: Bill) => void;
  deleteBill: (id: string) => void;
  markBillAsReceived: (id: string, receivedDate: string, receivedAmount: number) => void;
  addBankingEntry: (entry: BankingEntry) => void;
  updateBankingEntry: (id: string, entry: BankingEntry) => void;
  deleteBankingEntry: (id: string) => void;
  setBankingEntries: (entries: BankingEntry[]) => void;
  setBills: (bills: Bill[]) => void;
  setMemos: (memos: Memo[]) => void;
  setLoadingSlips: (slips: LoadingSlip[]) => void;
  setLedgerEntries: (entries: LedgerEntry[]) => void;
  setCashbookEntries: (entries: CashbookEntry[]) => void;
  setPODFiles: (files: PODFile[]) => void;
  addCashbookEntry: (entry: CashbookEntry) => void;
  updateCashbookEntry: (entry: CashbookEntry) => void;
  deleteCashbookEntry: (id: string) => void;
  addParty: (party: Party) => void;
  updateParty: (party: Party) => void;
  deleteParty: (id: string) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicle: (vehicle: Vehicle) => void;
  deleteVehicle: (id: string) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  addFuelWallet: (wallet: FuelWallet) => void;
  setFuelWallets: (wallets: FuelWallet[]) => void;
  setFuelTransactions: (transactions: FuelTransaction[]) => void;
  getFuelWalletBalance: (walletName: string) => number;
  getVehicleFuelExpenses: () => VehicleFuelExpense[];
  addPODFile: (file: PODFile) => void;
  deletePODFile: (id: string) => void;
  getPODFiles: () => PODFile[];
  allocateFuelToVehicle: (vehicleNo: string, walletName: string, amount: number, date: string, narration: string, fuelQuantity: number, ratePerLiter: number, odometerReading: number, fuelType: string, allocatedBy: string) => void;
  bulkPaySupplierMemos: (memoIds: string[], paymentData: any) => void;
  bulkPayBills: (billIds: string[], paymentData: any) => void;
  cleanupSupplierLedgerForOwnVehicles: () => void;
}

const DataStoreContext = createContext<DataStoreState | null>(null);

export const DataStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingSlips, setLoadingSlips] = useState<LoadingSlip[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [bankingEntries, setBankingEntries] = useState<BankingEntry[]>([]);
  const [cashbookEntries, setCashbookEntries] = useState<CashbookEntry[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelWallets, setFuelWallets] = useState<FuelWallet[]>([]);
  const [fuelTransactions, setFuelTransactions] = useState<FuelTransaction[]>([]);
  const [vehicleFuelExpenses, setVehicleFuelExpenses] = useState<VehicleFuelExpense[]>([]);
  const [podFiles, setPodFiles] = useState<PODFile[]>([]);

  const contextValue: DataStoreState = {
    loadingSlips,
    memos,
    bills,
    bankingEntries,
    cashbookEntries,
    ledgerEntries,
    parties,
    suppliers,
    vehicles,
    fuelWallets,
    fuelTransactions,
    vehicleFuelExpenses,
    podFiles,

    // Loading slip actions
    addLoadingSlip: (slip) => setLoadingSlips(prev => [slip, ...prev]),
    updateLoadingSlip: (slip) => setLoadingSlips(prev => prev.map(s => s.id === slip.id ? slip : s)),
    deleteLoadingSlip: (id) => setLoadingSlips(prev => prev.filter(s => s.id !== id)),
    setLoadingSlips: (slips) => setLoadingSlips(slips),

    // Memo actions
    addMemo: (memo) => setMemos(prev => [memo, ...prev]),
    updateMemo: (memo) => setMemos(prev => prev.map(m => m.id === memo.id ? memo : m)),
    deleteMemo: (id) => setMemos(prev => prev.filter(m => m.id !== id)),
    markMemoAsPaid: (id, paidDate, paidAmount) => {
      setMemos(prev => prev.map(m => 
        m.id === id ? { ...m, status: 'paid', paid_date: paidDate, paid_amount: paidAmount } : m
      ));
    },
    setMemos: (memos) => setMemos(memos),

    // Bill actions
    addBill: (bill) => setBills(prev => [bill, ...prev]),
    updateBill: (bill) => setBills(prev => prev.map(b => b.id === bill.id ? bill : b)),
    deleteBill: (id) => setBills(prev => prev.filter(b => b.id !== id)),
    markBillAsReceived: (id, receivedDate, receivedAmount) => {
      setBills(prev => prev.map(b => 
        b.id === id ? { ...b, status: 'received', received_date: receivedDate, received_amount: receivedAmount } : b
      ));
    },
    setBills: (bills) => setBills(bills),

    // Banking actions
    addBankingEntry: (entry) => setBankingEntries(prev => [entry, ...prev]),
    updateBankingEntry: (id, entry) => setBankingEntries(prev => prev.map(e => e.id === id ? entry : e)),
    deleteBankingEntry: (id) => setBankingEntries(prev => prev.filter(e => e.id !== id)),
    setBankingEntries: (entries) => setBankingEntries(entries),

    // Cashbook actions - simplified, backend handles all ledger logic
    addCashbookEntry: (entry) => {
      setCashbookEntries(prev => [entry, ...prev]);
      console.log('✅ Cashbook entry added to store:', entry.id);
    },
    updateCashbookEntry: (entry) => {
      setCashbookEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
      console.log('✅ Cashbook entry updated in store:', entry.id);
    },
    deleteCashbookEntry: (id) => {
      setCashbookEntries(prev => prev.filter(e => e.id !== id));
      console.log('✅ Cashbook entry deleted from store:', id);
    },
    setCashbookEntries: (entries) => setCashbookEntries(entries),

    // Ledger actions
    setLedgerEntries: (entries) => setLedgerEntries(entries),

    // Party actions
    addParty: (party) => setParties(prev => [party, ...prev]),
    updateParty: (party) => setParties(prev => prev.map(p => p.id === party.id ? party : p)),
    deleteParty: (id) => setParties(prev => prev.filter(p => p.id !== id)),

    // Supplier actions
    addSupplier: (supplier) => setSuppliers(prev => [supplier, ...prev]),
    updateSupplier: (supplier) => setSuppliers(prev => prev.map(s => s.id === supplier.id ? supplier : s)),
    deleteSupplier: (id) => setSuppliers(prev => prev.filter(s => s.id !== id)),

    // Vehicle actions
    addVehicle: (vehicle) => setVehicles(prev => [vehicle, ...prev]),
    updateVehicle: (vehicle) => setVehicles(prev => prev.map(v => v.id === vehicle.id ? vehicle : v)),
    deleteVehicle: (id) => setVehicles(prev => prev.filter(v => v.id !== id)),
    setVehicles: (vehicles) => setVehicles(vehicles),

    // Fuel actions
    addFuelWallet: (wallet) => setFuelWallets(prev => [wallet, ...prev]),
    setFuelWallets: (wallets) => setFuelWallets(wallets),
    setFuelTransactions: (transactions) => setFuelTransactions(transactions),
    getFuelWalletBalance: (walletName) => {
      const wallet = fuelWallets.find(w => w.name === walletName);
      return wallet ? wallet.balance : 0;
    },
    getVehicleFuelExpenses: () => vehicleFuelExpenses.filter(expense => expense.vehicle_no),

    // POD actions
    addPODFile: (file) => setPodFiles(prev => [file, ...prev]),
    deletePODFile: (id) => setPodFiles(prev => prev.filter(pod => pod.id !== id)),
    getPODFiles: () => podFiles,
    setPODFiles: (files) => setPodFiles(files),

    // Complex operations
    allocateFuelToVehicle: async (vehicleNo: string, walletName: string, amount: number, date: string, narration: string, fuelQuantity?: number, ratePerLiter?: number, odometerReading?: number, fuelType?: string, allocatedBy?: string) => {
      try {
        console.log('🚛 Starting fuel allocation:', { vehicleNo, walletName, amount });
        
        const response = await apiService.allocateFuel({
          vehicle_no: vehicleNo,
          wallet_name: walletName,
          amount,
          date,
          narration,
          fuel_quantity: fuelQuantity,
          rate_per_liter: ratePerLiter,
          odometer_reading: odometerReading,
          fuel_type: fuelType,
          allocated_by: allocatedBy
        });
        
        console.log('✅ Fuel allocation successful:', response);
        
        // Trigger data sync to refresh fuel wallets and transactions
        window.dispatchEvent(new CustomEvent('data-sync-required'));
        
        return response;
      } catch (error) {
        console.error('❌ Fuel allocation failed:', error);
        throw error;
      }
    },
    bulkPaySupplierMemos: () => console.log('Bulk pay supplier memos - handled by backend'),
    bulkPayBills: () => console.log('Bulk pay bills - handled by backend'),
    cleanupSupplierLedgerForOwnVehicles: () => console.log('Cleanup supplier ledger - handled by backend')
  };

  return (
    <DataStoreContext.Provider value={contextValue}>
      {children}
    </DataStoreContext.Provider>
  );
};

export const useDataStore = (): DataStoreState => {
  const context = useContext(DataStoreContext);
  if (!context) {
    throw new Error('useDataStore must be used within a DataStoreProvider');
  }
  return context;
};
