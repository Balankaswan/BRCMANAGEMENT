import type { Bill, Memo, BankingEntry, LoadingSlip, Vehicle } from '../types';

export interface OutstandingBalance {
  partyName: string;
  totalBills: number;
  totalPayments: number;
  totalAdvances: number;
  outstandingAmount: number;
}

export interface SupplierOutstandingBalance {
  supplierName: string;
  totalMemos: number;
  totalDetention: number;
  totalExtraWeight: number;
  totalPayments: number;
  totalAdvances: number;
  totalCommission: number;
  totalMamul: number;
  outstandingAmount: number;
}

/**
 * Calculate outstanding balance for a specific party
 */
export const calculatePartyBalance = (
  partyName: string,
  bills: Bill[],
  bankingEntries: BankingEntry[]
): OutstandingBalance => {
  // Get all bills for this party
  const partyBills = bills.filter(bill => bill.party === partyName);
  
  // Calculate total bill amounts including detention, extra, RTO minus deductions
  const totalBills = partyBills.reduce((sum, bill) => {
    const netAmount = bill.bill_amount + (bill.detention || 0) + (bill.extra || 0) + (bill.rto || 0) - (bill.mamool || 0) - (bill.penalties || 0) - (bill.tds || 0);
    return sum + netAmount;
  }, 0);
  
  // Get all payments and advances for this party's bills
  const partyBankingEntries = bankingEntries.filter(entry => 
    (entry.category === 'bill_payment' || entry.category === 'bill_advance') &&
    partyBills.some(bill => bill.bill_number === entry.reference_id)
  );
  
  const totalPayments = partyBankingEntries
    .filter(entry => entry.category === 'bill_payment')
    .reduce((sum, entry) => sum + entry.amount, 0);
    
  const totalAdvances = partyBankingEntries
    .filter(entry => entry.category === 'bill_advance')
    .reduce((sum, entry) => sum + entry.amount, 0);
  
  // Balance = Total Bill Amount – (Payments Received + Advance Received)
  const outstandingAmount = totalBills - (totalPayments + totalAdvances);
  
  return {
    partyName,
    totalBills,
    totalPayments,
    totalAdvances,
    outstandingAmount
  };
};

/**
 * Calculate outstanding balance for a specific supplier
 */
export const calculateSupplierBalance = (
  supplierName: string,
  memos: Memo[],
  bankingEntries: BankingEntry[]
): SupplierOutstandingBalance => {
  // Get all memos for this supplier
  const supplierMemos = memos.filter(memo => memo.supplier === supplierName);
  // Calculate totals from memos using the correct formula
  // Balance = Freight - Advance - Commission - Mamul + Extra + Detention
  const totalFreight = supplierMemos.reduce((sum, memo) => sum + memo.freight, 0);
  const totalDetention = supplierMemos.reduce((sum, memo) => sum + (memo.detention || 0), 0);
  const totalExtraWeight = supplierMemos.reduce((sum, memo) => sum + (memo.extra || 0), 0);
  const totalCommission = supplierMemos.reduce((sum, memo) => sum + (memo.commission || 0), 0);
  const totalMamul = supplierMemos.reduce((sum, memo) => sum + (memo.mamool || 0), 0);
  
  // Get all advances for this supplier's memos
  const supplierBankingEntries = bankingEntries.filter(entry => 
    (entry.category === 'memo_payment' || entry.category === 'memo_advance') &&
    supplierMemos.some(memo => memo.memo_number === entry.reference_id)
  );
  
  const totalPayments = supplierBankingEntries
    .filter(entry => entry.category === 'memo_payment')
    .reduce((sum, entry) => sum + entry.amount, 0);
    
  const totalAdvances = supplierBankingEntries
    .filter(entry => entry.category === 'memo_advance')
    .reduce((sum, entry) => sum + entry.amount, 0);
  
  // Correct formula: Balance = Freight - Advance - Commission - Mamul + Extra + Detention
  const outstandingAmount = totalFreight - totalAdvances - totalCommission - totalMamul + totalExtraWeight + totalDetention;
  
  return {
    supplierName,
    totalMemos: totalFreight,
    totalDetention,
    totalExtraWeight,
    totalPayments,
    totalAdvances,
    totalCommission,
    totalMamul,
    outstandingAmount
  };
};

/**
 * Get all party outstanding balances
 */
export const getAllPartyBalances = (
  bills: Bill[],
  bankingEntries: BankingEntry[]
): OutstandingBalance[] => {
  const parties = Array.from(new Set(bills.map(bill => bill.party)));
  
  return parties.map(party => calculatePartyBalance(party, bills, bankingEntries))
    .sort((a, b) => b.outstandingAmount - a.outstandingAmount);
};

/**
 * Get all supplier outstanding balances (excluding own vehicles)
 */
export const getAllSupplierBalances = (
  memos: Memo[],
  bankingEntries: BankingEntry[],
  loadingSlips?: LoadingSlip[],
  vehicles?: Vehicle[]
): SupplierOutstandingBalance[] => {
  // Filter out memos from own vehicles if loading slips and vehicles data is available
  let filteredMemos = memos;
  if (loadingSlips && vehicles) {
    filteredMemos = memos.filter(memo => {
      const ls = loadingSlips.find(s => s.id === memo.loading_slip_id);
      const vehicle = vehicles.find(v => v.vehicle_no === ls?.vehicle_no);
      const isOwnVehicle = vehicle?.ownership_type === 'own';
      
      return !isOwnVehicle;
    });
  }
  
  const suppliers = Array.from(new Set(filteredMemos.map(memo => memo.supplier)));
  
  return suppliers.map(supplier => calculateSupplierBalance(supplier, filteredMemos, bankingEntries))
    .sort((a, b) => b.outstandingAmount - a.outstandingAmount);
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Get ledger summary for a party
 */
export const getPartyLedgerSummary = (
  partyName: string,
  bills: Bill[],
  bankingEntries: BankingEntry[]
) => {
  const balance = calculatePartyBalance(partyName, bills, bankingEntries);
  const partyBills = bills.filter(bill => bill.party === partyName);
  
  return {
    ...balance,
    totalBillCount: partyBills.length,
    lastBillDate: partyBills.length > 0 ? 
      Math.max(...partyBills.map(bill => new Date(bill.date).getTime())) : null,
    status: balance.outstandingAmount > 0 ? 'pending' : 'cleared'
  };
};

/**
 * Get ledger summary for a supplier
 */
export const getSupplierLedgerSummary = (
  supplierName: string,
  memos: Memo[],
  bankingEntries: BankingEntry[]
) => {
  const balance = calculateSupplierBalance(supplierName, memos, bankingEntries);
  const supplierMemos = memos.filter(memo => memo.supplier === supplierName);
  
  return {
    ...balance,
    totalMemoCount: supplierMemos.length,
    lastMemoDate: supplierMemos.length > 0 ? 
      Math.max(...supplierMemos.map(memo => new Date(memo.date).getTime())) : null,
    status: balance.outstandingAmount > 0 ? 'pending' : 'cleared'
  };
};
