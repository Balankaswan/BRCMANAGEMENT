export interface LoadingSlip {
  id: string;
  slip_number: string;
  date: string;
  party: string;
  vehicle_no: string;
  from_location: string;
  to_location: string;
  dimension: string;
  weight: number;
  supplier: string;
  freight: number;
  advance: number;
  balance: number;
  rto: number;
  total_freight: number;
  narration?: string;
  created_at: string;
  updated_at: string;
}

export interface Memo {
  id: string;
  memo_number: string;
  loading_slip_id: string;
  date: string;
  supplier: string;
  freight: number;
  commission: number;
  mamool: number;
  detention: number;
  extra: number;
  rto: number;
  net_amount: number;
  advance_payments: AdvancePayment[];
  status: 'pending' | 'paid';
  paid_date?: string;
  paid_amount?: number;
  narration?: string;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  totalFreight: number;
  id: string;
  bill_number: string;
  loading_slip_id: string;
  date: string;
  party: string;
  bill_amount: number;
  mamool: number;
  tds: number;
  penalties: number;
  net_amount: number;
  status: 'pending' | 'received';
  received_date?: string;
  received_amount?: number;
  pod_image?: string;
  advance_payments?: AdvancePayment[];
  narration?: string;
  created_at: string;
  updated_at: string;
}

export interface AdvancePayment {
  id: string;
  memo_id?: string;
  bill_id?: string;
  date: string;
  amount: number;
  mode?: 'cash' | 'bank' | 'other';
  reference?: string;
  description?: string;
  created_at?: string;
}

// (Removed duplicate LedgerEntry; see unified interface at bottom)

export interface BankingEntry {
  id: string;
  type: 'credit' | 'debit';
  category: 'bill_advance' | 'bill_payment' | 'memo_advance' | 'memo_payment' | 'expense' | 'fuel_wallet' | 'other';
  amount: number;
  date: string;
  reference_id?: string;
  reference_name?: string;
  narration: string;
  created_at: string;
}

export interface Party {
  id: string;
  name: string;
  address?: string;
  contact?: string;
  phone?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  address?: string;
  contact?: string;
  created_at: string;
}

export interface POD {
  id: string;
  bill_number: string;
  loading_slip_id: string;
  party: string;
  vehicle_no: string;
  image_url: string;
  image_name: string;
  upload_date: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  ledger_type: 'party' | 'supplier' | 'general' | 'fuel_wallet' | 'vehicle_fuel';
  reference_id?: string; // bill_number or memo_number or other ref
  reference_name: string; // party or supplier name
  date: string;
  description?: string;
  narration?: string;
  debit: number;
  credit: number;
  debit_amount?: number;
  credit_amount?: number;
  balance?: number;
  source_type?: 'banking' | 'cashbook' | 'memo' | 'bill' | 'fuel';
  source_id?: string;
  created_at: string;
  // Trip-related optional fields
  loading_slip_id?: string;
  memo_number?: string;
  bill_number?: string;
  from_location?: string;
  to_location?: string;
  vehicle_no?: string;
}

export interface CashbookEntry {
  id: string;
  type: 'credit' | 'debit';
  category: 'bill_advance' | 'bill_payment' | 'memo_advance' | 'memo_payment' | 'expense' | 'fuel_wallet' | 'other';
  amount: number;
  date: string;
  reference_id?: string;
  reference_name?: string;
  narration: string;
  created_at: string;
}

// Fuel Accounting Types
export interface FuelWallet {
  id: string;
  name: string; // e.g., 'BPCL', 'HPCL', 'IOCL'
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface FuelTransaction {
  id: string;
  type: 'wallet_credit' | 'fuel_allocation';
  wallet_name: string; // BPCL, HPCL, etc.
  amount: number;
  date: string;
  vehicle_no?: string; // For fuel allocation
  reference_id?: string;
  narration: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  vehicle_no: string;
  vehicle_type?: string; // Truck, Trailer, etc.
  owner_name?: string;
  driver_name?: string;
  driver_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleFuelExpense {
  id: string;
  vehicle_no: string;
  wallet_name: string;
  amount: number;
  date: string;
  fuel_quantity?: number;
  rate_per_liter?: number;
  odometer_reading?: number;
  narration?: string;
  created_at: string;
}