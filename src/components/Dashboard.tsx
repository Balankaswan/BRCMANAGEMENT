import React from 'react';
import { TrendingUp, Users, Truck, DollarSign, FileText, Receipt } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import { useDataStore } from '../lib/store';

const Dashboard: React.FC = () => {
  const { memos, bills, bankingEntries, loadingSlips, vehicles } = useDataStore();

  // Calculate actual profit: Bill Net Amount (excluding TDS and Party Commission Cut) - Memo Net Amount
  // TDS is excluded as it's returnable and not a real deduction for profit calculation
  // Party Commission Cut is excluded as it's not part of the actual profit calculation
  const totalProfit = (() => {
    const totalBillNetAmount = bills.reduce((sum, bill) => {
      // Bill amount + detention + extra + rto - mamool - penalties - party_commission_cut (excluding TDS)
      const billNetAmountExcludingTDS = bill.bill_amount + (bill.detention || 0) + (bill.extra || 0) + (bill.rto || 0) - (bill.mamool || 0) - (bill.penalties || 0) - (bill.party_commission_cut || 0);
      return sum + billNetAmountExcludingTDS;
    }, 0);
    const totalMemoNetAmount = memos.reduce((sum, memo) => sum + memo.net_amount, 0);
    return totalBillNetAmount - totalMemoNetAmount;
  })();

  // Calculate party balance (bills due from parties)
  const partyBalance = bills.reduce((sum, bill) => {
    const billPayments = bankingEntries
      .filter(entry => entry.reference_id === bill.bill_number && entry.type === 'credit')
      .reduce((total, entry) => total + entry.amount, 0);
    return sum + (bill.net_amount - billPayments);
  }, 0);

  // Calculate supplier balance (memos due to suppliers - ONLY market vehicles)
  const supplierBalance = memos.reduce((sum, memo) => {
    // Find the loading slip and vehicle to check ownership
    const ls = loadingSlips.find(s => s.id === memo.loading_slip_id);
    const vehicle = vehicles.find(v => v.vehicle_no === ls?.vehicle_no);
    
    // Only include market vehicles in supplier balance
    if (vehicle?.ownership_type !== 'market') {
      return sum;
    }
    
    const memoPayments = bankingEntries
      .filter(entry => entry.reference_id === memo.memo_number && entry.type === 'debit')
      .reduce((total, entry) => total + entry.amount, 0);
    // Balance = freight - advance - commission - mamul + detention + extra
    const calculatedBalance = memo.freight - memoPayments - (memo.commission || 0) - (memo.mamool || 0) + (memo.detention || 0) + (memo.extra || 0);
    return sum + Math.max(0, calculatedBalance);
  }, 0);

  // Calculate monthly revenue (total bill amounts)
  const monthlyRevenue = bills.reduce((sum, bill) => sum + bill.bill_amount, 0);

  const stats = [
    {
      title: 'Total Profit (Bill - Memo)',
      value: formatCurrency(totalProfit),
      icon: TrendingUp,
      color: 'bg-green-50 text-green-700',
      iconBg: 'bg-green-100',
    },
    {
      title: 'Party Balance',
      value: formatCurrency(partyBalance),
      icon: Users,
      color: 'bg-blue-50 text-blue-700',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'Supplier Balance',
      value: formatCurrency(supplierBalance),
      icon: Truck,
      color: 'bg-orange-50 text-orange-700',
      iconBg: 'bg-orange-100',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(monthlyRevenue),
      icon: DollarSign,
      color: 'bg-purple-50 text-purple-700',
      iconBg: 'bg-purple-100',
    },
  ];

  // Get recent bills and memos from actual data
  const recentBills = bills.slice(0, 5).map((bill, index) => ({
    id: bill.id || `bill-${index}-${Date.now()}`,
    bill_number: bill.bill_number,
    party: bill.party,
    amount: bill.net_amount,
    date: bill.date,
    status: 'Pending' // TODO: Add status tracking
  }));

  const recentMemos = memos.slice(0, 5).map((memo, index) => ({
    id: memo.id || `memo-${index}-${Date.now()}`,
    memo_number: memo.memo_number,
    supplier: memo.supplier,
    amount: memo.net_amount,
    date: memo.date,
    status: 'Pending' // TODO: Add status tracking
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <input
            type="month"
            defaultValue="2025-08"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={`stat-${stat.title}-${index}`} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color.split(' ')[1]}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Bills</h3>
          </div>
          <div className="p-6">
            {recentBills.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent bills found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentBills.map((bill) => (
                  <div key={`bill-${bill.id}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{bill.bill_number}</div>
                      <div className="text-sm text-gray-500">{bill.party}</div>
                      <div className="text-xs text-gray-400">{new Date(bill.date).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{formatCurrency(bill.amount)}</div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bill.status === 'Paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {bill.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Memos</h3>
          </div>
          <div className="p-6">
            {recentMemos.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent memos found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMemos.map((memo) => (
                  <div key={`memo-${memo.id}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{memo.memo_number}</div>
                      <div className="text-sm text-gray-500">{memo.supplier}</div>
                      <div className="text-xs text-gray-400">{new Date(memo.date).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{formatCurrency(memo.amount)}</div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        memo.status === 'Paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {memo.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;