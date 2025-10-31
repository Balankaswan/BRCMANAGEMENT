import React, { useState, useMemo } from 'react';
import { Filter, Download, FileText, Table, FileDown, ExternalLink, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useDataStore } from '../lib/store';
import { formatCurrency } from '../utils/numberGenerator';
import { apiService } from '../lib/api';
import type { Memo } from '../types';

interface PartyLedgerEntry {
  id: string;
  date: string;
  billNo: string;
  tripDetails: string;
  credit: number;
  debitPayment: number;
  debitAdvance: number;
  runningBalance: number;
  remarks: string;
}

interface PartyLedgerProps {
  selectedParty?: string;
  onNavigate?: (page: string, params?: any) => void;
}

const PartyLedger: React.FC<PartyLedgerProps> = ({ selectedParty, onNavigate }) => {
  const { bills, bankingEntries, loadingSlips } = useDataStore();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [partyFilter, setPartyFilter] = useState(selectedParty || '');
  const [viewMemo, setViewMemo] = useState<Memo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDebitNoteModal, setShowDebitNoteModal] = useState(false);
  const [debitNoteForm, setDebitNoteForm] = useState({
    amount: 0,
    narration: '',
    date: new Date().toISOString().split('T')[0]
  });
  const entriesPerPage = 50;

  // Reset to first page when party changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [partyFilter]);

  // Function to handle bill number click - navigate to Bills page
  const handleBillClick = (billNumber: string) => {
    if (onNavigate) {
      onNavigate('bills', { highlight: billNumber });
    }
  };

  // Function to handle memo number click - navigate to Memos page
  const handleMemoClick = (memoNumber: string) => {
    if (onNavigate) {
      onNavigate('memo', { highlight: memoNumber });
    }
  };

  // Get unique parties from bills
  const parties = useMemo(() => {
    const partySet = new Set(bills.map(bill => bill.party));
    return Array.from(partySet).sort();
  }, [bills]);

  // Calculate total outstanding across all parties
  const totalOutstanding = useMemo(() => {
    let total = 0;
    
    parties.forEach(party => {
      // Get all bills for this party
      const partyBills = bills
        .filter(bill => bill.party === party)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Get all banking entries for this party
      const partyBankingEntries = bankingEntries
        .filter(entry => {
          // Include bill payments and advances linked to party bills
          if ((entry.category === 'bill_payment' || entry.category === 'bill_advance') &&
              partyBills.some(bill => bill.bill_number === entry.reference_id)) {
            return true;
          }
          // Include party on account transactions
          if (entry.category === 'party_on_account' && entry.reference_name === party) {
            return true;
          }
          // Include party debit notes
          if (entry.category === 'party_debit_note' && entry.reference_name === party) {
            return true;
          }
          return false;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance for this party
      let runningBalance = 0;
      const allEntries: Array<{
        type: 'bill' | 'payment' | 'advance' | 'on_account' | 'debit_note';
        date: string;
        data: any;
      }> = [];

      // Add bills
      partyBills.forEach(bill => {
        allEntries.push({ type: 'bill', date: bill.date, data: bill });
      });

      // Add banking entries
      partyBankingEntries.forEach(entry => {
        if (entry.category === 'bill_payment') {
          allEntries.push({ type: 'payment', date: entry.date, data: entry });
        } else if (entry.category === 'bill_advance') {
          allEntries.push({ type: 'advance', date: entry.date, data: entry });
        } else if (entry.category === 'party_on_account') {
          allEntries.push({ type: 'on_account', date: entry.date, data: entry });
        } else if (entry.category === 'party_debit_note') {
          allEntries.push({ type: 'debit_note', date: entry.date, data: entry });
        }
      });

      // Sort all entries by date
      allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate final balance for this party
      allEntries.forEach(entry => {
        if (entry.type === 'bill') {
          const bill = entry.data;
          const billAmount = (bill.bill_amount || 0) - (bill.mamool || 0) - (bill.commission || 0) + 
                           (bill.detention || 0) + (bill.rto || 0) + (bill.extra || 0) - 
                           (bill.tds || 0) - (bill.penalties || 0);
          runningBalance += billAmount;
        } else if (entry.type === 'payment') {
          runningBalance -= entry.data.amount;
        } else if (entry.type === 'advance') {
          runningBalance -= entry.data.amount;
        } else if (entry.type === 'on_account') {
          runningBalance -= entry.data.amount;
        } else if (entry.type === 'debit_note') {
          runningBalance += entry.data.amount;
        }
      });

      // Add this party's outstanding balance to total (only positive balances)
      if (runningBalance > 0) {
        total += runningBalance;
      }
    });
    
    return total;
  }, [parties, bills, bankingEntries]);

  // Generate ledger entries for selected party
  const ledgerEntries = useMemo(() => {
    if (!partyFilter) return [];

    const entries: PartyLedgerEntry[] = [];
    let runningBalance = 0;

    // Get all bills for the party
    const partyBills = bills
      .filter(bill => bill.party === partyFilter)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get all banking entries for the party (bills, on account, and debit notes)
    const partyBankingEntries = bankingEntries
      .filter(entry => {
        // Include bill payments and advances linked to party bills
        if ((entry.category === 'bill_payment' || entry.category === 'bill_advance') &&
            partyBills.some(bill => bill.bill_number === entry.reference_id)) {
          return true;
        }
        // Include party on account transactions
        if (entry.category === 'party_on_account' && entry.reference_name === partyFilter) {
          return true;
        }
        // Include party debit notes
        if (entry.category === 'party_debit_note' && entry.reference_name === partyFilter) {
          return true;
        }
        return false;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Combine and sort all entries by date
    const allEntries: Array<{
      type: 'bill' | 'payment' | 'advance' | 'on_account' | 'debit_note';
      date: string;
      data: any;
    }> = [];

    // Add bill entries
    partyBills.forEach(bill => {
      const loadingSlip = loadingSlips.find(ls => ls.id === bill.loading_slip_id);
      allEntries.push({
        type: 'bill',
        date: bill.date,
        data: { ...bill, loadingSlip }
      });
    });

    // Add banking entries
    partyBankingEntries.forEach(entry => {
      let entryType: 'payment' | 'advance' | 'on_account' | 'debit_note' = 'payment';
      if (entry.category === 'bill_advance') {
        entryType = 'advance';
      } else if (entry.category === 'party_on_account') {
        entryType = 'on_account';
      } else if (entry.category === 'party_debit_note') {
        entryType = 'debit_note';
      }
      
      allEntries.push({
        type: entryType,
        date: entry.date,
        data: entry
      });
    });

    // Sort by date
    allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Generate ledger entries
    allEntries.forEach(entry => {
      const bill = entry.type === 'bill' ? entry.data : 
        partyBills.find(b => b.bill_number === entry.data.reference_id);
      
      const loadingSlip = bill?.loadingSlip || loadingSlips.find(ls => ls.id === bill?.loading_slip_id);
      const tripDetails = loadingSlip ? 
        `${loadingSlip.from_location} – ${loadingSlip.to_location} / ${loadingSlip.vehicle_no}` : 
        bill?.loading_slip_id?.from_location ? 
        `${bill.loading_slip_id.from_location} – ${bill.loading_slip_id.to_location} / ${bill.loading_slip_id.vehicle_no}` : '';

      let credit = 0;
      let debitPayment = 0;
      let debitAdvance = 0;
      let remarks = '';

      if (entry.type === 'bill') {
        // Calculate net bill amount including detention, extra, RTO minus deductions
        credit = entry.data.bill_amount + (entry.data.detention || 0) + (entry.data.extra || 0) + (entry.data.rto || 0) - (entry.data.mamool || 0) - (entry.data.penalties || 0) - (entry.data.tds || 0);
        // Check if there was an advance for this bill
        const billAdvances = partyBankingEntries.filter(be => 
          be.category === 'bill_advance' && be.reference_id === entry.data.bill_number
        );
        const totalAdvance = billAdvances.reduce((sum, adv) => sum + adv.amount, 0);
        debitAdvance = totalAdvance;
        runningBalance += credit - debitAdvance;
        remarks = totalAdvance > 0 ? 'Bill Created (Advance Received)' : 'Bill Created';
      } else if (entry.type === 'payment') {
        debitPayment = entry.data.amount;
        runningBalance -= debitPayment;
        remarks = 'Payment Received';
      } else if (entry.type === 'advance') {
        // Advance is already accounted for in bill creation
        return;
      } else if (entry.type === 'on_account') {
        debitPayment = entry.data.amount;
        runningBalance -= debitPayment;
        remarks = 'On Account Payment Received';
      } else if (entry.type === 'debit_note') {
        debitPayment = entry.data.amount;
        runningBalance -= debitPayment;
        remarks = `Debit Note - ${entry.data.narration || 'Adjustment'}`;
      }

      entries.push({
        id: entry.data.id || `${entry.type}-${entry.date}-${Date.now()}-${Math.random()}`,
        date: entry.date,
        billNo: bill?.bill_number || '',
        tripDetails,
        credit,
        debitPayment,
        debitAdvance,
        runningBalance,
        remarks
      });
    });

    return entries;
  }, [partyFilter, bills, bankingEntries, loadingSlips]);

  // Filter by date range
  const filteredEntries = useMemo(() => {
    let filtered = ledgerEntries;

    if (dateFrom) {
      filtered = filtered.filter(entry => entry.date >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter(entry => entry.date <= dateTo);
    }

    return filtered;
  }, [ledgerEntries, dateFrom, dateTo]);

  // Pagination logic
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredEntries.reduce((acc, entry) => ({
      credit: acc.credit + entry.credit,
      debitPayment: acc.debitPayment + entry.debitPayment,
      debitAdvance: acc.debitAdvance + entry.debitAdvance,
    }), { credit: 0, debitPayment: 0, debitAdvance: 0 });
  }, [filteredEntries]);

  const finalBalance = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].runningBalance : 0;

  // Debug logging for BRC INFRA specifically
  React.useEffect(() => {
    if (partyFilter === 'BRC INFRA' && filteredEntries.length > 0) {
      console.log(`🔍 PartyLedger Debug for ${partyFilter}:`, {
        totalEntries: filteredEntries.length,
        finalBalance: finalBalance,
        totals: totals,
        lastEntry: filteredEntries[filteredEntries.length - 1]
      });
    }
  }, [partyFilter, filteredEntries, finalBalance, totals]);

  const exportToCSV = () => {
    if (!filteredEntries.length) return;

    const headers = ['Date', 'Bill No', 'Trip Details', 'Credit (₹)', 'Debit - Payment (₹)', 'Debit - Advance (₹)', 'Running Balance (₹)', 'Remarks'];
    const csvContent = [
      headers.join(','),
      ...filteredEntries.map(entry => [
        entry.date,
        entry.billNo,
        `"${entry.tripDetails}"`,
        entry.credit,
        entry.debitPayment,
        entry.debitAdvance,
        entry.runningBalance,
        `"${entry.remarks}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `party-ledger-${partyFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    if (!filteredEntries.length || !partyFilter) {
      alert('Please select a party and ensure there are entries to export.');
      return;
    }

    try {
      console.log('🔄 Starting Professional Party Ledger PDF export...');
      
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
        type: 'PARTY',
        name: partyFilter,
        entries: filteredEntries,
        totals: totals,
        dateRange: {
          from: dateFrom,
          to: dateTo
        },
        currentBalance: currentBalance
      });
      
      console.log('✅ Professional Party Ledger PDF generated successfully');
    } catch (error: any) {
      console.error('❌ Failed to generate Party Ledger PDF:', error);
      alert(`Failed to generate PDF: ${error?.message || 'Unknown error'}. Please check the console for details.`);
    }
  };
  
  const exportToExcel = async () => {
    if (!filteredEntries.length || !partyFilter) {
      alert('Please select a party and ensure there are entries to export.');
      return;
    }

    try {
      console.log('🔄 Starting Party Ledger Excel export...');
      
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
        type: 'PARTY',
        name: partyFilter,
        entries: filteredEntries,
        totals: totals,
        dateRange: {
          from: dateFrom,
          to: dateTo
        },
        currentBalance: currentBalance
      });
      
      console.log('✅ Party Ledger Excel exported successfully');
    } catch (error: any) {
      console.error('❌ Failed to export Excel:', error);
      alert(`Failed to export Excel: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleCreateDebitNote = async () => {
    if (!partyFilter) {
      alert('Please select a party first');
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
        party_name: partyFilter,
        amount: debitNoteForm.amount,
        date: debitNoteForm.date,
        narration: debitNoteForm.narration
      };

      console.log('🔄 Creating party debit note (ledger only):', debitNoteData);
      const response = await apiService.createPartyDebitNote(debitNoteData);
      console.log('✅ Party debit note created in backend:', response.ledgerEntry);
      
      // No banking entry is created - only ledger entry
      // The ledger will be refreshed automatically by the sync system
      
      // Reset form and close modal
      setDebitNoteForm({
        amount: 0,
        narration: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowDebitNoteModal(false);
      
      alert(`Debit note of ₹${debitNoteForm.amount.toLocaleString('en-IN')} created successfully for ${partyFilter}`);
    } catch (error) {
      console.error('Failed to create debit note:', error);
      alert('Failed to create debit note. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Party Ledger</h1>
            <p className="text-gray-600">Track customer bills, payments, and advances</p>
          </div>
        </div>
        
        {partyFilter && (
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
              Select Party
            </label>
            <select
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Party</option>
              {parties.map(party => (
                <option key={party} value={party}>{party}</option>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      </div>

      {/* Total Outstanding Card - Always Visible */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl shadow-sm border border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-red-600 font-medium uppercase tracking-wide">Total Outstanding</div>
            <div className="text-3xl font-bold text-red-900 mt-1">{formatCurrency(totalOutstanding)}</div>
            <div className="text-sm text-red-600 mt-1">Across all parties</div>
          </div>
          <div className="bg-red-100 p-3 rounded-full">
            <FileText className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {partyFilter && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">Total Bills</div>
            <div className="text-2xl font-bold text-blue-900">{formatCurrency(totals.credit)}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-600 font-medium">Total Payments</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(totals.debitPayment)}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-sm text-yellow-600 font-medium">Total Advances</div>
            <div className="text-2xl font-bold text-yellow-900">{formatCurrency(totals.debitAdvance)}</div>
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
      {partyFilter ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Ledger for {partyFilter}
            </h3>
          </div>
          
          {filteredEntries.length > 0 ? (
            <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip Details</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit (₹)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit - Payment (₹)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit - Advance (₹)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Running Balance (₹)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedEntries.map((entry, index) => (
                    <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {entry.billNo ? (
                          <button
                            onClick={() => {
                              // Check if it's a memo number (starts with MO-) or bill number
                              if (entry.billNo.startsWith('MO-')) {
                                handleMemoClick(entry.billNo);
                              } else {
                                handleBillClick(entry.billNo);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors flex items-center gap-1"
                            title={`Click to view ${entry.billNo.startsWith('MO-') ? 'memo' : 'bill'} details`}
                          >
                            {entry.billNo}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {entry.tripDetails}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-medium">
                        {entry.debitPayment > 0 ? formatCurrency(entry.debitPayment) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-yellow-600 font-medium">
                        {entry.debitAdvance > 0 ? formatCurrency(entry.debitAdvance) : '—'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                        entry.runningBalance >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(Math.abs(entry.runningBalance))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {entry.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-sm font-bold text-gray-900">Total</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                      {formatCurrency(totals.credit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                      {formatCurrency(totals.debitPayment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-yellow-600">
                      {formatCurrency(totals.debitAdvance)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                      finalBalance >= 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(Math.abs(finalBalance))}
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredEntries.length)} of {filteredEntries.length} entries
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = currentPage <= 3 ? i + 1 :
                                      currentPage >= totalPages - 2 ? totalPages - 4 + i :
                                      currentPage - 2 + i;
                      
                      if (pageNum < 1 || pageNum > totalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm font-medium rounded-md ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="px-6 py-12 text-center">
              <Table className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No ledger entries found for the selected criteria</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Party</h3>
          <p className="text-gray-500">Choose a party from the dropdown to view their ledger</p>
        </div>
      )}


      {/* Debit Note Modal */}
      {showDebitNoteModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create Debit Note for {partyFilter}</h3>
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
                  placeholder="Enter reason for debit note (e.g., Penalty, Damage charges, etc.)"
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

      {/* Memo Detail Modal */}
      {viewMemo && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Memo #{viewMemo.memo_number}</h3>
              <button onClick={() => setViewMemo(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Date:</span> {new Date(viewMemo.date).toLocaleDateString('en-IN')}</div>
              <div><span className="text-gray-500">Supplier:</span> {viewMemo.supplier}</div>
              <div><span className="text-gray-500">Freight:</span> {formatCurrency(viewMemo.freight)}</div>
              <div><span className="text-gray-500">Commission:</span> {formatCurrency(viewMemo.commission)}</div>
              <div><span className="text-gray-500">Mamool:</span> {formatCurrency(viewMemo.mamool)}</div>
              <div><span className="text-gray-500">Detention:</span> {formatCurrency(viewMemo.detention)}</div>
              <div><span className="text-gray-500">Extra:</span> {formatCurrency(viewMemo.extra)}</div>
              <div><span className="text-gray-500">RTO:</span> {formatCurrency(viewMemo.rto)}</div>
              <div className="col-span-2"><span className="text-gray-500">Net Amount:</span> {formatCurrency(viewMemo.net_amount)}</div>
              {viewMemo.narration && (
                <div className="col-span-2">
                  <span className="text-gray-500">Narration:</span>
                  <p className="mt-1 text-gray-900">{viewMemo.narration}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyLedger;
