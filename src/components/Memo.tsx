import React, { useMemo, useState } from 'react';
import { Plus, FileText, Edit, Download, Eye, CheckCircle, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import { getNextSequenceNumber } from '../utils/sequenceGenerator';
import MemoForm from './forms/MemoForm';
import { generateMemoPDF } from '../utils/pdfGenerator';
import type { Memo } from '../types';
import { useDataStore } from '../lib/store';

interface MemoListProps {
  showOnlyFullyPaid?: boolean;
}

const MemoComponent: React.FC<MemoListProps> = ({ showOnlyFullyPaid = false }) => {
  const { memos, addMemo, updateMemo, deleteMemo, bankingEntries, loadingSlips, addBankingEntry, markMemoAsPaid } = useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [viewMemo, setViewMemo] = useState<Memo | null>(null);
  const [showPaidModal, setShowPaidModal] = useState<Memo | null>(null);
  const [paidDate, setPaidDate] = useState('');
  const [search, setSearch] = useState('');

  const handleCreateMemo = (memoData: Omit<Memo, 'id' | 'created_at' | 'updated_at'>) => {
    const newMemo: Memo = {
      ...memoData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addMemo(newMemo);
    setShowForm(false);
  };

  const handleShowForm = () => {
    setEditingMemo(null);
    setShowForm(true);
  };

  const getNextMemoNumber = () => {
    return getNextSequenceNumber(memos, 'memo_number', 'MO');
  };

  const handleEditMemo = (memo: Memo) => {
    setEditingMemo(memo);
    setShowForm(true);
  };

  const handleUpdateMemo = (memoData: Omit<Memo, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingMemo) {
      const updatedMemo: Memo = {
        ...memoData,
        id: editingMemo.id,
        created_at: editingMemo.created_at,
        updated_at: new Date().toISOString(),
      };
      updateMemo(updatedMemo);
      setShowForm(false);
      setEditingMemo(null);
    }
  };

  const handleDownloadPDF = async (memo: Memo) => {
    const loadingSlip = loadingSlips.find(ls => ls.id === memo.loading_slip_id);
    if (loadingSlip) {
      try {
        await generateMemoPDF(memo, loadingSlip);
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
      }
    }
  };

  const handleMarkAsPaid = (memo: Memo) => {
    setShowPaidModal(memo);
    setPaidDate(new Date().toISOString().split('T')[0]);
  };

  const handleDeleteMemo = (memo: Memo) => {
    if (confirm(`Are you sure you want to delete Memo #${memo.memo_number}?`)) {
      deleteMemo(memo.id);
    }
  };

  const confirmMarkAsPaid = () => {
    if (showPaidModal && paidDate) {
      // Add banking entry for full payment
      addBankingEntry({
        id: Date.now().toString(),
        type: 'debit',
        date: paidDate,
        category: 'memo_payment',
        narration: `Full payment for Memo ${showPaidModal.memo_number}`,
        amount: showPaidModal.net_amount,
        reference_id: showPaidModal.memo_number,
        reference_name: showPaidModal.supplier,
        created_at: new Date().toISOString()
      });
      // Update memo status and persist payment meta
      markMemoAsPaid(showPaidModal.id, paidDate, showPaidModal.net_amount);
      setShowPaidModal(null);
      setPaidDate('');
    }
  };

  const filteredMemos = useMemo(() => {
    // Main list shows only pending; Paid Memo view shows only paid
    let base = showOnlyFullyPaid ? memos.filter(m => m.status === 'paid') : memos.filter(m => m.status !== 'paid');
    // Optional strict settlement check (kept, in case amounts changed)
    if (showOnlyFullyPaid) {
      base = base.filter(m => {
        const paid = bankingEntries
          .filter(e => (e.category === 'memo_advance' || e.category === 'memo_payment') && e.reference_id === m.memo_number)
          .reduce((sum, e) => sum + e.amount, 0);
        // Balance = freight - advance - commission - mamul + detention + extra
        const calculatedBalance = m.freight - paid - (m.commission || 0) - (m.mamool || 0) + (m.detention || 0) + (m.extra || 0);
        return calculatedBalance <= 0;
      });
    }
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(m => {
      const ls = loadingSlips.find(ls => ls.id === m.loading_slip_id);
      const haystack = [
        m.memo_number,
        m.supplier,
        new Date(m.date).toLocaleDateString('en-IN'),
        String(m.freight),
        String(m.net_amount),
        ls?.slip_number || '',
        ls?.party || '',
        ls?.vehicle_no || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [memos, bankingEntries, showOnlyFullyPaid, search, loadingSlips]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Memo</h1>
        <button
          onClick={handleShowForm}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Memo</span>
        </button>
      </div>

      {showForm && (
        <MemoForm
          initialData={editingMemo}
          nextMemoNumber={getNextMemoNumber()}
          onSubmit={editingMemo ? handleUpdateMemo : handleCreateMemo}
          onCancel={() => {
            setShowForm(false);
            setEditingMemo(null);
          }}
        />
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by memo number, supplier name, or route..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Header Section */}
      <div className="bg-blue-600 rounded-xl shadow-sm p-6 text-white">
        <h2 className="text-xl font-bold mb-2">
          {showOnlyFullyPaid ? 'Paid Memos' : 'Broker Memos'}
        </h2>
        <p className="text-blue-100">
          {showOnlyFullyPaid ? 'Manage settled supplier memos' : 'Manage supplier transportation memos'}
        </p>
        <div className="mt-4 text-sm text-blue-100">
          {filteredMemos.length} of {filteredMemos.length} memos
        </div>
      </div>

      {/* Memos Cards */}
      {filteredMemos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No memos found</h3>
          <p className="text-gray-500">Create memos from loading slips</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMemos.map((memo) => {
            const loadingSlip = loadingSlips.find(ls => ls.id === memo.loading_slip_id);
            const paid = bankingEntries
              .filter(e => (e.category === 'memo_advance' || e.category === 'memo_payment') && e.reference_id === memo.memo_number)
              .reduce((sum, e) => sum + e.amount, 0);
            // Balance = freight - advance - commission - mamul + detention + extra
            const calculatedBalance = memo.freight - paid - (memo.commission || 0) - (memo.mamool || 0) + (memo.detention || 0) + (memo.extra || 0);
            const isFullyPaid = calculatedBalance <= 0;
            const balance = Math.max(0, calculatedBalance);
            
            return (
              <div key={memo.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-600 mb-1">
                        Memo #{memo.memo_number}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(memo.date).toLocaleDateString('en-IN')} • {loadingSlip ? `${loadingSlip.from_location} → ${loadingSlip.to_location}` : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      {isFullyPaid ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Settled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Due
                        </span>
                      )}
                      {showOnlyFullyPaid && memo.paid_date && (
                        <div className="text-xs text-green-600 mt-1">
                          Paid: {new Date(memo.paid_date).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Vehicle & Material</div>
                      <div className="font-medium text-gray-900">{loadingSlip?.vehicle_no || 'N/A'}</div>
                      <div className="text-sm text-gray-600">{loadingSlip?.dimension || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Supplier & Weight</div>
                      <div className="font-medium text-gray-900">{memo.supplier}</div>
                      <div className="text-sm text-gray-600">{loadingSlip?.weight || 0} MT</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Freight</div>
                      <div className="text-lg font-bold text-green-600">{formatCurrency(memo.freight)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Balance</div>
                      <div className="text-lg font-bold text-green-600">{formatCurrency(balance)}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-500">Commission:</span>
                      <span className="ml-1 font-medium">{formatCurrency(memo.commission || 0)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Mamool:</span>
                      <span className="ml-1 font-medium">{formatCurrency(memo.mamool || 0)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Detention:</span>
                      <span className="ml-1 font-medium">{formatCurrency(memo.detention || 0)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Extra:</span>
                      <span className="ml-1 font-medium">{formatCurrency(memo.extra || 0)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm">
                        <span className="text-gray-500">Net Amount:</span>
                        <span className="ml-1 font-bold text-green-600">{formatCurrency(memo.net_amount)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Paid:</span>
                        <span className="ml-1 font-medium">{formatCurrency(paid)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewMemo(memo)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditMemo(memo)}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(memo)}
                        className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {!showOnlyFullyPaid && !isFullyPaid && (
                        <button
                          onClick={() => handleMarkAsPaid(memo)}
                          className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Mark as Paid"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteMemo(memo)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            <div className="px-6 py-4 border-t flex justify-end">
              <button onClick={() => setViewMemo(null)} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showPaidModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Mark Memo as Paid</h3>
              <button onClick={() => setShowPaidModal(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Memo #{showPaidModal.memo_number} - {showPaidModal.supplier}
                </p>
                <p className="text-lg font-semibold text-green-600">
                  Amount: {formatCurrency(showPaidModal.net_amount)}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button 
                onClick={() => setShowPaidModal(null)}
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={confirmMarkAsPaid}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              >
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoComponent;