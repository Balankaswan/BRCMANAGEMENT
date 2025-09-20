import React, { useState } from 'react';
import { Plus, Edit, Trash2, FileText, Eye, Download } from 'lucide-react';
import { useDataStore } from '../lib/store';
import { apiService } from '../lib/api';
import { getNextSequenceNumber } from '../utils/sequenceGenerator';
import { formatCurrency } from '../utils/numberGenerator';
import LoadingSlipForm from './forms/LoadingSlipForm';
import MemoForm from './forms/MemoForm';
import BillForm from './forms/BillForm';
import type { LoadingSlip } from '../types';

const LoadingSlipComponent: React.FC = () => {
  const { loadingSlips, memos, bills, vehicles, addLoadingSlip, updateLoadingSlip, deleteLoadingSlip } = useDataStore();
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

  const handleCreateLoadingSlip = async (slipData: Omit<LoadingSlip, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await apiService.createLoadingSlip(slipData);
      addLoadingSlip(response.loadingSlip);
      console.log('Loading slip created and synced to MongoDB:', response.loadingSlip);
      
      // Force refresh data on all connected devices by triggering a sync
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('data-sync-required'));
      }, 1000);
    } catch (error) {
      console.error('Failed to create loading slip:', error);
      const newSlip: LoadingSlip = {
        ...slipData,
        id: getNextSequenceNumber(loadingSlips, 'slip_number', 'LS'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addLoadingSlip(newSlip);
    }
    setShowForm(false);
  };

  const handleUpdateLoadingSlip = async (loadingSlipData: Omit<LoadingSlip, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingSlip) {
      try {
        const response = await apiService.updateLoadingSlip(editingSlip.id, loadingSlipData);
        updateLoadingSlip(response.loadingSlip);
        console.log('Loading slip updated and synced:', response.loadingSlip);
      } catch (error) {
        console.error('Failed to update loading slip:', error);
        const updatedLoadingSlip: LoadingSlip = {
          ...editingSlip,
          ...loadingSlipData,
          updated_at: new Date().toISOString(),
        };
        updateLoadingSlip(updatedLoadingSlip);
      }
      setEditingSlip(null);
      setShowForm(false);
    }
  };

  const handleDownloadPDF = async (slip: LoadingSlip) => {
    try {
      const { generateLoadingSlipPDF } = await import('../utils/pdfGenerator');
      await generateLoadingSlipPDF(slip);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleDeleteLoadingSlip = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this loading slip?')) {
      try {
        await apiService.deleteLoadingSlip(id);
        deleteLoadingSlip(id);
        console.log('Loading slip deleted and synced');
      } catch (error) {
        console.error('Failed to delete loading slip:', error);
        deleteLoadingSlip(id);
      }
    }
  };

  // Sort loading slips by document number (numeric part) in descending order, then by date
  const sortedSlips = [...loadingSlips].sort((a, b) => {
    // Extract numeric part from slip numbers for proper sorting
    const getNumericPart = (slipNumber: string) => {
      const match = slipNumber.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    };
    
    const aNum = getNumericPart(a.slip_number);
    const bNum = getNumericPart(b.slip_number);
    
    // Primary sort: by numeric part of slip number (descending)
    if (aNum !== bNum) {
      return bNum - aNum;
    }
    
    // Secondary sort: by date (descending - latest first)
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const filteredSlips = sortedSlips.filter((slip) => {
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
          onSubmit={editingSlip ? handleUpdateLoadingSlip : handleCreateLoadingSlip}
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
          {filteredSlips.map((slip, index) => {
            
            return (
            <div key={slip.id || `slip-${index}-${slip.slip_number}`} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
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
                        onClick={() => handleDeleteLoadingSlip(slip.id)}
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
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-gray-900">{slip.vehicle_no}</p>
                        {(() => {
                          const vehicle = vehicles.find(v => v.vehicle_no === slip.vehicle_no);
                          return vehicle ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              vehicle.ownership_type === 'own' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {vehicle.ownership_type === 'own' ? 'Own' : 'Market'}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <p className="text-sm text-gray-600">{slip.material || 'N/A'}</p>
                      <p className="text-sm text-gray-500">{slip.dimension}</p>
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
                      {slip.memo_number ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Memo:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {slip.memo_number}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            console.log('Setting selectedSlipForMemo:', slip);
                            console.log('Slip ID:', slip.id);
                            setSelectedSlipForMemo(slip);
                            setShowMemoForm(true);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Create Memo
                        </button>
                      )}
                      
                      {slip.bill_number ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Bill:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {slip.bill_number}
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
                        onClick={() => handleDeleteLoadingSlip(slip.id)}
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
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">Vehicle No:</span> 
                <span>{viewSlip.vehicle_no}</span>
                {(() => {
                  const vehicle = vehicles.find(v => v.vehicle_no === viewSlip.vehicle_no);
                  return vehicle ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      vehicle.ownership_type === 'own' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {vehicle.ownership_type === 'own' ? 'Own Vehicle' : 'Market Vehicle'}
                    </span>
                  ) : null;
                })()}
              </div>
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
          onSubmit={async (memoData) => {
            try {
              // Check authentication first
              const token = localStorage.getItem('auth_token');
              if (!token) {
                throw new Error('Authentication required - please log in');
              }
              
              // Ensure loading_slip_id is included in the memo data
              const memoDataWithSlipId = {
                ...memoData,
                loading_slip_id: selectedSlipForMemo?.id
              };
              
              console.log('LoadingSlip component - selectedSlipForMemo:', selectedSlipForMemo);
              console.log('LoadingSlip component - selectedSlipForMemo.id:', selectedSlipForMemo?.id);
              console.log('LoadingSlip component - memoData received:', memoData);
              console.log('LoadingSlip component - final data with slip ID:', memoDataWithSlipId);
              console.log('LoadingSlip component - auth token present:', !!token);
              
              if (!selectedSlipForMemo) {
                throw new Error('No loading slip selected for memo creation');
              }
              
              if (!selectedSlipForMemo.id) {
                throw new Error('Selected loading slip is missing ID field');
              }
              
              if (!memoDataWithSlipId.loading_slip_id) {
                throw new Error('Loading slip ID is missing - cannot create memo');
              }
              
              // Mark memo creation timestamp to prevent immediate sync overwrite
              localStorage.setItem('lastMemoCreation', Date.now().toString());
              
              // Create memo directly via API service to bypass sync issues
              const response = await apiService.createMemo(memoDataWithSlipId);
              console.log('Memo created successfully:', response);
              
              // Trigger immediate data refresh
              window.dispatchEvent(new CustomEvent('data-sync-required'));
              
              setShowMemoForm(false);
              setSelectedSlipForMemo(null);
              
              console.log('Memo created and sync triggered');
            } catch (error) {
              console.error('Failed to create memo - Full error details:', error);
              console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
              console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
              
              // Show user-friendly error message
              alert(`Failed to create memo: ${error instanceof Error ? error.message : 'Unknown error'}`);
              
              setShowMemoForm(false);
              setSelectedSlipForMemo(null);
            }
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
          onSubmit={async (billData) => {
            try {
              // Ensure loading_slip_id is included in the bill data
              const billDataWithSlipId = {
                ...billData,
                loading_slip_id: selectedSlipForBill?.id
              };
              
              console.log('LoadingSlip component - selectedSlipForBill:', selectedSlipForBill);
              console.log('LoadingSlip component - billData received:', billData);
              console.log('LoadingSlip component - final data with slip ID:', billDataWithSlipId);
              
              if (!billDataWithSlipId.loading_slip_id) {
                throw new Error('Loading slip ID is missing - cannot create bill');
              }
              
              // Mark bill creation timestamp to prevent immediate sync overwrite
              localStorage.setItem('lastBillCreation', Date.now().toString());
              
              // Create bill directly via API service to bypass sync issues
              const response = await apiService.createBill(billDataWithSlipId);
              console.log('Bill created successfully:', response);
              
              // Trigger immediate data refresh
              window.dispatchEvent(new CustomEvent('data-sync-required'));
              
              setShowBillForm(false);
              setSelectedSlipForBill(null);
              
              console.log('Bill created and sync triggered');
            } catch (error) {
              console.error('Failed to create bill:', error);
              setShowBillForm(false);
              setSelectedSlipForBill(null);
            }
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