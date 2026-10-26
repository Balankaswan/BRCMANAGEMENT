import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Users, FileText, Calendar, DollarSign, CreditCard, Truck, FileDown, Table, FileSearch, ChevronDown, ChevronUp, Receipt, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import { useDataStore } from '../lib/store';
import PDFPreviewModal from './PDFPreviewModal';

interface PartyDetailProps {
  partyId?: string;
  partyName?: string;
  onNavigate?: (page: string, params?: any) => void;
}

interface BillRow {
  billNo: string;
  billDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'pending' | 'partial' | 'paid';
  vehicleNo: string;
  fromLocation: string;
  toLocation: string;
  slipNumber: string;
  // for comparison view
  linkedMemoNo?: string;
  linkedMemoNet?: number;
  linkedMemoStatus?: string;
  profit?: number;
  // raw bill fields for comparison expand
  bill_amount?: number;
  mamool?: number;
  commission?: number;
  detention?: number;
  rto?: number;
  extra?: number;
  tds?: number;
  penalties?: number;
  party_commission_cut?: number;
  billStatus?: string;
}

type FilterType = 'unpaid' | 'paid' | 'all';
type ViewMode = 'list' | 'compare';

const PartyDetail: React.FC<PartyDetailProps> = ({ partyId, partyName, onNavigate }) => {
  const { parties, bills, memos, bankingEntries, cashbookEntries, loadingSlips } = useDataStore();
  const [allBillRows, setAllBillRows] = useState<BillRow[]>([]);
  const [partyInfo, setPartyInfo] = useState<any>(null);

  // UI state
  const [filter, setFilter] = useState<FilterType>('unpaid');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!partyName) return;

    const party = parties.find(p => p.name === partyName || p.id === partyId);
    setPartyInfo(party);

    const partyBills = bills.filter(bill => bill.party === partyName);

    const rows: BillRow[] = partyBills.map(bill => {
      const bankingPayments = bankingEntries
        .filter(e => e.reference_id === bill.bill_number && e.type === 'credit')
        .reduce((t, e) => t + e.amount, 0);
      const cashbookPayments = cashbookEntries
        .filter(e => e.reference_id === bill.bill_number && e.type === 'credit')
        .reduce((t, e) => t + e.amount, 0);
      const totalPaid = bankingPayments + cashbookPayments;

      const totalAmount =
        (bill.bill_amount || 0) -
        (bill.mamool || 0) -
        (bill.commission || 0) +
        (bill.detention || 0) +
        (bill.rto || 0) +
        (bill.extra || 0) -
        (bill.tds || 0) -
        (bill.penalties || 0);

      const pendingAmount = totalAmount - totalPaid;

      // Resolve loading slip for trip info
      let relatedSlip: any = null;
      if (typeof bill.loading_slip_id === 'object' && bill.loading_slip_id !== null) {
        relatedSlip = bill.loading_slip_id;
      } else if (bill.loading_slip_id) {
        relatedSlip = loadingSlips.find(
          ls => ls.id === bill.loading_slip_id || (ls as any)._id === bill.loading_slip_id
        );
      }

      // Find linked memo via loading_slip_id
      let linkedMemoNo: string | undefined;
      let linkedMemoNet: number | undefined;
      let linkedMemoStatus: string | undefined;
      if (relatedSlip) {
        const slipId = relatedSlip.id || (relatedSlip as any)._id;
        const linkedMemo = memos.find(m => {
          const mSlipId = typeof m.loading_slip_id === 'object'
            ? (m.loading_slip_id as any)?._id || (m.loading_slip_id as any)?.id
            : m.loading_slip_id;
          return String(mSlipId) === String(slipId);
        });
        if (linkedMemo) {
          linkedMemoNo = linkedMemo.memo_number;
          linkedMemoNet = linkedMemo.net_amount || 0;
          linkedMemoStatus = linkedMemo.status;
        }
      }

      const profit = linkedMemoNet !== undefined ? totalAmount - linkedMemoNet : undefined;

      const isPaid = bill.status === 'received' || pendingAmount <= 0;

      return {
        billNo: bill.bill_number,
        billDate: bill.date,
        totalAmount,
        paidAmount: totalPaid,
        pendingAmount: Math.max(0, pendingAmount),
        status: isPaid ? 'paid' : totalPaid > 0 ? 'partial' : 'pending',
        vehicleNo: relatedSlip?.vehicle_no || '—',
        fromLocation: relatedSlip?.from_location || '',
        toLocation: relatedSlip?.to_location || '',
        slipNumber: relatedSlip?.slip_number || '',
        linkedMemoNo,
        linkedMemoNet,
        linkedMemoStatus,
        profit,
        bill_amount: bill.bill_amount,
        mamool: bill.mamool,
        commission: bill.commission,
        detention: bill.detention,
        rto: bill.rto,
        extra: bill.extra,
        tds: bill.tds,
        penalties: bill.penalties,
        party_commission_cut: bill.party_commission_cut,
        billStatus: bill.status,
      };
    });

    rows.sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
    setAllBillRows(rows);
  }, [partyName, partyId, parties, bills, memos, bankingEntries, cashbookEntries, loadingSlips]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (filter === 'all') return allBillRows;
    if (filter === 'paid') return allBillRows.filter(r => r.status === 'paid');
    return allBillRows.filter(r => r.status !== 'paid');
  }, [allBillRows, filter]);

  const unpaidCount = allBillRows.filter(r => r.status !== 'paid').length;
  const paidCount = allBillRows.filter(r => r.status === 'paid').length;
  const totalPendingAmount = allBillRows.filter(r => r.status !== 'paid').reduce((s, r) => s + r.pendingAmount, 0);

  const toggleExpand = (billNo: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(billNo) ? next.delete(billNo) : next.add(billNo);
      return next;
    });
  };

  const handlePayNow = (billNo: string) => {
    if (onNavigate) {
      onNavigate('banking', {
        prefill: { type: 'credit', reference_id: billNo, party: partyName, category: 'Bill Payment' },
      });
    }
  };

  const handleBillClick = (billNo: string) => {
    if (onNavigate) onNavigate('bills', { highlight: billNo });
  };

  // PDF Preview
  const [previewBillNo, setPreviewBillNo] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handlePreviewBillPDF = async (billNo: string) => {
    setPreviewLoading(true);
    setPreviewBillNo(billNo);
    try {
      const bill = bills.find(b => b.bill_number === billNo);
      if (!bill) { alert('Bill not found.'); setPreviewBillNo(null); return; }
      const advancePayments = bankingEntries
        .filter(e => e.category === 'bill_advance' && e.reference_id === bill.bill_number)
        .map(e => ({
          id: e.id || e._id || `advance-${Date.now()}-${Math.random()}`,
          bill_id: bill.id, date: e.date, amount: e.amount,
          mode: (e.payment_mode as 'cash' | 'bank' | 'other') || 'bank',
          reference: e.narration || e.reference_id,
        }));
      const enhancedBill = { ...bill, advance_payments: advancePayments };
      const { generateBillPDF } = await import('../utils/pdfGenerator');
      let relatedLoadingSlip: any;
      if (typeof bill.loading_slip_id === 'object' && bill.loading_slip_id !== null) {
        relatedLoadingSlip = bill.loading_slip_id;
      } else {
        relatedLoadingSlip = loadingSlips.find(
          ls => ls.id === bill.loading_slip_id || (ls as any)._id === bill.loading_slip_id
        );
      }
      if (relatedLoadingSlip) {
        const blobUrl = await generateBillPDF(enhancedBill, relatedLoadingSlip, bankingEntries, cashbookEntries, { preview: true });
        if (blobUrl) setPreviewBlobUrl(blobUrl as string);
        else setPreviewBillNo(null);
      } else {
        alert('Related loading slip not found.');
        setPreviewBillNo(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error generating PDF preview.');
      setPreviewBillNo(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // PDF / Excel Export
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const { generatePartyDetailPDF } = await import('../utils/partyDetailExport');
      const pendingOnly = allBillRows.filter(r => r.status !== 'paid');
      await generatePartyDetailPDF({
        partyName: partyName || '',
        contactPerson: partyInfo?.contact_person || 'N/A',
        phone: partyInfo?.phone || 'N/A',
        address: partyInfo?.address || 'N/A',
        totalPartyBalance: totalPendingAmount,
        activeTrips: unpaidCount,
        pendingBills: pendingOnly.map(b => ({
          billNo: b.billNo, billDate: b.billDate, vehicleNo: b.vehicleNo,
          fromLocation: b.fromLocation, toLocation: b.toLocation,
          totalAmount: b.totalAmount, paidAmount: b.paidAmount, pendingAmount: b.pendingAmount,
        })),
      });
    } catch (err: any) {
      alert(`PDF export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const { generatePartyDetailExcel } = await import('../utils/partyDetailExport');
      const pendingOnly = allBillRows.filter(r => r.status !== 'paid');
      await generatePartyDetailExcel({
        partyName: partyName || '',
        contactPerson: partyInfo?.contact_person || 'N/A',
        phone: partyInfo?.phone || 'N/A',
        address: partyInfo?.address || 'N/A',
        totalPartyBalance: totalPendingAmount,
        activeTrips: unpaidCount,
        pendingBills: pendingOnly.map(b => ({
          billNo: b.billNo, billDate: b.billDate, vehicleNo: b.vehicleNo,
          fromLocation: b.fromLocation, toLocation: b.toLocation,
          totalAmount: b.totalAmount, paidAmount: b.paidAmount, pendingAmount: b.pendingAmount,
        })),
      });
    } catch (err: any) {
      alert(`Excel export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!partyName) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Party not found</h3>
        <p className="text-gray-500">Please select a valid party to view details</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onNavigate?.('parties')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Parties</span>
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{partyName}</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleExportPDF}
            disabled={isExporting || unpaidCount === 0}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span>{isExporting ? 'Generating...' : 'PDF'}</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isExporting || unpaidCount === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
          >
            <Table className="w-4 h-4" />
            <span>{isExporting ? 'Generating...' : 'Excel'}</span>
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Party Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Party Balance</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(totalPendingAmount)}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Trips</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{unpaidCount}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Contact Person</p>
              <p className="text-lg font-semibold text-gray-900 mt-2">{partyInfo?.contact_person || 'N/A'}</p>
              <p className="text-sm text-gray-500">{partyInfo?.phone || 'N/A'}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Table Header with Filter + View Toggle */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Bills</h3>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {(['unpaid', 'paid', 'all'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                      filter === f
                        ? f === 'unpaid'
                          ? 'bg-red-500 text-white shadow-sm'
                          : f === 'paid'
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {f === 'unpaid' ? `Unpaid (${unpaidCount})` : f === 'paid' ? `Paid (${paidCount})` : `All (${allBillRows.length})`}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1 ${
                    viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> List
                </button>
                <button
                  onClick={() => setViewMode('compare')}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1 ${
                    viewMode === 'compare' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> BL ↔ MO
                </button>
              </div>

              {/* Pending total badge */}
              {filter !== 'paid' && (
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  Pending: {formatCurrency(totalPendingAmount)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip Details</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount (₹)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Amount (₹)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Amount (₹)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No {filter === 'all' ? '' : filter} bills found</p>
                    </td>
                  </tr>
                ) : filteredRows.map((bill, index) => (
                  <tr key={`${bill.billNo}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button onClick={() => handleBillClick(bill.billNo)} className="flex items-center group" title="Click to view bill details">
                        <FileText className="w-4 h-4 text-gray-400 mr-2 group-hover:text-blue-500 transition-colors" />
                        <span className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">{bill.billNo}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{new Date(bill.billDate).toLocaleDateString('en-IN')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Truck className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{bill.vehicleNo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {bill.fromLocation && bill.toLocation ? (
                        <span className="text-sm text-gray-700">{bill.fromLocation}<span className="text-gray-400 mx-1">→</span>{bill.toLocation}</span>
                      ) : bill.slipNumber ? (
                        <span className="text-sm text-gray-500">Slip: {bill.slipNumber}</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(bill.totalAmount)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-green-700 font-medium">{formatCurrency(bill.paidAmount)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-bold ${bill.pendingAmount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {bill.pendingAmount > 0 ? formatCurrency(bill.pendingAmount) : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        bill.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : bill.status === 'partial'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {bill.status === 'paid' ? 'Received ✓' : bill.status === 'partial' ? 'Partial' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handlePreviewBillPDF(bill.billNo)}
                        disabled={previewLoading}
                        className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Preview Bill PDF"
                      >
                        <FileSearch className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {bill.status !== 'paid' ? (
                        <button
                          onClick={() => handlePayNow(bill.billNo)}
                          className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
                        >
                          Pay Now
                        </button>
                      ) : (
                        <span className="text-green-600 text-sm font-medium">✓ Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── COMPARE VIEW (BL ↔ MO) ── */}
        {viewMode === 'compare' && (
          <div className="divide-y divide-gray-100">
            {filteredRows.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No {filter === 'all' ? '' : filter} bills to compare</p>
              </div>
            ) : filteredRows.map((bill, i) => {
              const isExpanded = expandedRows.has(bill.billNo);
              const profit = bill.profit;
              return (
                <div key={`cmp-${bill.billNo}-${i}`} className="p-4">
                  {/* Row header — click to expand */}
                  <button
                    className="w-full flex items-center justify-between hover:bg-gray-50 rounded-xl px-4 py-3 transition-colors"
                    onClick={() => toggleExpand(bill.billNo)}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold text-sm">{bill.billNo}</span>
                        <span className="text-gray-400 font-bold">↔</span>
                        {bill.linkedMemoNo ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 font-bold text-sm">{bill.linkedMemoNo}</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-400 text-sm italic">No Memo</span>
                        )}
                      </div>
                      <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                        <Truck className="w-3.5 h-3.5" />
                        <span>{bill.vehicleNo}</span>
                        {bill.fromLocation && bill.toLocation && (
                          <span>{bill.fromLocation} → {bill.toLocation}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {profit !== undefined && (
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold ${
                          profit > 0 ? 'bg-green-100 text-green-700' : profit < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <TrendingUp className="w-3.5 h-3.5" />
                          {profit > 0 ? '+' : ''}{formatCurrency(profit)}
                        </div>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                      {/* Bill Detail */}
                      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                        <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Bill Details — {bill.billNo}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{new Date(bill.billDate).toLocaleDateString('en-IN')}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Vehicle</span><span className="font-medium">{bill.vehicleNo}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Freight</span><span className="font-medium text-blue-700">{formatCurrency(bill.bill_amount || 0)}</span></div>
                          {(bill.mamool || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Mamool</span><span className="font-medium text-red-500">-{formatCurrency(bill.mamool)}</span></div>}
                          {(bill.commission || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Commission</span><span className="font-medium text-red-500">-{formatCurrency(bill.commission)}</span></div>}
                          {(bill.detention || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Detention</span><span className="font-medium text-green-600">+{formatCurrency(bill.detention)}</span></div>}
                          {(bill.rto || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">RTO</span><span className="font-medium text-green-600">+{formatCurrency(bill.rto)}</span></div>}
                          {(bill.extra || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Extra</span><span className="font-medium text-green-600">+{formatCurrency(bill.extra)}</span></div>}
                          {(bill.tds || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">TDS</span><span className="font-medium text-red-500">-{formatCurrency(bill.tds)}</span></div>}
                          {(bill.penalties || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Penalties</span><span className="font-medium text-red-500">-{formatCurrency(bill.penalties)}</span></div>}
                          {(bill.party_commission_cut || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Party Comm. Cut</span><span className="font-medium text-red-500">-{formatCurrency(bill.party_commission_cut)}</span></div>}
                          <div className="col-span-2 border-t border-blue-200 pt-1.5 mt-0.5 flex justify-between">
                            <span className="font-semibold text-gray-700">Net Bill</span>
                            <span className="font-bold text-blue-700">{formatCurrency(bill.totalAmount)}</span>
                          </div>
                          <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="font-medium text-green-600">{formatCurrency(bill.paidAmount)}</span></div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Status</span>
                            <span className={`font-medium ${bill.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                              {bill.status === 'paid' ? 'Received ✓' : bill.status === 'partial' ? 'Partial' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Memo Detail */}
                      {bill.linkedMemoNo ? (() => {
                        const memo = memos.find(m => m.memo_number === bill.linkedMemoNo);
                        return (
                          <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
                            <div className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-1">
                              <Receipt className="w-3.5 h-3.5" /> Memo Details — {bill.linkedMemoNo}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                              {memo && <>
                                <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{new Date(memo.date).toLocaleDateString('en-IN')}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Supplier</span><span className="font-medium">{memo.supplier}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Freight</span><span className="font-medium text-orange-700">{formatCurrency(memo.freight)}</span></div>
                                {(memo.commission || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Commission</span><span className="font-medium text-red-500">-{formatCurrency(memo.commission)}</span></div>}
                                {(memo.mamool || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Mamool</span><span className="font-medium text-red-500">-{formatCurrency(memo.mamool)}</span></div>}
                                {(memo.detention || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Detention</span><span className="font-medium text-green-600">+{formatCurrency(memo.detention)}</span></div>}
                                {(memo.extra || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Extra</span><span className="font-medium text-green-600">+{formatCurrency(memo.extra)}</span></div>}
                                {(memo.rto || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">RTO</span><span className="font-medium text-green-600">+{formatCurrency(memo.rto)}</span></div>}
                                {(memo.deduction || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Deduction</span><span className="font-medium text-red-500">-{formatCurrency(memo.deduction)}</span></div>}
                              </>}
                              <div className="col-span-2 border-t border-orange-200 pt-1.5 mt-0.5 flex justify-between">
                                <span className="font-semibold text-gray-700">Net Memo</span>
                                <span className="font-bold text-orange-700">{formatCurrency(bill.linkedMemoNet || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Status</span>
                                <span className={`font-medium ${bill.linkedMemoStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                                  {bill.linkedMemoStatus === 'paid' ? 'Paid ✓' : 'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4 flex items-center justify-center">
                          <p className="text-sm text-gray-400 italic">No memo linked to this loading slip</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Profit bar (always visible) */}
                  {isExpanded && profit !== undefined && (
                    <div className={`mt-3 mx-4 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-between ${
                      profit > 0 ? 'bg-green-100 text-green-800' : profit < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      <span>Trip Profit</span>
                      <span className="text-base">{profit > 0 ? '+' : ''}{formatCurrency(profit)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Party Information */}
      {partyInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Party Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-500">Address</label><p className="text-sm text-gray-900 mt-1">{partyInfo.address || 'N/A'}</p></div>
            <div><label className="text-sm font-medium text-gray-500">GST Number</label><p className="text-sm text-gray-900 mt-1">{partyInfo.gst_number || 'N/A'}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Email</label><p className="text-sm text-gray-900 mt-1">{partyInfo.email || 'N/A'}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Phone</label><p className="text-sm text-gray-900 mt-1">{partyInfo.phone || 'N/A'}</p></div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewBillNo && previewBlobUrl && (
        <PDFPreviewModal
          blobUrl={previewBlobUrl}
          title={`Bill #${previewBillNo} — ${partyName}`}
          onDownload={async () => {
            const bill = bills.find(b => b.bill_number === previewBillNo);
            if (!bill) return;
            const advancePayments = bankingEntries
              .filter(e => e.category === 'bill_advance' && e.reference_id === bill.bill_number)
              .map(e => ({
                id: e.id || e._id || `advance-${Date.now()}-${Math.random()}`,
                bill_id: bill.id, date: e.date, amount: e.amount,
                mode: (e.payment_mode as 'cash' | 'bank' | 'other') || 'bank',
                reference: e.narration || e.reference_id,
              }));
            const enhancedBill = { ...bill, advance_payments: advancePayments };
            const { generateBillPDF } = await import('../utils/pdfGenerator');
            let relatedLoadingSlip: any;
            if (typeof bill.loading_slip_id === 'object' && bill.loading_slip_id !== null) {
              relatedLoadingSlip = bill.loading_slip_id;
            } else {
              relatedLoadingSlip = loadingSlips.find(
                ls => ls.id === bill.loading_slip_id || (ls as any)._id === bill.loading_slip_id
              );
            }
            if (relatedLoadingSlip) await generateBillPDF(enhancedBill, relatedLoadingSlip, bankingEntries, cashbookEntries);
          }}
          onClose={() => { setPreviewBillNo(null); setPreviewBlobUrl(null); }}
        />
      )}
    </div>
  );
};

export default PartyDetail;
