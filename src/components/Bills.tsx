import React, { useState, useMemo } from 'react';
import { Plus, FileText, Edit, Download, Eye, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import { getNextSequenceNumber } from '../utils/sequenceGenerator';
import BillForm from './forms/BillForm';
import { useDataStore } from '../lib/store';
import { apiService } from '../lib/api';
import type { Bill } from '../types';

interface BillsListProps {
  showOnlyFullyReceived?: boolean;
}

const BillsComponent: React.FC<BillsListProps> = ({ showOnlyFullyReceived = false }) => {
  const { bills, addBill, updateBill, deleteBill, bankingEntries, addBankingEntry, loadingSlips, markBillAsReceived } = useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [viewBill, setViewBill] = useState<Bill | null>(null);
  const [showReceivedModal, setShowReceivedModal] = useState<Bill | null>(null);
  const [receivedDate, setReceivedDate] = useState('');
  const [search, setSearch] = useState('');

  const handleCreateBill = async (billData: Omit<Bill, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await apiService.createBill(billData);
      addBill(response.bill);
      console.log('Bill created and synced to MongoDB:', response.bill);
      
      // Trigger sync across devices
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('data-sync-required'));
      }, 1000);
    } catch (error) {
      console.error('Failed to create bill:', error);
      // Fallback to local storage
      const newBill: Bill = {
        ...billData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addBill(newBill);
    }
    setShowForm(false);
  };


  const getNextBillNumber = () => {
    return getNextSequenceNumber(bills, 'bill_number', 'BL');
  };

  const handleUpdateBill = async (billData: Omit<Bill, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingBill) {
      try {
        const response = await apiService.updateBill(editingBill.id, billData);
        updateBill(response.bill);
        console.log('Bill updated and synced:', response.bill);
        
        // Trigger sync across devices
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('data-sync-required'));
        }, 1000);
      } catch (error) {
        console.error('Failed to update bill:', error);
        const updatedBill: Bill = {
          ...billData,
          id: editingBill.id,
          created_at: editingBill.created_at,
          updated_at: new Date().toISOString(),
        };
        updateBill(updatedBill);
      }
      setShowForm(false);
      setEditingBill(null);
    }
  };

  const handleDownloadPDF = async (bill: Bill) => {
    try {
      // Get advance payments from banking entries for this bill
      const advancePayments = bankingEntries
        .filter(e => e.category === 'bill_advance' && e.reference_id === bill.bill_number)
        .map(e => ({
          id: e.id || e._id || `advance-${Date.now()}-${Math.random()}`,
          bill_id: bill.id,
          date: e.date,
          amount: e.amount,
          mode: (e.payment_mode as 'cash' | 'bank' | 'other') || 'bank',
          reference: e.narration || e.reference_id
        }));

      // Create enhanced bill object with advance payments
      const enhancedBill = {
        ...bill,
        advance_payments: advancePayments
      };

      const { generateBillPDF } = await import('../utils/pdfGenerator');
      
      // Handle populated loading slip object in bill.loading_slip_id
      let relatedLoadingSlip;
      
      if (typeof bill.loading_slip_id === 'object' && bill.loading_slip_id !== null) {
        // Loading slip is already populated in the bill object
        relatedLoadingSlip = bill.loading_slip_id;
        console.log('Using populated loading slip from bill:', relatedLoadingSlip);
      } else {
        // Try to find loading slip by ID in local store
        relatedLoadingSlip = loadingSlips.find(ls => ls.id === bill.loading_slip_id || (ls as any)._id === bill.loading_slip_id);
        console.log('Found loading slip in local store:', relatedLoadingSlip);
      }
      
      if (relatedLoadingSlip) {
        await generateBillPDF(enhancedBill, relatedLoadingSlip);
      } else {
        console.error('Related loading slip not found for bill:', bill.id, 'loading_slip_id:', bill.loading_slip_id);
        alert('Related loading slip not found. Cannot generate PDF.');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleMarkAsReceived = (bill: Bill) => {
    setShowReceivedModal(bill);
    setReceivedDate(new Date().toISOString().split('T')[0]);
  };

  const confirmMarkAsReceived = async () => {
    if (showReceivedModal && receivedDate) {
      try {
        // Add banking entry for full payment received
        const bankingEntry = {
          id: Date.now().toString(),
          type: 'credit' as const,
          date: receivedDate,
          category: 'bill_payment' as const,
          narration: `Full payment received for Bill ${showReceivedModal.bill_number}`,
          amount: showReceivedModal.bill_amount,
          reference_id: showReceivedModal.bill_number,
          reference_name: showReceivedModal.party,
          created_at: new Date().toISOString()
        };
        
        await apiService.createBankingEntry(bankingEntry);
        addBankingEntry(bankingEntry);
        
        // Update bill status to received
        const updatedBillData = {
          ...showReceivedModal,
          status: 'received',
          received_date: receivedDate,
          received_amount: showReceivedModal.bill_amount
        };
        
        await apiService.updateBill(showReceivedModal.id, updatedBillData);
        markBillAsReceived(showReceivedModal.id, receivedDate, showReceivedModal.bill_amount);
        
        // Trigger sync across devices
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('data-sync-required'));
        }, 1000);
        
        console.log('Bill marked as received and synced');
      } catch (error) {
        console.error('Failed to mark bill as received:', error);
        // Fallback to local update
        addBankingEntry({
          id: Date.now().toString(),
          type: 'credit' as const,
          date: receivedDate,
          category: 'bill_payment' as const,
          narration: `Full payment received for Bill ${showReceivedModal.bill_number}`,
          amount: showReceivedModal.bill_amount,
          reference_id: showReceivedModal.bill_number,
          reference_name: showReceivedModal.party,
          created_at: new Date().toISOString()
        });
        markBillAsReceived(showReceivedModal.id, receivedDate, showReceivedModal.bill_amount);
      }
      setShowReceivedModal(null);
      setReceivedDate('');
    }
  };

  const handleDeleteBill = async (bill: Bill) => {
    if (window.confirm(`Are you sure you want to delete Bill #${bill.bill_number}?`)) {
      try {
        console.log('Deleting bill with ID:', bill.id);
        await apiService.deleteBill(bill.id);
        deleteBill(bill.id);
        console.log('Bill deleted successfully');
        window.dispatchEvent(new CustomEvent('data-sync-required'));
      } catch (error) {
        console.error('Failed to delete bill:', error);
        deleteBill(bill.id); // Fallback to local deletion
      }
    }
  };

  const filteredBills = useMemo(() => {
    // Main list shows only pending; Received Bills view shows only received
    let base = showOnlyFullyReceived ? bills.filter((b: any) => b.status === 'received') : bills.filter((b: any) => b.status !== 'received');
    
    // Sort bills by document number (numeric part) in descending order, then by date
    base = [...base].sort((a, b) => {
      // Extract numeric part from bill numbers for proper sorting
      const getNumericPart = (billNumber: string) => {
        const match = billNumber.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      };
      
      const aNum = getNumericPart(a.bill_number);
      const bNum = getNumericPart(b.bill_number);
      
      // Primary sort: by numeric part of bill number (descending)
      if (aNum !== bNum) {
        return bNum - aNum;
      }
      
      // Secondary sort: by date (descending - latest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    // Optional strict settlement check (kept)
    if (showOnlyFullyReceived) {
      base = base.filter(b => {
        const received = bankingEntries
          .filter(e => (e.category === 'bill_advance' || e.category === 'bill_payment') && e.reference_id === b.bill_number)
          .reduce((sum, e) => sum + e.amount, 0);
        return received >= b.net_amount && b.net_amount > 0;
      });
    }
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(b => {
      // Handle both cases: loading_slip_id as string or populated object
      const ls = typeof b.loading_slip_id === 'object' && b.loading_slip_id !== null 
        ? b.loading_slip_id 
        : loadingSlips.find(ls => ls.id === b.loading_slip_id);
      const haystack = [
        b.bill_number,
        b.party,
        new Date(b.date).toLocaleDateString('en-IN'),
        String(b.bill_amount),
        String(b.net_amount),
        ls?.vehicle_no || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [bills, bankingEntries, showOnlyFullyReceived, search, loadingSlips]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Bill</span>
        </button>
      </div>

      {showForm && (
        <BillForm
          initialData={editingBill}
          nextBillNumber={getNextBillNumber()}
          onSubmit={editingBill ? handleUpdateBill : handleCreateBill}
          onCancel={() => {
            setShowForm(false);
            setEditingBill(null);
          }}
        />
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bills by bill number, party name, route, or vehicle..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Bills Cards */}
      {filteredBills.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
          <p className="text-gray-500">Create bills from loading slips</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBills.map((bill: Bill, index: number) => {
            // Handle both cases: loading_slip_id as string or populated object
            const loadingSlip = typeof bill.loading_slip_id === 'object' && bill.loading_slip_id !== null 
              ? bill.loading_slip_id 
              : loadingSlips.find(ls => ls.id === bill.loading_slip_id);
            const received = bankingEntries
              .filter(e => (e.category === 'bill_advance' || e.category === 'bill_payment') && e.reference_id === bill.bill_number)
              .reduce((sum, e) => sum + e.amount, 0);
            // Calculate net amount including all charges
            const netAmount = bill.bill_amount + (bill.detention || 0) + (bill.extra || 0) + (bill.rto || 0) - (bill.mamool || 0) - (bill.penalties || 0) - (bill.tds || 0);
            const balance = netAmount - received;
            const trips = 1; // Default trips count
            
            return (
              <div key={bill.id || `bill-${index}-${bill.bill_number}`} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="text-lg font-semibold text-blue-600">
                          Bill #{bill.bill_number}
                        </h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <span>Trips: {trips}</span>
                          <span className={`font-medium ${
                            balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            Balance: {formatCurrency(Math.abs(balance))}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        {new Date(bill.date).toLocaleDateString('en-IN')} • {bill.party}
                        {showOnlyFullyReceived && bill.received_date && (
                          <span className="text-green-600 ml-2">
                            • Received: {new Date(bill.received_date).toLocaleDateString('en-IN')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Total Freight: <span className="font-medium">{formatCurrency(netAmount)}</span>
                        <span className="ml-4">Advances: {received > 0 ? formatCurrency(received) : '0'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewBill(bill)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingBill(bill);
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(bill)}
                        className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {!showOnlyFullyReceived && (
                        <button
                          onClick={() => handleMarkAsReceived(bill)}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                          title="Mark as Received"
                        >
                          Mark as Received
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteBill(bill)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Loading Slip Details */}
                  {loadingSlip && (
                    <div className="bg-blue-50 rounded-lg p-4 mt-4 border border-blue-200">
                      <div className="text-xs text-blue-600 uppercase tracking-wide mb-2 font-medium">Loading Slip Details:</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Route</div>
                          <div className="text-sm font-medium text-gray-900">{loadingSlip.from_location} → {loadingSlip.to_location}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Vehicle</div>
                          <div className="text-sm font-medium text-gray-900">{loadingSlip.vehicle_no}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Material</div>
                          <div className="text-sm font-medium text-gray-900">{loadingSlip.material || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Weight</div>
                          <div className="text-sm font-medium text-gray-900">{loadingSlip.weight} MT</div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-xs text-gray-500">Supplier</div>
                            <div className="text-sm font-medium text-gray-900">{loadingSlip.supplier}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Bill Amount</div>
                            <div className="text-lg font-bold text-blue-600">{formatCurrency(bill.bill_amount)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewBill && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Bill #{viewBill.bill_number}</h3>
              <button onClick={() => setViewBill(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Date:</span> {new Date(viewBill.date).toLocaleDateString('en-IN')}</div>
              <div><span className="text-gray-500">Party:</span> {viewBill.party}</div>
              <div><span className="text-gray-500">Bill Amount:</span> {formatCurrency(viewBill.bill_amount)}</div>
              <div><span className="text-gray-500">Deductions:</span> {formatCurrency(viewBill.mamool + viewBill.tds + viewBill.penalties)}</div>
              <div className="col-span-2"><span className="text-gray-500">Net Amount:</span> {formatCurrency(viewBill.net_amount)}</div>
              <div className="col-span-2 flex items-center space-x-2">
                <span className="text-gray-500">POD:</span>
                <span className="text-green-600 flex items-center space-x-1"><FileText className="w-4 h-4" /><span>Available</span></span>
              </div>
              {viewBill.narration && (
                <div className="col-span-2">
                  <span className="text-gray-500">Narration:</span>
                  <p className="mt-1 text-gray-900">{viewBill.narration}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button onClick={() => setViewBill(null)} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Received Modal */}
      {showReceivedModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Mark Bill as Received</h3>
              <button onClick={() => setShowReceivedModal(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Bill #{showReceivedModal.bill_number} - {showReceivedModal.party}
                </p>
                <p className="text-lg font-semibold text-green-600">
                  Amount: {formatCurrency(showReceivedModal.bill_amount)}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Received Date
                </label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button 
                onClick={() => setShowReceivedModal(null)}
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={confirmMarkAsReceived}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              >
                Mark as Received
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillsComponent;