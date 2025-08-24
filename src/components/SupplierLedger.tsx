import React, { useState, useMemo } from 'react';
import { Filter, Download, Table, Truck, FileDown } from 'lucide-react';
import { useDataStore } from '../lib/store';
import { formatCurrency } from '../utils/numberGenerator';
import { generateSupplierLedgerPDF } from '../utils/ledgerPdfGenerator';

interface SupplierLedgerEntry {
  id: string;
  date: string;
  memoNo: string;
  tripDetails: string;
  detention: number;
  extraWeight: number;
  credit: number;
  debitPayment: number;
  debitAdvance: number;
  runningBalance: number;
  remarks: string;
}

interface SupplierLedgerProps {
  selectedSupplier?: string;
}

const SupplierLedger: React.FC<SupplierLedgerProps> = ({ selectedSupplier }) => {
  const { memos, bankingEntries, loadingSlips } = useDataStore();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [supplierFilter, setSupplierFilter] = useState(selectedSupplier || '');

  // Get unique suppliers from memos
  const suppliers = useMemo(() => {
    const supplierSet = new Set(memos.map(memo => memo.supplier));
    return Array.from(supplierSet).sort();
  }, [memos]);

  // Generate ledger entries for selected supplier
  const ledgerEntries = useMemo(() => {
    if (!supplierFilter) return [];

    const entries: SupplierLedgerEntry[] = [];
    let runningBalance = 0;

    // Get all memos for the supplier
    const supplierMemos = memos
      .filter(memo => memo.supplier === supplierFilter)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get all banking entries for the supplier's memos
    const supplierBankingEntries = bankingEntries
      .filter(entry => 
        (entry.category === 'memo_payment' || entry.category === 'memo_advance') &&
        supplierMemos.some(memo => memo.memo_number === entry.reference_id)
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Combine and sort all entries by date
    const allEntries: Array<{
      type: 'memo' | 'payment' | 'advance';
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

    // Add banking entries
    supplierBankingEntries.forEach(entry => {
      allEntries.push({
        type: entry.category === 'memo_advance' ? 'advance' : 'payment',
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
      const tripDetails = loadingSlip ? 
        `${loadingSlip.from_location} – ${loadingSlip.to_location} / ${loadingSlip.vehicle_no}` : '';

      let credit = 0;
      let debitPayment = 0;
      let debitAdvance = 0;
      let detention = 0;
      let extraWeight = 0;
      let remarks = '';

      if (entry.type === 'memo') {
        // Use freight amount instead of net_amount for proper calculation
        credit = entry.data.freight;
        detention = entry.data.detention || 0;
        extraWeight = entry.data.extra || 0;
        const commission = entry.data.commission || 0;
        const mamul = entry.data.mamool || 0;
        
        // Check if there was an advance for this memo
        const memoAdvances = supplierBankingEntries.filter(be => 
          be.category === 'memo_advance' && be.reference_id === entry.data.memo_number
        );
        const totalAdvance = memoAdvances.reduce((sum, adv) => sum + adv.amount, 0);
        debitAdvance = totalAdvance;
        
        // Correct formula: Balance = Freight - Advance - Commission - Mamul + Extra + Detention
        runningBalance += credit - debitAdvance - commission - mamul + extraWeight + detention;
        remarks = totalAdvance > 0 ? 'Memo Created (Advance Paid)' : 'Memo Created';
      } else if (entry.type === 'payment') {
        debitPayment = entry.data.amount;
        
        // Deduct payment from running balance
        runningBalance -= debitPayment;
        remarks = 'Payment to Supplier';
      } else if (entry.type === 'advance') {
        // Advance is already accounted for in memo creation
        return;
      }

      entries.push({
        id: entry.data.id || `${entry.type}-${entry.date}`,
        date: entry.date,
        memoNo: memo?.memo_number || '',
        tripDetails,
        detention,
        extraWeight,
        credit,
        debitPayment,
        debitAdvance,
        runningBalance,
        remarks
      });
    });

    return entries;
  }, [supplierFilter, memos, bankingEntries, loadingSlips]);

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

  // Calculate totals
  const totals = useMemo(() => {
    return filteredEntries.reduce((acc, entry) => ({
      credit: acc.credit + entry.credit,
      detention: acc.detention + entry.detention,
      extraWeight: acc.extraWeight + entry.extraWeight,
      debitPayment: acc.debitPayment + entry.debitPayment,
      debitAdvance: acc.debitAdvance + entry.debitAdvance,
    }), { credit: 0, detention: 0, extraWeight: 0, debitPayment: 0, debitAdvance: 0 });
  }, [filteredEntries]);

  const finalBalance = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].runningBalance : 0;

  const exportToCSV = () => {
    if (!filteredEntries.length) return;

    const headers = ['Date', 'Memo No', 'Trip Details', 'Detention (₹)', 'Extra Weight (₹)', 'Credit (₹)', 'Debit - Payment (₹)', 'Debit - Advance (₹)', 'Running Balance (₹)', 'Remarks'];
    const csvContent = [
      headers.join(','),
      ...filteredEntries.map(entry => [
        entry.date,
        entry.memoNo,
        `"${entry.tripDetails}"`,
        entry.detention,
        entry.extraWeight,
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
    a.download = `supplier-ledger-${supplierFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!filteredEntries.length || !supplierFilter) return;

    const pdfEntries = filteredEntries.map(entry => ({
      date: entry.date,
      reference: entry.memoNo,
      tripDetails: entry.tripDetails,
      detention: entry.detention,
      extraWeight: entry.extraWeight,
      credit: entry.credit,
      debitPayment: entry.debitPayment,
      debitAdvance: entry.debitAdvance,
      runningBalance: entry.runningBalance,
      remarks: entry.remarks
    }));

    generateSupplierLedgerPDF(
      supplierFilter,
      pdfEntries,
      totals,
      { from: dateFrom, to: dateTo }
    );
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
              <span>Export CSV</span>
            </button>
            <button
              onClick={exportToPDF}
              disabled={!filteredEntries.length}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <FileDown className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
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
          
          {filteredEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Memo No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip Details</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Detention (₹)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Extra Weight (₹)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit (₹)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit - Payment (₹)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit - Advance (₹)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Running Balance (₹)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEntries.map((entry, index) => (
                    <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                        {entry.memoNo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {entry.tripDetails}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600 font-medium">
                        {entry.detention > 0 ? formatCurrency(entry.detention) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-indigo-600 font-medium">
                        {entry.extraWeight > 0 ? formatCurrency(entry.extraWeight) : '—'}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-purple-600">
                      {formatCurrency(totals.detention)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-indigo-600">
                      {formatCurrency(totals.extraWeight)}
                    </td>
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
    </div>
  );
};

export default SupplierLedger;
