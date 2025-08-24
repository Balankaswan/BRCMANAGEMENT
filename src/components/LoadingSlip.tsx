import React, { useState } from 'react';
import { Plus, FileText, Edit, Download, Eye, Trash2 } from 'lucide-react';
import { getNextSequenceNumber } from '../utils/sequenceGenerator';
import { formatCurrency } from '../utils/numberGenerator';
import LoadingSlipForm from './forms/LoadingSlipForm';
import MemoForm from './forms/MemoForm';
import BillForm from './forms/BillForm';
import { generateLoadingSlipPDF } from '../utils/pdfGenerator';
import type { LoadingSlip, Memo, Bill } from '../types';
import { useDataStore } from '../lib/store';

const LoadingSlipComponent: React.FC = () => {
  const { loadingSlips, memos, bills, addLoadingSlip, updateLoadingSlip, deleteLoadingSlip, addMemo, addBill } = useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [editingSlip, setEditingSlip] = useState<LoadingSlip | null>(null);
  const [viewSlip, setViewSlip] = useState<LoadingSlip | null>(null);
  const [search, setSearch] = useState('');
  const [showMemoForm, setShowMemoForm] = useState(false);
  const [showBillForm, setShowBillForm] = useState(false);
  const [selectedSlipForMemo, setSelectedSlipForMemo] = useState<LoadingSlip | null>(null);
  const [selectedSlipForBill, setSelectedSlipForBill] = useState<LoadingSlip | null>(null);

  const getNextSlipNumber = () => {
    return getNextSequenceNumber(loadingSlips, 'slip_number', 'LS');
  };

  const getNextMemoNumber = () => {
    return getNextSequenceNumber(memos, 'memo_number', 'MO');
  };

  const getNextBillNumber = () => {
    return getNextSequenceNumber(bills, 'bill_number', 'BL');
  };

  const handleShowForm = () => {
    setEditingSlip(null);
    setShowForm(true);
  };

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


  const handleUpdateSlip = (slipData: Omit<LoadingSlip, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingSlip) {
      const updatedSlip: LoadingSlip = {
        ...editingSlip,
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




  const handleDownloadPDF = async (slip: LoadingSlip) => {
    await generateLoadingSlipPDF(slip);
  };

  const handleDeleteSlip = (slip: LoadingSlip) => {
    if (window.confirm(`Are you sure you want to delete Loading Slip ${slip.slip_number}? This will also delete all related memos and bills.`)) {
      deleteLoadingSlip(slip.id);
    }
  };

  const filteredSlips = loadingSlips.filter((slip) => {
    if (!search.trim()) return true;
    const memoNumber = memos.find(m => m.loading_slip_id === slip.id)?.memo_number || '';
    const billNumber = bills.find(b => b.loading_slip_id === slip.id)?.bill_number || '';
    const haystack = [
      slip.slip_number,
      memoNumber,
      billNumber,
      slip.party,
      slip.vehicle_no,
      slip.from_location,
      slip.to_location,
      new Date(slip.date).toLocaleDateString('en-IN'),
      String(slip.total_freight || ''),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Loading Slip</h1>
        <button
          onClick={handleShowForm}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Loading Slip</span>
        </button>
      </div>

      {showForm && (
        <LoadingSlipForm
          initialData={editingSlip}
          nextSlipNumber={getNextSlipNumber()}
          onSubmit={editingSlip ? handleUpdateSlip : handleCreateSlip}
          onCancel={() => {
            setShowForm(false);
            setEditingSlip(null);
          }}
        />
      )}


      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by slip number, vehicle, party, location, material, or date..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Loading Slips Cards */}
      {filteredSlips.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No loading slips found</h3>
          <p className="text-gray-500">Create your first loading slip to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSlips.map((slip) => {
            const relatedMemo = memos.find((m: any) => m.loading_slip_id === slip.id);
            const relatedBill = bills.find((b: any) => b.loading_slip_id === slip.id);
            
            return (
              <div key={slip.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-600 mb-1">
                        Loading Slip #{slip.slip_number}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(slip.date).toLocaleDateString('en-IN')} • {slip.from_location} → {slip.to_location}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewSlip(slip)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSlip(slip);
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(slip)}
                        className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSlip(slip)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Vehicle & Material</p>
                      <p className="font-medium text-gray-900">{slip.vehicle_no}</p>
                      <p className="text-sm text-gray-600">{slip.dimension}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Party & Weight</p>
                      <p className="font-medium text-gray-900">{slip.party}</p>
                      <p className="text-sm text-gray-600">{slip.weight} MT</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Freight</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(slip.total_freight)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-4">
                      {relatedMemo ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Memo:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {relatedMemo.memo_number}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedSlipForMemo(slip);
                            setShowMemoForm(true);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Create Memo
                        </button>
                      )}
                      
                      {relatedBill ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Bill:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {relatedBill.bill_number}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedSlipForBill(slip);
                            setShowBillForm(true);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-full hover:bg-green-100 transition-colors"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Create Bill
                        </button>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewSlip(slip)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSlip(slip);
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(slip)}
                        className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSlip(slip)}
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
              {viewSlip.narration && (
                <div className="col-span-2">
                  <span className="text-gray-500">Narration:</span>
                  <p className="mt-1 text-gray-900">{viewSlip.narration}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button onClick={() => setViewSlip(null)} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Memo Form Modal */}
      {showMemoForm && selectedSlipForMemo && (
        <MemoForm
          slip={selectedSlipForMemo}
          nextMemoNumber={getNextMemoNumber()}
          onSubmit={(memoData) => {
            const newMemo: Memo = {
              ...memoData,
              id: Date.now().toString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            addMemo(newMemo);
            setShowMemoForm(false);
            setSelectedSlipForMemo(null);
          }}
          onCancel={() => {
            setShowMemoForm(false);
            setSelectedSlipForMemo(null);
          }}
        />
      )}

      {/* Bill Form Modal */}
      {showBillForm && selectedSlipForBill && (
        <BillForm
          loadingSlip={selectedSlipForBill}
          nextBillNumber={getNextBillNumber()}
          onSubmit={(billData) => {
            const newBill: Bill = {
              ...billData,
              id: Date.now().toString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            addBill(newBill);
            setShowBillForm(false);
            setSelectedSlipForBill(null);
          }}
          onCancel={() => {
            setShowBillForm(false);
            setSelectedSlipForBill(null);
          }}
        />
      )}
    </div>
  );
};

export default LoadingSlipComponent;