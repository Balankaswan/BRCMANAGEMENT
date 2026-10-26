import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Truck, FileText, Calendar, DollarSign, CreditCard, MapPin, FileSearch, ChevronDown, ChevronUp, Receipt, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import { useDataStore } from '../lib/store';
import PDFPreviewModal from './PDFPreviewModal';
import { isFuelAdvance } from './Memo';

interface SupplierDetailProps {
  supplierId?: string;
  supplierName?: string;
  onNavigate?: (page: string, params?: any) => void;
}

interface MemoRow {
  memoNo: string;
  memoDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  vehicleNo: string;
  fromLocation: string;
  toLocation: string;
  slipNumber: string;
  status: 'pending' | 'partial' | 'paid';
  // for comparison view
  linkedBillNo?: string;
  linkedBillNet?: number;
  linkedBillStatus?: string;
  profit?: number;
  // raw memo fields
  freight?: number;
  commission?: number;
  mamool?: number;
  detention?: number;
  extra?: number;
  rto?: number;
  deduction?: number;
  memoStatus?: string;
  // raw bill fields
  linkedBillRaw?: any;
}

type FilterType = 'unpaid' | 'paid' | 'all';
type ViewMode = 'list' | 'compare';

const SupplierDetail: React.FC<SupplierDetailProps> = ({ supplierId, supplierName, onNavigate }) => {
  const { suppliers, memos, bills, vehicles, loadingSlips, bankingEntries, cashbookEntries } = useDataStore();
  const [allMemoRows, setAllMemoRows] = useState<MemoRow[]>([]);
  const [supplierInfo, setSupplierInfo] = useState<any>(null);

  const [filter, setFilter] = useState<FilterType>('unpaid');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!supplierName) return;

    const supplier = suppliers.find(s => s.name === supplierName || s.id === supplierId);
    setSupplierInfo(supplier);

    const supplierMemos = memos.filter(memo => memo.supplier === supplierName);

    const rows: MemoRow[] = [];

    supplierMemos.forEach(memo => {
      let loadingSlipId: string;
      if (typeof memo.loading_slip_id === 'string') {
        loadingSlipId = memo.loading_slip_id;
      } else if (memo.loading_slip_id && typeof memo.loading_slip_id === 'object') {
        loadingSlipId = (memo.loading_slip_id as any)._id || (memo.loading_slip_id as any).id;
      } else {
        return;
      }

      const ls = loadingSlips.find(s => {
        return s.id === loadingSlipId ||
          (s as any)._id === loadingSlipId ||
          String((s as any)._id) === String(loadingSlipId);
      });

      const vehicle = vehicles.find(v => v.vehicle_no === ls?.vehicle_no);
      if (vehicle?.ownership_type !== 'market') return;

      const bankingPayments = bankingEntries
        .filter(e => e.reference_id === memo.memo_number && e.type === 'debit')
        .reduce((t, e) => t + e.amount, 0);
      const cashbookPayments = cashbookEntries
        .filter(e => e.reference_id === memo.memo_number && e.type === 'debit')
        .reduce((t, e) => t + e.amount, 0);
      const fuelAdvances = (memo.advance_payments || [])
        .filter(isFuelAdvance)
        .reduce((s: number, a: any) => s + (a.amount || 0), 0);

      const totalPaid = bankingPayments + cashbookPayments + fuelAdvances;
      const totalAmount = memo.net_amount || 0;
      const pendingAmount = totalAmount - totalPaid;

      const isPaid = memo.status === 'paid' || pendingAmount <= 0;

      // Find linked bill via loading_slip_id
      let linkedBillNo: string | undefined;
      let linkedBillNet: number | undefined;
      let linkedBillStatus: string | undefined;
      let linkedBillRaw: any;
      if (ls) {
        const slipId = ls.id || (ls as any)._id;
        const linkedBill = bills.find(b => {
          const bSlipId = typeof b.loading_slip_id === 'object'
            ? (b.loading_slip_id as any)?._id || (b.loading_slip_id as any)?.id
            : b.loading_slip_id;
          return String(bSlipId) === String(slipId);
        });
        if (linkedBill) {
          linkedBillNo = linkedBill.bill_number;
          linkedBillNet = (linkedBill.bill_amount || 0)
            - (linkedBill.mamool || 0) - (linkedBill.commission || 0)
            + (linkedBill.detention || 0) + (linkedBill.rto || 0) + (linkedBill.extra || 0)
            - (linkedBill.tds || 0) - (linkedBill.penalties || 0);
          linkedBillStatus = linkedBill.status;
          linkedBillRaw = linkedBill;
        }
      }

      const profit = linkedBillNet !== undefined ? linkedBillNet - totalAmount : undefined;

      rows.push({
        memoNo: memo.memo_number,
        memoDate: memo.date,
        totalAmount,
        paidAmount: totalPaid,
        pendingAmount: Math.max(0, pendingAmount),
        vehicleNo: ls?.vehicle_no || 'N/A',
        fromLocation: ls?.from_location || '',
        toLocation: ls?.to_location || '',
        slipNumber: ls?.slip_number || '',
        status: isPaid ? 'paid' : totalPaid > 0 ? 'partial' : 'pending',
        linkedBillNo,
        linkedBillNet,
        linkedBillStatus,
        profit,
        freight: memo.freight,
        commission: memo.commission,
        mamool: memo.mamool,
        detention: memo.detention,
        extra: memo.extra,
        rto: memo.rto,
        deduction: memo.deduction,
        memoStatus: memo.status,
        linkedBillRaw,
      });
    });

    rows.sort((a, b) => new Date(b.memoDate).getTime() - new Date(a.memoDate).getTime());
    setAllMemoRows(rows);
  }, [supplierName, supplierId, suppliers, memos, bills, vehicles, loadingSlips, bankingEntries, cashbookEntries]);

  const filteredRows = useMemo(() => {
    if (filter === 'all') return allMemoRows;
    if (filter === 'paid') return allMemoRows.filter(r => r.status === 'paid');
    return allMemoRows.filter(r => r.status !== 'paid');
  }, [allMemoRows, filter]);

  const unpaidCount = allMemoRows.filter(r => r.status !== 'paid').length;
  const paidCount = allMemoRows.filter(r => r.status === 'paid').length;
  const totalPendingAmount = allMemoRows.filter(r => r.status !== 'paid').reduce((s, r) => s + r.pendingAmount, 0);

  const toggleExpand = (memoNo: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(memoNo) ? next.delete(memoNo) : next.add(memoNo);
      return next;
    });
  };

  const handlePayNow = (memoNo: string) => {
    if (onNavigate) {
      onNavigate('banking', {
        prefill: { type: 'debit', reference_id: memoNo, supplier: supplierName, category: 'Memo Payment' },
      });
    }
  };

  const handleMemoClick = (memoNo: string) => {
    if (onNavigate) onNavigate('memo', { highlight: memoNo });
  };

  // PDF Preview
  const [previewMemoNo, setPreviewMemoNo] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handlePreviewMemoPDF = async (memoNo: string) => {
    setPreviewLoading(true);
    setPreviewMemoNo(memoNo);
    try {
      const memo = memos.find(m => m.memo_number === memoNo);
      if (!memo) { alert('Memo not found.'); setPreviewMemoNo(null); return; }
      const { generateMemoPDF } = await import('../utils/pdfGenerator');
      const relatedLoadingSlip = typeof memo.loading_slip_id === 'object' && memo.loading_slip_id !== null
        ? memo.loading_slip_id
        : loadingSlips.find(ls => ls.id === memo.loading_slip_id || (ls as any)._id === memo.loading_slip_id);
      if (relatedLoadingSlip) {
        const blobUrl = await generateMemoPDF(memo, relatedLoadingSlip, bankingEntries, cashbookEntries, { preview: true });
        if (blobUrl) setPreviewBlobUrl(blobUrl as string);
        else setPreviewMemoNo(null);
      } else {
        alert('Related loading slip not found.');
        setPreviewMemoNo(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error generating PDF preview.');
      setPreviewMemoNo(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (!supplierName) {
    return (
      <div className="text-center py-12">
        <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Supplier not found</h3>
        <p className="text-gray-500">Please select a valid supplier to view details</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onNavigate?.('suppliers')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Suppliers</span>
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{supplierName}</h1>
        <div className="flex space-x-2">
          <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2">
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Supplier Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Supplier Balance</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">{formatCurrency(totalPendingAmount)}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
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
              <p className="text-lg font-semibold text-gray-900 mt-2">{supplierInfo?.contact_person || 'N/A'}</p>
              <p className="text-sm text-gray-500">{supplierInfo?.phone || 'N/A'}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Memos Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Header with Filter + View Toggle */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Memos (Market Vehicles Only)</h3>

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
                          : 'bg-orange-500 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {f === 'unpaid' ? `Unpaid (${unpaidCount})` : f === 'paid' ? `Paid (${paidCount})` : `All (${allMemoRows.length})`}
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

              {filter !== 'paid' && (
                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Memo No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Memo Date</th>
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
                      <p className="text-gray-500">No {filter === 'all' ? '' : filter} memos found</p>
                    </td>
                  </tr>
                ) : filteredRows.map((memo, index) => (
                  <tr key={`${memo.memoNo}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button onClick={() => handleMemoClick(memo.memoNo)} className="flex items-center group" title="Click to view memo details">
                        <FileText className="w-4 h-4 text-gray-400 mr-2 group-hover:text-orange-500 transition-colors" />
                        <span className="text-sm font-medium text-orange-600 hover:text-orange-800 hover:underline">{memo.memoNo}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{new Date(memo.memoDate).toLocaleDateString('en-IN')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Truck className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{memo.vehicleNo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {memo.fromLocation && memo.toLocation ? (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-1 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{memo.fromLocation}<span className="text-gray-400 mx-1">→</span>{memo.toLocation}</span>
                        </div>
                      ) : memo.slipNumber ? (
                        <span className="text-sm text-gray-500">Slip: {memo.slipNumber}</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(memo.totalAmount)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-green-700 font-medium">{formatCurrency(memo.paidAmount)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-bold ${memo.pendingAmount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {memo.pendingAmount > 0 ? formatCurrency(memo.pendingAmount) : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        memo.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : memo.status === 'partial'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {memo.status === 'paid' ? 'Paid ✓' : memo.status === 'partial' ? 'Partial' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handlePreviewMemoPDF(memo.memoNo)}
                        disabled={previewLoading}
                        className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Preview Memo PDF"
                      >
                        <FileSearch className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {memo.status !== 'paid' ? (
                        <button
                          onClick={() => handlePayNow(memo.memoNo)}
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
                <p className="text-gray-500">No {filter === 'all' ? '' : filter} memos to compare</p>
              </div>
            ) : filteredRows.map((memo, i) => {
              const isExpanded = expandedRows.has(memo.memoNo);
              const profit = memo.profit;
              return (
                <div key={`cmp-${memo.memoNo}-${i}`} className="p-4">
                  <button
                    className="w-full flex items-center justify-between hover:bg-gray-50 rounded-xl px-4 py-3 transition-colors"
                    onClick={() => toggleExpand(memo.memoNo)}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="flex items-center gap-2">
                        {memo.linkedBillNo ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold text-sm">{memo.linkedBillNo}</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-400 text-sm italic">No Bill</span>
                        )}
                        <span className="text-gray-400 font-bold">↔</span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 font-bold text-sm">{memo.memoNo}</span>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                        <Truck className="w-3.5 h-3.5" />
                        <span>{memo.vehicleNo}</span>
                        {memo.fromLocation && memo.toLocation && (
                          <span>{memo.fromLocation} → {memo.toLocation}</span>
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

                  {isExpanded && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                      {/* Bill Detail */}
                      {memo.linkedBillNo && memo.linkedBillRaw ? (
                        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                          <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" /> Bill Details — {memo.linkedBillNo}
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                            <div className="flex justify-between"><span className="text-gray-500">Party</span><span className="font-medium">{memo.linkedBillRaw.party}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{new Date(memo.linkedBillRaw.date).toLocaleDateString('en-IN')}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Freight</span><span className="font-medium text-blue-700">{formatCurrency(memo.linkedBillRaw.bill_amount || 0)}</span></div>
                            {(memo.linkedBillRaw.mamool || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Mamool</span><span className="font-medium text-red-500">-{formatCurrency(memo.linkedBillRaw.mamool)}</span></div>}
                            {(memo.linkedBillRaw.commission || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Commission</span><span className="font-medium text-red-500">-{formatCurrency(memo.linkedBillRaw.commission)}</span></div>}
                            {(memo.linkedBillRaw.detention || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Detention</span><span className="font-medium text-green-600">+{formatCurrency(memo.linkedBillRaw.detention)}</span></div>}
                            {(memo.linkedBillRaw.rto || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">RTO</span><span className="font-medium text-green-600">+{formatCurrency(memo.linkedBillRaw.rto)}</span></div>}
                            {(memo.linkedBillRaw.extra || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Extra</span><span className="font-medium text-green-600">+{formatCurrency(memo.linkedBillRaw.extra)}</span></div>}
                            {(memo.linkedBillRaw.tds || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">TDS</span><span className="font-medium text-red-500">-{formatCurrency(memo.linkedBillRaw.tds)}</span></div>}
                            {(memo.linkedBillRaw.penalties || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Penalties</span><span className="font-medium text-red-500">-{formatCurrency(memo.linkedBillRaw.penalties)}</span></div>}
                            <div className="col-span-2 border-t border-blue-200 pt-1.5 mt-0.5 flex justify-between">
                              <span className="font-semibold text-gray-700">Net Bill</span>
                              <span className="font-bold text-blue-700">{formatCurrency(memo.linkedBillNet || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Status</span>
                              <span className={`font-medium ${memo.linkedBillStatus === 'received' ? 'text-green-600' : 'text-yellow-600'}`}>
                                {memo.linkedBillStatus === 'received' ? 'Received ✓' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4 flex items-center justify-center">
                          <p className="text-sm text-gray-400 italic">No bill linked to this loading slip</p>
                        </div>
                      )}

                      {/* Memo Detail */}
                      <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
                        <div className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-1">
                          <Receipt className="w-3.5 h-3.5" /> Memo Details — {memo.memoNo}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{new Date(memo.memoDate).toLocaleDateString('en-IN')}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Vehicle</span><span className="font-medium">{memo.vehicleNo}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Freight</span><span className="font-medium text-orange-700">{formatCurrency(memo.freight || 0)}</span></div>
                          {(memo.commission || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Commission</span><span className="font-medium text-red-500">-{formatCurrency(memo.commission)}</span></div>}
                          {(memo.mamool || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Mamool</span><span className="font-medium text-red-500">-{formatCurrency(memo.mamool)}</span></div>}
                          {(memo.detention || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Detention</span><span className="font-medium text-green-600">+{formatCurrency(memo.detention)}</span></div>}
                          {(memo.extra || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Extra</span><span className="font-medium text-green-600">+{formatCurrency(memo.extra)}</span></div>}
                          {(memo.rto || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">RTO</span><span className="font-medium text-green-600">+{formatCurrency(memo.rto)}</span></div>}
                          {(memo.deduction || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Deduction</span><span className="font-medium text-red-500">-{formatCurrency(memo.deduction)}</span></div>}
                          <div className="col-span-2 border-t border-orange-200 pt-1.5 mt-0.5 flex justify-between">
                            <span className="font-semibold text-gray-700">Net Memo</span>
                            <span className="font-bold text-orange-700">{formatCurrency(memo.totalAmount)}</span>
                          </div>
                          <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="font-medium text-green-600">{formatCurrency(memo.paidAmount)}</span></div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Status</span>
                            <span className={`font-medium ${memo.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                              {memo.status === 'paid' ? 'Paid ✓' : memo.status === 'partial' ? 'Partial' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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

      {/* Supplier Information */}
      {supplierInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplier Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-500">Address</label><p className="text-sm text-gray-900 mt-1">{supplierInfo.address || 'N/A'}</p></div>
            <div><label className="text-sm font-medium text-gray-500">GST Number</label><p className="text-sm text-gray-900 mt-1">{supplierInfo.gst_number || 'N/A'}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Email</label><p className="text-sm text-gray-900 mt-1">{supplierInfo.email || 'N/A'}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Phone</label><p className="text-sm text-gray-900 mt-1">{supplierInfo.phone || 'N/A'}</p></div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewMemoNo && previewBlobUrl && (
        <PDFPreviewModal
          blobUrl={previewBlobUrl}
          title={`Memo #${previewMemoNo} — ${supplierName}`}
          onDownload={async () => {
            const memo = memos.find(m => m.memo_number === previewMemoNo);
            if (!memo) return;
            const { generateMemoPDF } = await import('../utils/pdfGenerator');
            const relatedLoadingSlip = typeof memo.loading_slip_id === 'object' && memo.loading_slip_id !== null
              ? memo.loading_slip_id
              : loadingSlips.find(ls => ls.id === memo.loading_slip_id || (ls as any)._id === memo.loading_slip_id);
            if (relatedLoadingSlip) await generateMemoPDF(memo, relatedLoadingSlip, bankingEntries, cashbookEntries);
          }}
          onClose={() => { setPreviewMemoNo(null); setPreviewBlobUrl(null); }}
        />
      )}
    </div>
  );
};

export default SupplierDetail;
