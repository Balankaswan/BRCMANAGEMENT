import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, FileText, Calendar, DollarSign, CreditCard } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import { useDataStore } from '../lib/store';

interface PartyDetailProps {
  partyId?: string;
  partyName?: string;
  onNavigate?: (page: string, params?: any) => void;
}

interface PendingBill {
  billNo: string;
  billDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'pending' | 'partial' | 'paid';
}

const PartyDetail: React.FC<PartyDetailProps> = ({ partyId, partyName, onNavigate }) => {
  const { parties, bills, bankingEntries } = useDataStore();
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [partyInfo, setPartyInfo] = useState<any>(null);

  useEffect(() => {
    if (!partyName) return;

    // Find party info
    const party = parties.find(p => p.name === partyName || p.id === partyId);
    setPartyInfo(party);

    // Calculate pending bills for this party
    const partyBills = bills.filter(bill => bill.party === partyName);
    
    const pendingBillsData: PendingBill[] = [];

    partyBills.forEach(bill => {
      const billPayments = bankingEntries
        .filter(entry => entry.reference_id === bill.bill_number && entry.type === 'credit')
        .reduce((total, entry) => total + entry.amount, 0);
      
      // Calculate what party owes (excluding party commission cut)
      const totalAmount = bill.bill_amount + (bill.detention || 0) + (bill.extra || 0) + (bill.rto || 0) - (bill.mamool || 0) - (bill.tds || 0) - (bill.penalties || 0);
      const pendingAmount = totalAmount - billPayments;
      
      if (pendingAmount > 0) {
        pendingBillsData.push({
          billNo: bill.bill_number,
          billDate: bill.date,
          totalAmount,
          paidAmount: billPayments,
          pendingAmount,
          status: billPayments > 0 ? 'partial' : 'pending'
        });
      }
    });

    // Sort by date (newest first)
    pendingBillsData.sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
    setPendingBills(pendingBillsData);
  }, [partyName, partyId, parties, bills, bankingEntries]);

  const totalPendingAmount = pendingBills.reduce((sum, bill) => sum + bill.pendingAmount, 0);
  const activeTripCount = pendingBills.length;

  const handlePayNow = (billNo: string) => {
    // Navigate to banking entry with pre-filled data
    if (onNavigate) {
      onNavigate('banking', { 
        prefill: {
          type: 'credit',
          reference_id: billNo,
          party: partyName,
          category: 'Bill Payment'
        }
      });
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
              <p className="text-lg font-semibold text-gray-900 mt-2">{partyInfo?.contact_person || 'N/A'}</p>
              <p className="text-sm text-gray-500">{partyInfo?.phone || 'N/A'}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Bills Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Pending Bills</h3>
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              {pendingBills.length} Pending
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill Date
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
              {pendingBills.map((bill, index) => (
                <tr key={`${bill.billNo}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{bill.billNo}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {new Date(bill.billDate).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(bill.totalAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm text-gray-900">
                      {formatCurrency(bill.paidAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-bold text-red-600">
                      {formatCurrency(bill.pendingAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handlePayNow(bill.billNo)}
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

        {pendingBills.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending bills</h3>
            <p className="text-gray-500">All bills for this party have been paid</p>
          </div>
        )}
      </div>

      {/* Party Information */}
      {partyInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Party Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-sm text-gray-900 mt-1">{partyInfo.address || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">GST Number</label>
              <p className="text-sm text-gray-900 mt-1">{partyInfo.gst_number || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-sm text-gray-900 mt-1">{partyInfo.email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <p className="text-sm text-gray-900 mt-1">{partyInfo.phone || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyDetail;
