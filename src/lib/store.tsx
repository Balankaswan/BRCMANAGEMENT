import React, { createContext, useContext, useMemo, useState } from 'react';
import type { LoadingSlip, Memo, Bill, BankingEntry, LedgerEntry, Party, Supplier, FuelWallet, FuelTransaction, VehicleFuelExpense, Vehicle, AdvancePayment } from '../types';

interface DataStoreState {
  loadingSlips: LoadingSlip[];
  memos: Memo[];
  bills: Bill[];
  bankingEntries: BankingEntry[];
  cashbookEntries: BankingEntry[];
  ledgerEntries: LedgerEntry[];
  parties: Party[];
  suppliers: Supplier[];
  vehicles: Vehicle[];
  fuelWallets: FuelWallet[];
  fuelTransactions: FuelTransaction[];
  vehicleFuelExpenses: VehicleFuelExpense[];
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
  deleteBankingEntry: (id: string) => void;
  addCashbookEntry: (entry: BankingEntry) => void;
  deleteCashbookEntry: (id: string) => void;
  addParty: (party: Party) => void;
  addSupplier: (supplier: Supplier) => void;
  // Vehicle management actions
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicle: (vehicle: Vehicle) => void;
  deleteVehicle: (id: string) => void;
  // Fuel accounting actions
  addFuelWallet: (wallet: FuelWallet) => void;
  allocateFuelToVehicle: (vehicleNo: string, walletName: string, amount: number, date: string, narration?: string, fuelQuantity?: number, ratePerLiter?: number, odometerReading?: number) => void;
  getFuelWalletBalance: (walletName: string) => number;
  getVehicleFuelExpenses: (vehicleNo: string) => VehicleFuelExpense[];
}

const DataStoreContext = createContext<DataStoreState | null>(null);

export const DataStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingSlips, setLoadingSlips] = useState<LoadingSlip[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [bankingEntries, setBankingEntries] = useState<BankingEntry[]>([]);
  const [cashbookEntries, setCashbookEntries] = useState<BankingEntry[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: 'v1', vehicle_no: 'GJ01AB1234', vehicle_type: 'Truck', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v2', vehicle_no: 'GJ05CD5678', vehicle_type: 'Truck', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v3', vehicle_no: 'DD01YV9406', vehicle_type: 'Truck', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v4', vehicle_no: 'MH12EF9012', vehicle_type: 'Truck', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'v5', vehicle_no: 'RJ14GH3456', vehicle_type: 'Truck', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ]);
  const [fuelWallets, setFuelWallets] = useState<FuelWallet[]>([
    { id: 'bpcl-wallet', name: 'BPCL', balance: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'hpcl-wallet', name: 'HPCL', balance: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'iocl-wallet', name: 'IOCL', balance: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ]);
  const [fuelTransactions, setFuelTransactions] = useState<FuelTransaction[]>([]);
  const [vehicleFuelExpenses, setVehicleFuelExpenses] = useState<VehicleFuelExpense[]>([]);

  const value: DataStoreState = useMemo(() => ({
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
    addLoadingSlip: (slip) => setLoadingSlips(prev => [slip, ...prev]),
    updateLoadingSlip: (slip) => setLoadingSlips(prev => prev.map(s => s.id === slip.id ? slip : s)),
    deleteLoadingSlip: (id) => {
      setLoadingSlips(prev => prev.filter(s => s.id !== id));
      // Also remove related memos, bills, and ledger entries
      setMemos(prev => prev.filter(m => m.loading_slip_id !== id));
      setBills(prev => prev.filter(b => b.loading_slip_id !== id));
      setLedgerEntries(prev => prev.filter(l => l.loading_slip_id !== id));
    },
    addMemo: (memo) => {
      setMemos(prev => [memo, ...prev]);
      // Register Supplier ledger entry using Loading Slip context
      const ls = loadingSlips.find(s => s.id === memo.loading_slip_id);
      const entry: LedgerEntry = {
        id: `${memo.id}-ledger`,
        ledger_type: 'supplier',
        reference_id: memo.memo_number,
        reference_name: memo.supplier,
        date: memo.date,
        description: 'Memo created',
        debit: 0,
        credit: memo.net_amount,
        balance: 0,
        created_at: new Date().toISOString(),
        loading_slip_id: memo.loading_slip_id,
        memo_number: memo.memo_number,
        from_location: ls?.from_location,
        to_location: ls?.to_location,
        vehicle_no: ls?.vehicle_no,
      };
      setLedgerEntries(prev => [entry, ...prev]);
    },
    updateMemo: (memo) => setMemos(prev => prev.map(m => m.id === memo.id ? memo : m)),
    deleteMemo: (id) => {
      setMemos(prev => prev.filter(m => m.id !== id));
      setLedgerEntries(prev => prev.filter(l => l.reference_id !== `${id}-ledger`));
    },
    markMemoAsPaid: (id, paidDate, paidAmount) => {
      setMemos(prev => prev.map(m => 
        m.id === id 
          ? { ...m, status: 'paid', paid_date: paidDate, paid_amount: paidAmount, updated_at: new Date().toISOString() }
          : m
      ));
    },
    addBill: (bill) => {
      setBills(prev => [bill, ...prev]);
      // Register Party ledger entry using Loading Slip context
      const ls = loadingSlips.find(s => s.id === bill.loading_slip_id);
      const entry: LedgerEntry = {
        id: `${bill.id}-ledger`,
        ledger_type: 'party',
        reference_id: bill.bill_number,
        reference_name: bill.party,
        date: bill.date,
        description: 'Bill created',
        debit: bill.net_amount,
        credit: 0,
        balance: 0,
        created_at: new Date().toISOString(),
        loading_slip_id: bill.loading_slip_id,
        bill_number: bill.bill_number,
        from_location: ls?.from_location,
        to_location: ls?.to_location,
        vehicle_no: ls?.vehicle_no,
      };
      setLedgerEntries(prev => [entry, ...prev]);
    },
    updateBill: (bill) => setBills(prev => prev.map(b => b.id === bill.id ? bill : b)),
    deleteBill: (id) => {
      setBills(prev => prev.filter(b => b.id !== id));
      setLedgerEntries(prev => prev.filter(l => l.reference_id !== `${id}-ledger`));
    },
    markBillAsReceived: (id, receivedDate, receivedAmount) => {
      setBills(prev => prev.map(b => 
        b.id === id 
          ? { ...b, status: 'received', received_date: receivedDate, received_amount: receivedAmount, updated_at: new Date().toISOString() }
          : b
      ));
    },
    addBankingEntry: (entry) => {
      setBankingEntries(prev => [entry, ...prev]);
      
      // Handle fuel wallet transactions with automatic double-entry
      if (entry.category === 'fuel_wallet' && entry.type === 'debit' && entry.reference_name) {
        const walletName = entry.reference_name;
        const transactionId = Date.now().toString();
        const now = new Date().toISOString();
        
        // Create fuel wallet credit transaction
        const fuelTransaction: FuelTransaction = {
          id: transactionId,
          type: 'wallet_credit',
          wallet_name: walletName,
          amount: entry.amount,
          date: entry.date,
          reference_id: entry.id,
          narration: entry.narration,
          created_at: now
        };
        setFuelTransactions(prev => [fuelTransaction, ...prev]);
        
        // Update or create fuel wallet
        const existingWallet = fuelWallets.find(w => w.name === walletName);
        if (existingWallet) {
          setFuelWallets(prev => prev.map(wallet => 
            wallet.name === walletName 
              ? { ...wallet, balance: wallet.balance + entry.amount, updated_at: now }
              : wallet
          ));
        } else {
          const newWallet: FuelWallet = {
            id: `${walletName.toLowerCase()}-wallet-${Date.now()}`,
            name: walletName,
            balance: entry.amount,
            created_at: now,
            updated_at: now
          };
          setFuelWallets(prev => [newWallet, ...prev]);
        }
        
        // Create fuel wallet ledger entry (Credit)
        const walletLedgerEntry: LedgerEntry = {
          id: `${entry.id}-wallet-ledger`,
          ledger_type: 'fuel_wallet',
          reference_id: walletName,
          reference_name: `${walletName} Fuel Wallet`,
          date: entry.date,
          description: `Fuel wallet credit from bank`,
          narration: entry.narration,
          debit: entry.amount,
          credit: 0,
          balance: 0,
          source_type: 'banking',
          source_id: entry.id,
          created_at: now
        };
        setLedgerEntries(prev => [walletLedgerEntry, ...prev]);
        
        return; // Skip the general ledger logic below for fuel wallet transactions
      }
      
      // Auto-register debit entries in supplier/party ledgers
      if (entry.type === 'debit' && entry.reference_name) {
        const ledgerEntry: LedgerEntry = {
          id: `${entry.id}-auto-ledger`,
          ledger_type: entry.category?.includes('supplier') ? 'supplier' : 'party',
          reference_id: entry.reference_id || entry.id,
          reference_name: entry.reference_name,
          date: entry.date,
          description: `Banking entry: ${entry.narration}`,
          debit: 0,
          credit: entry.amount,
          balance: 0,
          created_at: new Date().toISOString(),
        };
        setLedgerEntries(prev => [ledgerEntry, ...prev]);
      }
      
      // Auto-create general ledger entries for expense transactions
      if (entry.type === 'debit' && (entry.category === 'expense' || entry.category === 'other') && entry.reference_name) {
        const generalLedgerEntry: LedgerEntry = {
          id: `${entry.id}-expense-ledger`,
          ledger_type: 'general',
          reference_id: entry.id,
          reference_name: entry.reference_name,
          date: entry.date,
          description: `Expense: ${entry.narration}`,
          debit: entry.amount,
          credit: 0,
          balance: 0,
          created_at: new Date().toISOString(),
        };
        setLedgerEntries(prev => [generalLedgerEntry, ...prev]);
        
        // Auto-add to parties list if not exists
        const existingParty = parties.find(p => p.name.toLowerCase() === entry.reference_name!.toLowerCase());
        if (!existingParty) {
          const newParty: Party = {
            id: `auto-${Date.now()}`,
            name: entry.reference_name!,
            contact: '',
            address: '',
            created_at: new Date().toISOString(),
          };
          setParties(prev => [newParty, ...prev]);
        }
      }
      
      // Link to memo advances if applicable
      if (entry.category === 'memo_advance' || entry.category === 'memo_payment') {
        const memoNumber = entry.reference_id;
        if (memoNumber) {
          setMemos(prev => prev.map(m => {
            if (m.memo_number === memoNumber) {
              const adv: AdvancePayment = {
                id: entry.id,
                memo_id: m.id,
                date: entry.date,
                amount: entry.amount,
                mode: 'bank',
                reference: entry.reference_id,
                created_at: entry.created_at,
              };
              return { ...m, advance_payments: [...(m.advance_payments || []), adv] };
            }
            return m;
          }));
        }
      }
      // Link to bill advances if applicable
      if (entry.category === 'bill_advance' || entry.category === 'bill_payment') {
        const billNumber = entry.reference_id;
        if (billNumber) {
          setBills(prev => prev.map(b => {
            if (b.bill_number === billNumber) {
              const adv: AdvancePayment = {
                id: entry.id,
                bill_id: b.id,
                date: entry.date,
                amount: entry.amount,
                mode: 'bank',
                reference: entry.reference_id,
                created_at: entry.created_at,
              };
              return { ...b, advance_payments: [...(b.advance_payments || []), adv] };
            }
            return b;
          }));
        }
      }
    },
    deleteBankingEntry: (id) => {
      setBankingEntries(prev => prev.filter(e => e.id !== id));
    },
    addCashbookEntry: (entry) => {
      const newEntry: BankingEntry = {
        ...entry,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
      };
      setCashbookEntries(prev => [newEntry, ...prev]);
      
      // Create general ledger entries for expense/other debit transactions
      if (newEntry.type === 'debit' && (newEntry.category === 'expense' || newEntry.category === 'other') && newEntry.reference_name) {
        const ledgerEntry: LedgerEntry = {
          id: `ledger_${newEntry.id}`,
          date: newEntry.date,
          reference_name: newEntry.reference_name,
          debit: newEntry.amount,
          credit: 0,
          debit_amount: newEntry.amount,
          credit_amount: 0,
          narration: `Cashbook: ${newEntry.narration}`,
          ledger_type: 'general',
          source_type: 'cashbook',
          source_id: newEntry.id,
          created_at: newEntry.created_at,
        };
        
        setLedgerEntries(prev => [ledgerEntry, ...prev]);
        
        // Add party if it doesn't exist
        const currentParties = parties;
        if (!currentParties.some((p: Party) => p.name === newEntry.reference_name)) {
          const newParty: Party = {
            id: Date.now().toString() + '_party',
            name: newEntry.reference_name,
            address: '',
            phone: '',
            created_at: newEntry.created_at,
          };
          setParties(prev => [newParty, ...prev]);
        }
      }
    },
    deleteCashbookEntry: (id) => {
      setCashbookEntries(prev => prev.filter(e => e.id !== id));
      setLedgerEntries(prev => prev.filter(l => !(l.source_id === id && l.source_type === 'cashbook')));
    },
    addParty: (party) => setParties(prev => [party, ...prev]),
    addSupplier: (supplier) => setSuppliers(prev => [supplier, ...prev]),
    
    // Vehicle management methods
    addVehicle: (vehicle) => setVehicles(prev => [vehicle, ...prev]),
    updateVehicle: (vehicle) => setVehicles(prev => prev.map(v => v.id === vehicle.id ? vehicle : v)),
    deleteVehicle: (id) => setVehicles(prev => prev.filter(v => v.id !== id)),
    
    // Fuel accounting methods
    addFuelWallet: (wallet) => setFuelWallets(prev => [wallet, ...prev]),
    
    getFuelWalletBalance: (walletName) => {
      const wallet = fuelWallets.find(w => w.name === walletName);
      return wallet ? wallet.balance : 0;
    },
    
    getVehicleFuelExpenses: (vehicleNo) => {
      return vehicleFuelExpenses.filter(expense => expense.vehicle_no === vehicleNo);
    },
    
    allocateFuelToVehicle: (vehicleNo, walletName, amount, date, narration = '', fuelQuantity, ratePerLiter, odometerReading) => {
      const transactionId = Date.now().toString();
      const now = new Date().toISOString();
      
      // Create fuel allocation transaction
      const fuelTransaction: FuelTransaction = {
        id: transactionId,
        type: 'fuel_allocation',
        wallet_name: walletName,
        amount,
        date,
        vehicle_no: vehicleNo,
        narration: narration || `Fuel allocated to ${vehicleNo}`,
        created_at: now
      };
      setFuelTransactions(prev => [fuelTransaction, ...prev]);
      
      // Create vehicle fuel expense record
      const vehicleExpense: VehicleFuelExpense = {
        id: `${transactionId}-expense`,
        vehicle_no: vehicleNo,
        wallet_name: walletName,
        amount,
        date,
        fuel_quantity: fuelQuantity,
        rate_per_liter: ratePerLiter,
        odometer_reading: odometerReading,
        narration,
        created_at: now
      };
      setVehicleFuelExpenses(prev => [vehicleExpense, ...prev]);
      
      // Update fuel wallet balance
      setFuelWallets(prev => prev.map(wallet => 
        wallet.name === walletName 
          ? { ...wallet, balance: wallet.balance - amount, updated_at: now }
          : wallet
      ));
      
      // Create ledger entries for double-entry accounting
      const vehicleLedgerEntry: LedgerEntry = {
        id: `${transactionId}-vehicle-ledger`,
        ledger_type: 'vehicle_fuel',
        reference_id: vehicleNo,
        reference_name: `${vehicleNo} Fuel Expense`,
        date,
        description: `Fuel allocation from ${walletName}`,
        narration: narration || `Fuel allocated to ${vehicleNo}`,
        debit: amount,
        credit: 0,
        balance: 0,
        source_type: 'fuel',
        source_id: transactionId,
        vehicle_no: vehicleNo,
        created_at: now
      };
      
      const walletLedgerEntry: LedgerEntry = {
        id: `${transactionId}-wallet-ledger`,
        ledger_type: 'fuel_wallet',
        reference_id: walletName,
        reference_name: `${walletName} Fuel Wallet`,
        date,
        description: `Fuel allocated to ${vehicleNo}`,
        narration: narration || `Fuel allocated to ${vehicleNo}`,
        debit: 0,
        credit: amount,
        balance: 0,
        source_type: 'fuel',
        source_id: transactionId,
        vehicle_no: vehicleNo,
        created_at: now
      };

      // Create General Ledger entry under vehicle's account name
      const generalLedgerEntry: LedgerEntry = {
        id: `${transactionId}-general-ledger`,
        ledger_type: 'general',
        reference_id: vehicleNo,
        reference_name: `Vehicle ${vehicleNo} - Fuel Expense`,
        date,
        description: `Fuel expense from ${walletName} wallet`,
        narration: narration || `Fuel allocated to ${vehicleNo} from ${walletName}`,
        debit: amount,
        credit: 0,
        balance: 0,
        source_type: 'fuel',
        source_id: transactionId,
        vehicle_no: vehicleNo,
        created_at: now
      };
      
      setLedgerEntries(prev => [vehicleLedgerEntry, walletLedgerEntry, generalLedgerEntry, ...prev]);
    }
  }), [loadingSlips, memos, bills, bankingEntries, cashbookEntries, ledgerEntries, parties, suppliers, vehicles, fuelWallets, fuelTransactions, vehicleFuelExpenses]);

  return (
    <DataStoreContext.Provider value={value}>
      {children}
    </DataStoreContext.Provider>
  );
};

export const useDataStore = () => {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error('useDataStore must be used within DataStoreProvider');
  return ctx;
};
