import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Filter, Download, Table, FileDown, Plus } from 'lucide-react';
import { useDataStore } from '../lib/store';
import { formatCurrency } from '../utils/numberGenerator';
import { apiService } from '../lib/api';

interface SupplierLedgerEntry {
  id: string;
  date: string;
  memoNo: string;
  tripDetails: string;
  credit: number;
  // Deduction Details
  freight: number;
  commission: number;
  mamool: number;
  detention: number;
  extra: number;
  rto: number;
  deduction: number;
  // Calculated Fields
  netAmount: number;
  debitPayment: number;
  debitAdvance: number;
  runningBalance: number;
  remarks: string;
  // Additional details for display
  showDetails?: boolean;
}

interface SupplierLedgerProps {
  selectedSupplier?: string;
  onNavigate?: (page: string, params?: any) => void;
}

const SupplierLedger: React.FC<SupplierLedgerProps> = ({ selectedSupplier, onNavigate }) => {
  const { memos, bankingEntries, cashbookEntries, loadingSlips, ledgerEntries: allLedgerEntries } = useDataStore();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [supplierFilter, setSupplierFilter] = useState(selectedSupplier || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [memoTypeFilter, setMemoTypeFilter] = useState<'all' | 'withDeductions' | 'withoutDeductions'>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showDebitNoteModal, setShowDebitNoteModal] = useState(false);
  const [debitNoteForm, setDebitNoteForm] = useState({
    amount: 0,
    narration: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    setStatusFilter('all');
    setMemoTypeFilter('all');
    setMinAmount('');
    setMaxAmount('');
  }, [supplierFilter]);

  // Get unique suppliers from memos
  const suppliers = useMemo(() => {
    console.log(`📊 Raw data check - Total memos: ${memos.length}, Total banking: ${bankingEntries.length}, Total cashbook: ${cashbookEntries.length}`);
    
    // Show sample data structure
    if (memos.length > 0) {
      console.log(`📋 Sample memo structure:`, Object.keys(memos[0]));
      console.log(`📋 Sample memo:`, memos[0]);
    }
    if (bankingEntries.length > 0) {
      console.log(`🏦 Sample banking entry structure:`, Object.keys(bankingEntries[0]));
      console.log(`🏦 Sample banking entry:`, bankingEntries[0]);
    }
    const supplierSet = new Set(memos.map(memo => memo.supplier));
    const supplierList = Array.from(supplierSet).sort();
    console.log(`👥 Available suppliers: ${supplierList.length}`, supplierList);
    return supplierList;
  }, [memos, bankingEntries, cashbookEntries]);

  // Generate ledger entries for selected supplier
  const supplierLedgerEntries = useMemo(() => {
    if (!supplierFilter) {
      console.log(`⚠️ No supplier selected, returning empty array`);
      return [];
    }

    console.log(`🔍 Generating ledger entries for supplier: ${supplierFilter}`);
    const entries: SupplierLedgerEntry[] = [];
    let runningBalance = 0;

    // Get all memos for the supplier
    const supplierMemos = memos
      .filter(memo => memo.supplier === supplierFilter)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log(`📋 Found ${supplierMemos.length} memos for supplier ${supplierFilter}:`, supplierMemos.map(m => m.memo_number));

    // Get all banking and cashbook entries for the supplier's memos and on account payments
    console.log(`🏦 Total banking entries available: ${bankingEntries.length}`);
    console.log(`🏦 Banking entry categories:`, [...new Set(bankingEntries.map(e => e.category))]);
    
    const supplierBankingEntries = bankingEntries
      .filter(entry => {
        // Include memo payments and advances
        if ((entry.category === 'memo_payment' || entry.category === 'memo_advance')) {
          const matchingMemo = supplierMemos.find(memo => memo.memo_number === entry.reference_id);
          if (matchingMemo) {
            console.log(`✅ Banking entry matched by memo: ${entry.reference_id}, category: ${entry.category}`);
            return true;
          } else {
            console.log(`❌ Banking entry memo not found: ${entry.reference_id}, available memos:`, supplierMemos.map(m => m.memo_number));
          }
        }
        // Include supplier on account payments
        if ((entry.category as any) === 'supplier_on_account' && entry.reference_name === supplierFilter) {
          console.log(`✅ Banking entry matched by supplier on account: ${entry.reference_name}`);
          return true;
        }
        // Include supplier debit notes
        if ((entry.category as any) === 'supplier_debit_note' && entry.reference_name === supplierFilter) {
          console.log(`✅ Banking entry matched by supplier debit note: ${entry.reference_name}`);
          return true;
        }
        return false;
      });

    // Get cashbook entries for supplier payments and on account
    console.log(`💰 Total cashbook entries available: ${cashbookEntries.length}`);
    console.log(`💰 Cashbook entry categories:`, [...new Set(cashbookEntries.map(e => e.category))]);
    
    const supplierCashbookEntries = cashbookEntries
      .filter(entry => {
        // Include supplier payments
        if (entry.category === 'supplier_payment' && entry.reference_name === supplierFilter) {
          console.log(`✅ Cashbook entry matched by supplier payment: ${entry.reference_name}`);
          return true;
        }
        // Include supplier on account payments
        if ((entry.category as any) === 'supplier_on_account' && entry.reference_name === supplierFilter) {
          console.log(`✅ Cashbook entry matched by supplier on account: ${entry.reference_name}`);
          return true;
        }
        return false;
      });

    // Combine all payment entries and sort by date
    const allPaymentEntries = [...supplierBankingEntries, ...supplierCashbookEntries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log(`💰 Found ${supplierBankingEntries.length} banking entries and ${supplierCashbookEntries.length} cashbook entries`);
    console.log(`💳 Total payment entries: ${allPaymentEntries.length}`);

    // Combine and sort all entries by date
    const allEntries: Array<{
      type: 'memo' | 'payment' | 'advance' | 'on_account' | 'debit_note' | 'fuel';
      date: string;
      data: any;
    }> = [];

    // Add memo entries
    supplierMemos.forEach(memo => {
      const loadingSlip = loadingSlips.find(ls => ls.id === memo.loading_slip_id);
      allEntries.push({
        type: 'memo',
        date: memo.date,
        data: { ...memo, loadingSlip }
      });
    });

    // Add payment entries (banking and cashbook)
    allPaymentEntries.forEach(entry => {
      let entryType: 'payment' | 'advance' | 'on_account' | 'debit_note' = 'payment';
      
      if (entry.category === 'memo_advance') {
        entryType = 'advance';
      } else if ((entry.category as any) === 'supplier_on_account') {
        entryType = 'on_account';
      } else if ((entry.category as any) === 'supplier_debit_note') {
        entryType = 'debit_note';
      }
      
      allEntries.push({
        type: entryType,
        date: entry.date,
        data: entry
      });
    });

    // Add fuel allocation ledger entries for this supplier
    const supplierFuelEntries = allLedgerEntries.filter(entry => 
      entry.ledger_type === 'supplier' && 
      entry.reference_name === supplierFilter &&
      entry.source_type === 'fuel'
    );
    
    supplierFuelEntries.forEach(entry => {
      allEntries.push({
        type: 'fuel',
        date: entry.date,
        data: entry
      });
    });

    // Sort by date
    allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Generate ledger entries
    allEntries.forEach(entry => {
      const memo = entry.type === 'memo' ? entry.data : 
        supplierMemos.find(m => m.memo_number === entry.data.reference_id);
      
      const loadingSlip = memo?.loadingSlip || loadingSlips.find(ls => ls.id === memo?.loading_slip_id);
      let tripDetails = loadingSlip ? 
        `${loadingSlip.from_location} – ${loadingSlip.to_location} / ${loadingSlip.vehicle_no}` : 
        memo?.loading_slip_id?.from_location ? 
        `${memo.loading_slip_id.from_location} – ${memo.loading_slip_id.to_location} / ${memo.loading_slip_id.vehicle_no}` : '';

      let freight = 0;
      let commission = 0;
      let mamool = 0;
      let detention = 0;
      let extra = 0;
      let rto = 0;
      let deduction = 0;
      let netAmount = 0;
      let debitPayment = 0;
      let debitAdvance = 0;
      let remarks = '';

      if (entry.type === 'memo') {
        // Store all deduction details
        freight = entry.data.freight || 0;
        commission = entry.data.commission || 0;
        mamool = entry.data.mamool || 0;
        detention = entry.data.detention || 0;
        extra = entry.data.extra || 0;
        rto = entry.data.rto || 0;
        deduction = entry.data.deduction || 0;
        
        // Use memo.net_amount (includes deduction) as authoritative net amount
        netAmount = entry.data.net_amount || (freight - commission - mamool + detention + extra + rto - deduction);
        
        console.log(`📊 Supplier memo calculation - Freight: ${freight}, Commission: ${commission}, Mamool: ${mamool}, Detention: ${detention}, Extra: ${extra}, RTO: ${rto}, Net Amount: ${netAmount}`);
        
        // Check if there was an advance for this memo
        const memoAdvances = allPaymentEntries.filter(be => 
          be.category === 'memo_advance' && be.reference_id === entry.data.memo_number
        );
        const totalAdvance = memoAdvances.reduce((sum, adv) => sum + adv.amount, 0);
        debitAdvance = totalAdvance;
        
        // Update running balance
        runningBalance += netAmount - debitAdvance;
        remarks = totalAdvance > 0 ? 'Memo Created (Advance Paid)' : 'Memo Created';
      } else if (entry.type === 'payment') {
        debitPayment = entry.data.amount;
        
        // Deduct payment from running balance
        runningBalance -= debitPayment;
        remarks = entry.data.narration || 'Payment to Supplier';
      } else if (entry.type === 'advance') {
        // Advance is already accounted for in memo creation
        return;
      } else if (entry.type === 'on_account') {
        debitPayment = entry.data.amount;
        
        // Deduct on account payment from running balance
        runningBalance -= debitPayment;
        remarks = entry.data.narration || 'On Account Payment';
      } else if (entry.type === 'debit_note') {
        debitPayment = entry.data.amount;
        
        // Deduct debit note from running balance (reduces what we owe supplier)
        runningBalance -= debitPayment;
        remarks = `Debit Note - ${entry.data.narration || 'Adjustment'}`;
      } else if (entry.type === 'fuel') {
        debitPayment = entry.data.debit || 0;
        
        // Deduct fuel allocation from running balance
        runningBalance -= debitPayment;
        remarks = entry.data.description || 'Fuel Being Allocated';
        tripDetails = entry.data.vehicle_no || '';
      }

      entries.push({
        id: entry.data.id || entry.data._id || `${entry.type}-${entry.date}-${Date.now()}-${Math.random()}`,
        date: entry.date,
        memoNo: memo?.memo_number || '',
        tripDetails,
        // Deduction Details
        freight,
        commission,
        mamool,
        detention,
        extra,
        rto,
        deduction,
        // Calculated Fields
        netAmount,
        credit: netAmount,
        debitPayment,
        debitAdvance,
        runningBalance,
        remarks,
        showDetails: false
      });
    });

    console.log(`📊 Generated ${entries.length} total ledger entries for supplier ${supplierFilter}`);
    
    // Summary debug info
    console.log(`🎯 SUPPLIER LEDGER DEBUG SUMMARY:`);
    console.log(`   - Supplier: ${supplierFilter}`);
    console.log(`   - Memos found: ${supplierMemos.length}`);
    console.log(`   - Banking entries: ${supplierBankingEntries.length}`);
    console.log(`   - Cashbook entries: ${supplierCashbookEntries.length}`);
    console.log(`   - Total ledger entries generated: ${entries.length}`);
    
    return entries;
  }, [supplierFilter, memos, bankingEntries, cashbookEntries, loadingSlips, allLedgerEntries]);

  // Filter by date range
  const filteredEntries = useMemo(() => {
    let filtered = supplierLedgerEntries;

    if (dateFrom) {
      filtered = filtered.filter(entry => entry.date >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter(entry => entry.date <= dateTo);
    }

    if (statusFilter === 'paid') {
      filtered = filtered.filter(entry => entry.debitPayment > 0);
    } else if (statusFilter === 'unpaid') {
      filtered = filtered.filter(entry => entry.debitPayment <= 0);
    }

    if (memoTypeFilter === 'withDeductions') {
      filtered = filtered.filter(entry =>
        entry.commission > 0 ||
        entry.mamool > 0 ||
        entry.detention > 0 ||
        entry.extra > 0 ||
        entry.rto > 0
      );
    } else if (memoTypeFilter === 'withoutDeductions') {
      filtered = filtered.filter(entry =>
        entry.commission === 0 &&
        entry.mamool === 0 &&
        entry.detention === 0 &&
        entry.extra === 0 &&
        entry.rto === 0
      );
    }

    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!Number.isNaN(min)) {
        filtered = filtered.filter(entry => entry.netAmount >= min);
      }
    }

    if (maxAmount) {
      const max = parseFloat(maxAmount);
      if (!Number.isNaN(max)) {
        filtered = filtered.filter(entry => entry.netAmount <= max);
      }
    }

    console.log(`🔍 After date filtering: ${filtered.length} entries (from ${supplierLedgerEntries.length} total)`);
    return filtered;
  }, [supplierLedgerEntries, dateFrom, dateTo, statusFilter, memoTypeFilter, minAmount, maxAmount]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredEntries.reduce((acc, entry) => ({
      credit: acc.credit + (entry.netAmount || 0),
      freight: acc.freight + (entry.freight || 0),
      commission: acc.commission + (entry.commission || 0),
      mamool: acc.mamool + (entry.mamool || 0),
      detention: acc.detention + (entry.detention || 0),
      extra: acc.extra + (entry.extra || 0),
      extraWeight: acc.extraWeight + (entry.extra || 0),
      rto: acc.rto + (entry.rto || 0),
      netAmount: acc.netAmount + (entry.netAmount || 0),
      debitPayment: acc.debitPayment + (entry.debitPayment || 0),
      debitAdvance: acc.debitAdvance + (entry.debitAdvance || 0),
    }), { 
      credit: 0,
      freight: 0, 
      commission: 0, 
      mamool: 0, 
      detention: 0, 
      extra: 0, 
      extraWeight: 0,
      rto: 0, 
      netAmount: 0, 
      debitPayment: 0, 
      debitAdvance: 0 
    });
  }, [filteredEntries]);

  const finalBalance = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].runningBalance : 0;
  const hasAdvancedFilters =
    statusFilter !== 'all' ||
    memoTypeFilter !== 'all' ||
    minAmount !== '' ||
    maxAmount !== '';
  
  // Toggle details for a specific entry
  const toggleDetails = (id: string) => {
    const updatedEntries = supplierLedgerEntries.map(entry => 
      entry.id === id ? { ...entry, showDetails: !entry.showDetails } : entry
    );
    // Update the entries in the parent component if needed
    // This is a simplified version - you might need to adjust based on your state management
    if (onNavigate) {
      onNavigate('supplier-ledger', { 
        entries: updatedEntries,
        selectedSupplier: supplierFilter 
      });
    }
  };

  const handleCreateDebitNote = async () => {
    if (!supplierFilter) {
      alert('Please select a supplier first');
      return;
    }

    if (!debitNoteForm.amount || debitNoteForm.amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!debitNoteForm.narration.trim()) {
      alert('Please enter a narration for the debit note');
      return;
    }

    try {
      const debitNoteData = {
        supplier_name: supplierFilter,
        amount: debitNoteForm.amount,
        date: debitNoteForm.date,
        narration: debitNoteForm.narration
      };

      console.log('🔄 Creating supplier debit note (ledger only):', debitNoteData);
      const response = await apiService.createSupplierDebitNote(debitNoteData);
      console.log('✅ Supplier debit note created in backend:', response.ledgerEntry);
      
      // No banking entry is created - only ledger entry
      // The ledger will be refreshed automatically by the sync system
      
      // Reset form and close modal
      setDebitNoteForm({
        amount: 0,
        narration: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowDebitNoteModal(false);
      
      alert(`Debit note of ₹${debitNoteForm.amount.toLocaleString('en-IN')} created successfully for ${supplierFilter}`);
    } catch (error) {
      console.error('Failed to create debit note:', error);
      alert('Failed to create debit note. Please try again.');
    }
  };

  const exportToCSV = () => {
    if (!filteredEntries.length) return;

    const headers = [
      'Date', 
      'Memo No', 
      'Trip Details', 
      'Freight (₹)',
      '(-) Commission (₹)',
      '(-) Mamool (₹)',
      '(+) Detention (₹)',
      '(+) Extra (₹)',
      '(+) RTO (₹)',
      '= Net Amount (₹)',
      'Debit - Payment (₹)',
      'Running Balance (₹)', 
      'Remarks'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredEntries.flatMap(entry => {
        const mainRow = [
          entry.date,
          entry.memoNo,
          `"${entry.tripDetails}"`,
          entry.freight,
          -entry.commission,
          -entry.mamool,
          entry.detention,
          entry.extra,
          entry.rto,
          entry.netAmount,
          entry.debitPayment,
          entry.runningBalance,
          `"${entry.remarks}"`
        ].join(',');
        
        // Add a detail row if it's a memo entry with deductions
        if (entry.memoNo && (entry.commission > 0 || entry.mamool > 0 || entry.detention > 0 || entry.extra > 0 || entry.rto > 0)) {
          const detailRow = [
            '', // Empty date
            '', // Empty memo no
            'DETAILS:', // Indicate this is a detail row
            `Freight: ${entry.freight.toLocaleString('en-IN')}`,
            `Commission: -${entry.commission.toLocaleString('en-IN')}`,
            `Mamool: -${entry.mamool.toLocaleString('en-IN')}`,
            `Detention: +${entry.detention.toLocaleString('en-IN')}`,
            `Extra: +${entry.extra.toLocaleString('en-IN')}`,
            `RTO: +${entry.rto.toLocaleString('en-IN')}`,
            `Net: ${entry.netAmount.toLocaleString('en-IN')}`,
            '', // Empty debit payment
            '', // Empty running balance
            ''  // Empty remarks
          ].join(',');
          
          return [mainRow, detailRow];
        }
        
        return [mainRow];
      }).flat()
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-ledger-${supplierFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    if (!filteredEntries.length || !supplierFilter) {
      alert('Please select a supplier and ensure there are entries to export.');
      return;
    }

    try {
      console.log('🔄 Starting Professional Supplier Ledger PDF export...');
      
      const { generateProfessionalLedgerPDF, testLibraries } = await import('../utils/simpleProfessionalLedgerPdf');
      
      // Test libraries first
      console.log('🧪 Testing libraries before PDF generation...');
      const librariesWork = testLibraries();
      if (!librariesWork) {
        throw new Error('Required libraries (jsPDF, XLSX) are not working properly');
      }
      
      // Calculate current balance (last entry's running balance)
      const currentBalance = filteredEntries.length > 0 
        ? filteredEntries[filteredEntries.length - 1].runningBalance 
        : 0;
      
      await generateProfessionalLedgerPDF({
        type: 'SUPPLIER',
        name: supplierFilter,
        entries: filteredEntries,
        totals: totals,
        dateRange: {
          from: dateFrom,
          to: dateTo
        },
        currentBalance: currentBalance
      });
      
      console.log('✅ Professional Supplier Ledger PDF generated successfully');
    } catch (error: any) {
      console.error('❌ Failed to generate Supplier Ledger PDF:', error);
      alert(`Failed to generate PDF: ${error?.message || 'Unknown error'}. Please check the console for details.`);
    }
  };
  
  const exportToExcel = async () => {
    if (!filteredEntries.length || !supplierFilter) {
      alert('Please select a supplier and ensure there are entries to export.');
      return;
    }

    try {
      console.log('🔄 Starting Supplier Ledger Excel export...');
      
      const { exportLedgerToExcel, testLibraries } = await import('../utils/simpleProfessionalLedgerPdf');
      
      // Test libraries first
      console.log('🧪 Testing libraries before Excel export...');
      const librariesWork = testLibraries();
      if (!librariesWork) {
        throw new Error('Required libraries (jsPDF, XLSX) are not working properly');
      }
      
      // Calculate current balance
      const currentBalance = filteredEntries.length > 0 
        ? filteredEntries[filteredEntries.length - 1].runningBalance 
        : 0;
      
      await exportLedgerToExcel({
        type: 'SUPPLIER',
        name: supplierFilter,
        entries: filteredEntries,
        totals: totals,
        dateRange: {
          from: dateFrom,
          to: dateTo
        },
        currentBalance: currentBalance
      });
      
      console.log('✅ Supplier Ledger Excel exported successfully');
    } catch (error: any) {
      console.error('❌ Failed to export Excel:', error);
      alert(`Failed to export Excel: ${error?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Truck className="w-8 h-8 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supplier Ledger</h1>
            <p className="text-gray-600">Track supplier memos, payments, and advances</p>
          </div>
        </div>
        
        {supplierFilter && (
          <button
            onClick={() => setShowDebitNoteModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Debit Note</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Supplier
            </label>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Select Supplier</option>
              {suppliers.map(supplier => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={exportToCSV}
              disabled={!filteredEntries.length}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
            <button
              onClick={exportToPDF}
              disabled={!filteredEntries.length}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <FileDown className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={exportToExcel}
              disabled={!filteredEntries.length}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Table className="w-4 h-4" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 text-gray-400" />
            <span>More Filters</span>
            {hasAdvancedFilters && (
              <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
            )}
          </button>

          {hasAdvancedFilters && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setMemoTypeFilter('all');
                setMinAmount('');
                setMaxAmount('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear advanced filters
            </button>
          )}
        </div>

        {showAdvancedFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All entries</option>
                <option value="paid">Payments only</option>
                <option value="unpaid">Non-payment entries</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Memo Type
              </label>
              <select
                value={memoTypeFilter}
                onChange={e => setMemoTypeFilter(e.target.value as 'all' | 'withDeductions' | 'withoutDeductions')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All memos</option>
                <option value="withDeductions">With deductions</option>
                <option value="withoutDeductions">Without deductions</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Amount (₹)
                </label>
                <input
                  type="number"
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Min"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Amount (₹)
                </label>
                <input
                  type="number"
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {supplierFilter && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-600 font-medium">Total Memos</div>
            <div className="text-2xl font-bold text-orange-900">{formatCurrency(totals.credit)}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-600 font-medium">Detention</div>
            <div className="text-2xl font-bold text-purple-900">{formatCurrency(totals.detention)}</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <div className="text-sm text-indigo-600 font-medium">Extra Weight</div>
            <div className="text-2xl font-bold text-indigo-900">{formatCurrency(totals.extraWeight)}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-600 font-medium">Total Payments</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(totals.debitPayment)}</div>
          </div>
          <div className={`p-4 rounded-lg border ${finalBalance >= 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className={`text-sm font-medium ${finalBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              Outstanding Balance
            </div>
            <div className={`text-2xl font-bold ${finalBalance >= 0 ? 'text-red-900' : 'text-green-900'}`}>
              {formatCurrency(Math.abs(finalBalance))}
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      {supplierFilter ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Ledger for {supplierFilter}
            </h3>
          </div>
          
          {(() => {
            console.log(`🎯 Table rendering check - filteredEntries.length: ${filteredEntries.length}`);
            return filteredEntries.length > 0;
          })() ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 border">Date</th>
                    <th className="px-4 py-2 border">Memo No</th>
                    <th className="px-4 py-2 border">Trip Details</th>
                    <th className="px-4 py-2 border">Freight (₹)</th>
                    <th className="px-4 py-2 border">(-) Commission</th>
                    <th className="px-4 py-2 border">(-) Mamool</th>
                    <th className="px-4 py-2 border">(+) Detention</th>
                    <th className="px-4 py-2 border">(+) Extra</th>
                    <th className="px-4 py-2 border">(+) RTO</th>
                    <th className="px-4 py-2 border bg-green-50">= Net Amount (₹)</th>
                    <th className="px-4 py-2 border bg-red-50">Debit - Payment (₹)</th>
                    <th className="px-4 py-2 border bg-blue-50">Running Balance (₹)</th>
                    <th className="px-4 py-2 border">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEntries.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleDetails(entry.id)}>
                        <td className="px-4 py-2 border">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 border font-medium">{entry.memoNo}</td>
                        <td className="px-4 py-2 border">
                          <div className="flex items-center">
                            <span className="mr-2">{entry.tripDetails}</span>
                            {(entry.commission > 0 || entry.mamool > 0 || entry.detention > 0 || entry.extra > 0 || entry.rto > 0) && (
                              <span className="text-blue-600 text-xs">▼</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 border text-right">{entry.freight.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 border text-right text-red-600">
                          {entry.commission > 0 ? `-${entry.commission.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="px-4 py-2 border text-right text-red-600">
                          {entry.mamool > 0 ? `-${entry.mamool.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="px-4 py-2 border text-right text-green-600">
                          {entry.detention > 0 ? `+${entry.detention.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="px-4 py-2 border text-right text-green-600">
                          {entry.extra > 0 ? `+${entry.extra.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="px-4 py-2 border text-right text-green-600">
                          {entry.rto > 0 ? `+${entry.rto.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="px-4 py-2 border text-right bg-green-50 font-medium">
                          {entry.netAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2 border text-right bg-red-50">
                          {entry.debitPayment > 0 ? entry.debitPayment.toLocaleString('en-IN') : '-'}
                        </td>
                        <td className="px-4 py-2 border text-right bg-blue-50 font-medium">
                          {entry.runningBalance.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2 border">{entry.remarks}</td>
                      </tr>
                      
                      {/* Deduction Details Row */}
                      {entry.showDetails && (entry.commission > 0 || entry.mamool > 0 || entry.detention > 0 || entry.extra > 0 || entry.rto > 0) && (
                        <tr className="bg-gray-50 text-sm">
                          <td colSpan={14} className="px-4 py-2 border">
                            <div className="grid grid-cols-5 gap-2">
                              <div className="col-span-1">
                                <div className="font-medium">Freight:</div>
                                <div className="text-green-600">₹{entry.freight.toLocaleString('en-IN')}</div>
                              </div>
                              {entry.commission > 0 && (
                                <div className="col-span-1">
                                  <div className="font-medium">(-) Commission:</div>
                                  <div className="text-red-600">-₹{entry.commission.toLocaleString('en-IN')}</div>
                                </div>
                              )}
                              {entry.mamool > 0 && (
                                <div className="col-span-1">
                                  <div className="font-medium">(-) Mamool:</div>
                                  <div className="text-red-600">-₹{entry.mamool.toLocaleString('en-IN')}</div>
                                </div>
                              )}
                              {entry.detention > 0 && (
                                <div className="col-span-1">
                                  <div className="font-medium">(+) Detention:</div>
                                  <div className="text-green-600">+₹{entry.detention.toLocaleString('en-IN')}</div>
                                </div>
                              )}
                              {entry.extra > 0 && (
                                <div className="col-span-1">
                                  <div className="font-medium">(+) Extra:</div>
                                  <div className="text-green-600">+₹{entry.extra.toLocaleString('en-IN')}</div>
                                </div>
                              )}
                              {entry.rto > 0 && (
                                <div className="col-span-1">
                                  <div className="font-medium">(+) RTO:</div>
                                  <div className="text-green-600">+₹{entry.rto.toLocaleString('en-IN')}</div>
                                </div>
                              )}
                              <div className="col-span-1">
                                <div className="font-medium">= Net Amount:</div>
                                <div className="font-bold">₹{entry.netAmount.toLocaleString('en-IN')}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-sm font-bold text-gray-900">Total</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-purple-600">
                      {totals.detention.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-indigo-600">
                      {totals.extra.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                      {totals.credit.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                      {totals.debitPayment.toLocaleString('en-IN')}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                      finalBalance >= 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {finalBalance.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Table className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No ledger entries found for the selected criteria</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Supplier</h3>
          <p className="text-gray-500">Choose a supplier from the dropdown to view their ledger</p>
        </div>
      )}

      {/* Debit Note Modal */}
      {showDebitNoteModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create Debit Note for {supplierFilter}</h3>
              <button onClick={() => setShowDebitNoteModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={debitNoteForm.amount || ''}
                  onChange={(e) => setDebitNoteForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={debitNoteForm.date}
                  onChange={(e) => setDebitNoteForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Narration
                </label>
                <textarea
                  value={debitNoteForm.narration}
                  onChange={(e) => setDebitNoteForm(prev => ({ ...prev, narration: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter reason for debit note (e.g., Quality issues, Delivery delay, etc.)"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCreateDebitNote}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Create Debit Note
                </button>
                <button
                  onClick={() => setShowDebitNoteModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierLedger;
