import React, { useState } from 'react';
import { Plus, FileText, Edit, Download, Receipt, CreditCard, Eye } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import LoadingSlipForm from './forms/LoadingSlipForm';
import MemoForm from './forms/MemoForm';
import BillForm from './forms/BillForm';
import { generateLoadingSlipPDF } from '../utils/pdfGenerator';
import type { LoadingSlip } from '../types';
import { useDataStore } from '../lib/store';

const LoadingSlipComponent: React.FC = () => {
  const { loadingSlips, memos, bills, addLoadingSlip, updateLoadingSlip, addMemo, addBill } = useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [editingSlip, setEditingSlip] = useState<LoadingSlip | null>(null);
  const [showMemoForm, setShowMemoForm] = useState(false);
  const [showBillForm, setShowBillForm] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<LoadingSlip | null>(null);
  const [viewSlip, setViewSlip] = useState<LoadingSlip | null>(null);

  const handleCreateSlip = (slipData: Omit<LoadingSlip, 'id' | 'created_at' | 'updated_at'>) => {
    const newSlip: LoadingSlip = {
      ...slipData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addLoadingSlip(newSlip);
    setShowForm(false);
  };

  const handleEditSlip = (slip: LoadingSlip) => {
    setEditingSlip(slip);
    setShowForm(true);
  };

  const handleUpdateSlip = (slipData: Omit<LoadingSlip, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingSlip) {
      const updatedSlip: LoadingSlip = {
        ...slipData,
        id: editingSlip.id,
        created_at: editingSlip.created_at,
        updated_at: new Date().toISOString(),
      };
      updateLoadingSlip(updatedSlip);
      setShowForm(false);
      setEditingSlip(null);
    }
  };

  const handleCreateMemo = (slip: LoadingSlip) => {
    setSelectedSlip(slip);
    setShowMemoForm(true);
  };

  const handleCreateBill = (slip: LoadingSlip) => {
    setSelectedSlip(slip);
    setShowBillForm(true);
  };

  const handleDownloadPDF = async (slip: LoadingSlip) => {
    await generateLoadingSlipPDF(slip);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Loading Slip</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Loading Slip</span>
        </button>
      </div>

      {showForm && (
        <LoadingSlipForm
          initialData={editingSlip}
          onSubmit={editingSlip ? handleUpdateSlip : handleCreateSlip}
          onCancel={() => {
            setShowForm(false);
            setEditingSlip(null);
          }}
        />
      )}

      {showMemoForm && selectedSlip && (
        <MemoForm
          loadingSlip={selectedSlip}
          onSubmit={(memoData) => {
            const newMemo = {
              ...memoData,
              id: Date.now().toString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            addMemo(newMemo as any);
            setShowMemoForm(false);
            setSelectedSlip(null);
          }}
          onCancel={() => {
            setShowMemoForm(false);
            setSelectedSlip(null);
          }}
        />
      )}

      {showBillForm && selectedSlip && (
        <BillForm
          loadingSlip={selectedSlip}
          onSubmit={(billData) => {
            const newBill = {
              ...billData,
              id: Date.now().toString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            addBill(newBill as any);
            setShowBillForm(false);
            setSelectedSlip(null);
          }}
          onCancel={() => {
            setShowBillForm(false);
            setSelectedSlip(null);
          }}
        />
      )}

      {/* Loading Slips List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Loading Slips</h3>
        </div>
        <div className="overflow-x-auto">
          {loadingSlips.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No loading slips found</p>
              <p className="text-sm">Create your first loading slip to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slip No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Memo No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Party
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Freight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadingSlips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {slip.slip_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {memos.find(m => m.loading_slip_id === slip.id)?.memo_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                      {bills.find(b => b.loading_slip_id === slip.id)?.bill_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(slip.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {slip.party}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {slip.vehicle_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {slip.from_location} → {slip.to_location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(slip.total_freight)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setViewSlip(slip)}
                          className="text-gray-700 hover:text-gray-900"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditSlip(slip)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit Loading Slip"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(slip)}
                          className="text-green-600 hover:text-green-800"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCreateMemo(slip)}
                          className="text-orange-600 hover:text-orange-800"
                          title="Create Memo"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCreateBill(slip)}
                          className="text-purple-600 hover:text-purple-800"
                          title="Create Bill"
                        >
                          <CreditCard className="w-4 h-4" />
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

      {viewSlip && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Loading Slip #{viewSlip.slip_number}</h3>
              <button onClick={() => setViewSlip(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Date:</span> {new Date(viewSlip.date).toLocaleDateString('en-IN')}</div>
              <div><span className="text-gray-500">Party:</span> {viewSlip.party}</div>
              <div><span className="text-gray-500">Supplier:</span> {viewSlip.supplier}</div>
              <div><span className="text-gray-500">Vehicle No:</span> {viewSlip.vehicle_no}</div>
              <div><span className="text-gray-500">Route:</span> {viewSlip.from_location} → {viewSlip.to_location}</div>
              <div><span className="text-gray-500">Weight:</span> {viewSlip.weight} MT</div>
              <div><span className="text-gray-500">Freight:</span> {formatCurrency(viewSlip.freight)}</div>
              <div><span className="text-gray-500">Advance:</span> {formatCurrency(viewSlip.advance)}</div>
              <div><span className="text-gray-500">RTO:</span> {formatCurrency(viewSlip.rto)}</div>
              <div><span className="text-gray-500">Balance:</span> {formatCurrency(viewSlip.balance)}</div>
              <div className="col-span-2"><span className="text-gray-500">Total Freight:</span> {formatCurrency(viewSlip.total_freight)}</div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button onClick={() => setViewSlip(null)} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingSlipComponent;