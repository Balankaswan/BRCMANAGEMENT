import React, { createContext, useContext, useMemo, useState } from 'react';
import type { LoadingSlip, Memo as MemoType, Bill as BillType, Party, Supplier, BankingEntry, AdvancePayment, LedgerEntry } from '../types';

interface DataStoreState {
  loadingSlips: LoadingSlip[];
  memos: MemoType[];
  bills: BillType[];
  bankingEntries: BankingEntry[];
  ledgerEntries: LedgerEntry[];
  parties: Party[];
  suppliers: Supplier[];
  vehicles: string[];
  // actions
  addLoadingSlip: (slip: LoadingSlip) => void;
  updateLoadingSlip: (slip: LoadingSlip) => void;
  addMemo: (memo: MemoType) => void;
  updateMemo: (memo: MemoType) => void;
  addBill: (bill: BillType) => void;
  updateBill: (bill: BillType) => void;
  addBankingEntry: (entry: BankingEntry) => void;
}

const DataStoreContext = createContext<DataStoreState | null>(null);

export const DataStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingSlips, setLoadingSlips] = useState<LoadingSlip[]>([]);
  const [memos, setMemos] = useState<MemoType[]>([]);
  const [bills, setBills] = useState<BillType[]>([]);
  const [bankingEntries, setBankingEntries] = useState<BankingEntry[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [parties] = useState<Party[]>([]);
  const [suppliers] = useState<Supplier[]>([]);
  const [vehicles] = useState<string[]>(['GJ01AB1234', 'GJ05CD5678', 'DD01YV9406', 'MH12EF9012', 'RJ14GH3456']);

  const value: DataStoreState = useMemo(() => ({
    loadingSlips,
    memos,
    bills,
    bankingEntries,
    ledgerEntries,
    parties,
    suppliers,
    vehicles,
    addLoadingSlip: (slip) => setLoadingSlips(prev => [slip, ...prev]),
    updateLoadingSlip: (slip) => setLoadingSlips(prev => prev.map(s => s.id === slip.id ? slip : s)),
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
    addBankingEntry: (entry) => {
      setBankingEntries(prev => [entry, ...prev]);
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
  }), [loadingSlips, memos, bills, bankingEntries, ledgerEntries, parties, suppliers, vehicles]);

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
