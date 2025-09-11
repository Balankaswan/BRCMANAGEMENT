import React, { useState, useEffect } from 'react';
import { ArrowLeft, Truck, FileText, Calendar, DollarSign, CreditCard } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import { useDataStore } from '../lib/store';

interface SupplierDetailProps {
  supplierId?: string;
  supplierName?: string;
  onNavigate?: (page: string, params?: any) => void;
}

interface PendingMemo {
  memoNo: string;
  memoDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  vehicleNo: string;
  status: 'pending' | 'partial' | 'paid';
}

const SupplierDetail: React.FC<SupplierDetailProps> = ({ supplierId, supplierName, onNavigate }) => {
  const { suppliers, memos, vehicles, loadingSlips, bankingEntries } = useDataStore();
  const [pendingMemos, setPendingMemos] = useState<PendingMemo[]>([]);
  const [supplierInfo, setSupplierInfo] = useState<any>(null);

  useEffect(() => {
    if (!supplierName) return;

    // Find supplier info
    const supplier = suppliers.find(s => s.name === supplierName || s.id === supplierId);
    setSupplierInfo(supplier);

    // Calculate pending memos for this supplier (only market vehicles)
    const supplierMemos = memos.filter(memo => memo.supplier === supplierName);
    
    const pendingMemosData: PendingMemo[] = [];

    supplierMemos.forEach(memo => {
      // Handle both string loading_slip_id and populated object
      let loadingSlipId: string;
      if (typeof memo.loading_slip_id === 'string') {
        loadingSlipId = memo.loading_slip_id;
      } else if (memo.loading_slip_id && typeof memo.loading_slip_id === 'object') {
        loadingSlipId = (memo.loading_slip_id as any)._id || (memo.loading_slip_id as any).id;
      } else {
        return; // Skip invalid loading slip IDs
      }
      
      // Find the loading slip and vehicle to check ownership
      const ls = loadingSlips.find(s => {
        const idMatch = s.id === loadingSlipId;
        const objectIdMatch = (s as any)._id === loadingSlipId;
        const objectIdStringMatch = String((s as any)._id) === String(loadingSlipId);
        return idMatch || objectIdMatch || objectIdStringMatch;
      });
      
      const vehicle = vehicles.find(v => v.vehicle_no === ls?.vehicle_no);
      
      // Only include market vehicles in supplier balance
      if (vehicle?.ownership_type !== 'market') {
        return;
      }

      // Check for payments made to this memo
      const memoPayments = bankingEntries
        .filter(entry => entry.reference_id === memo.memo_number && entry.type === 'debit')
        .reduce((total, entry) => total + entry.amount, 0);
      
      const totalAmount = memo.net_amount;
      const pendingAmount = totalAmount - memoPayments;
      
      if (pendingAmount > 0) {
        pendingMemosData.push({
          memoNo: memo.memo_number,
          memoDate: memo.date,
          totalAmount,
          paidAmount: memoPayments,
          pendingAmount,
          vehicleNo: ls?.vehicle_no || 'N/A',
          status: memoPayments > 0 ? 'partial' : 'pending'
        });
      }
    });

    // Sort by date (newest first)
    pendingMemosData.sort((a, b) => new Date(b.memoDate).getTime() - new Date(a.memoDate).getTime());
    setPendingMemos(pendingMemosData);
  }, [supplierName, supplierId, suppliers, memos, vehicles, loadingSlips, bankingEntries]);

  const totalPendingAmount = pendingMemos.reduce((sum, memo) => sum + memo.pendingAmount, 0);
  const activeTripCount = pendingMemos.length;

  const handlePayNow = (memoNo: string) => {
    // Navigate to banking entry with pre-filled data
    if (onNavigate) {
      onNavigate('banking', { 
        prefill: {
          type: 'debit',
          reference_id: memoNo,
          supplier: supplierName,
          category: 'Memo Payment'
        }
      });
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
              <p className="text-2xl font-bold text-blue-600 mt-2">{activeTripCount}</p>
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

      {/* Pending Memos Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Pending Memos (Market Vehicles Only)</h3>
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
              {pendingMemos.length} Pending
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Memo No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Memo Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount (₹)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid Amount (₹)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending Amount (₹)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingMemos.map((memo, index) => (
                <tr key={`${memo.memoNo}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{memo.memoNo}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Truck className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{memo.vehicleNo}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {new Date(memo.memoDate).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(memo.totalAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm text-gray-900">
                      {formatCurrency(memo.paidAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-bold text-orange-600">
                      {formatCurrency(memo.pendingAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handlePayNow(memo.memoNo)}
                      className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
                    >
                      Pay Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pendingMemos.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending memos</h3>
            <p className="text-gray-500">All memos for this supplier have been paid or no market vehicle trips found</p>
          </div>
        )}
      </div>

      {/* Supplier Information */}
      {supplierInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplier Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-sm text-gray-900 mt-1">{supplierInfo.address || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">GST Number</label>
              <p className="text-sm text-gray-900 mt-1">{supplierInfo.gst_number || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-sm text-gray-900 mt-1">{supplierInfo.email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <p className="text-sm text-gray-900 mt-1">{supplierInfo.phone || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDetail;
