import React, { useMemo, useState } from 'react';
import { Plus, Receipt, Edit, Download, Eye } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import MemoForm from './forms/MemoForm';
import { generateMemoPDF } from '../utils/pdfGenerator';
import type { Memo } from '../types';
import { useDataStore } from '../lib/store';

interface MemoListProps {
  showOnlyFullyPaid?: boolean;
}

const MemoComponent: React.FC<MemoListProps> = ({ showOnlyFullyPaid = false }) => {
  const { memos, addMemo, updateMemo, bankingEntries } = useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [viewMemo, setViewMemo] = useState<Memo | null>(null);

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
    await generateMemoPDF(memo);
  };

  const filteredMemos = useMemo(() => {
    if (!showOnlyFullyPaid) return memos;
    return memos.filter(m => {
      const paid = bankingEntries
        .filter(e => (e.category === 'memo_advance' || e.category === 'memo_payment') && e.reference_id === m.memo_number)
        .reduce((sum, e) => sum + e.amount, 0);
      return paid >= m.net_amount && m.net_amount > 0;
    });
  }, [memos, bankingEntries, showOnlyFullyPaid]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Memo</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Memo</span>
        </button>
      </div>

      {showForm && (
        <MemoForm
          initialData={editingMemo}
          onSubmit={editingMemo ? handleUpdateMemo : handleCreateMemo}
          onCancel={() => {
            setShowForm(false);
            setEditingMemo(null);
          }}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Memos</h3>
        </div>
        <div className="overflow-x-auto">
          {filteredMemos.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No memos found</p>
              <p className="text-sm">Create memos from loading slips</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Memo No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Freight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMemos.map((memo) => (
                  <tr key={memo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {memo.memo_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(memo.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {memo.supplier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(memo.freight)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      -{formatCurrency(memo.commission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {formatCurrency(memo.net_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setViewMemo(memo)}
                          className="text-gray-700 hover:text-gray-900"
                          title="View Memo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditMemo(memo)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit Memo"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(memo)}
                          className="text-green-600 hover:text-green-800"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button onClick={() => setViewMemo(null)} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoComponent;