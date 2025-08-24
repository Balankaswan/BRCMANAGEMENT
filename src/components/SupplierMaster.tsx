import React, { useState, useMemo } from 'react';
import { Truck, Plus, Search, FileText, AlertCircle } from 'lucide-react';
import { useDataStore } from '../lib/store';
import { getAllSupplierBalances } from '../utils/ledgerUtils';
import { formatCurrency } from '../utils/numberGenerator';
import SupplierLedger from './SupplierLedger';

interface SupplierMasterProps {
  onAddSupplier?: () => void;
}

const SupplierMaster: React.FC<SupplierMasterProps> = ({ onAddSupplier }) => {
  const { memos, bankingEntries } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [showLedger, setShowLedger] = useState(false);

  // Get all supplier balances
  const supplierBalances = useMemo(() => {
    return getAllSupplierBalances(memos, bankingEntries);
  }, [memos, bankingEntries]);

  // Filter suppliers based on search term
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return supplierBalances;
    
    return supplierBalances.filter(supplier =>
      supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [supplierBalances, searchTerm]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    return supplierBalances.reduce((acc, supplier) => ({
      totalSuppliers: acc.totalSuppliers + 1,
      totalOutstanding: acc.totalOutstanding + Math.max(0, supplier.outstandingAmount),
      totalOverpaid: acc.totalOverpaid + Math.max(0, -supplier.outstandingAmount),
      pendingSuppliers: acc.pendingSuppliers + (supplier.outstandingAmount > 0 ? 1 : 0)
    }), {
      totalSuppliers: 0,
      totalOutstanding: 0,
      totalOverpaid: 0,
      pendingSuppliers: 0
    });
  }, [supplierBalances]);

  const handleViewLedger = (supplierName: string) => {
    setSelectedSupplier(supplierName);
    setShowLedger(true);
  };

  if (showLedger && selectedSupplier) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowLedger(false)}
          className="flex items-center space-x-2 text-orange-600 hover:text-orange-800"
        >
          <span>← Back to Supplier Master</span>
        </button>
        <SupplierLedger selectedSupplier={selectedSupplier} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Truck className="w-8 h-8 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supplier Master</h1>
            <p className="text-gray-600">Manage transporters and track outstanding balances</p>
          </div>
        </div>
        {onAddSupplier && (
          <button
            onClick={onAddSupplier}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="text-sm text-orange-600 font-medium">Total Suppliers</div>
          <div className="text-2xl font-bold text-orange-900">{summary.totalSuppliers}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-sm text-red-600 font-medium">Total Outstanding</div>
          <div className="text-2xl font-bold text-red-900">{formatCurrency(summary.totalOutstanding)}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600 font-medium">Total Overpaid</div>
          <div className="text-2xl font-bold text-green-900">{formatCurrency(summary.totalOverpaid)}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-600 font-medium">Pending Suppliers</div>
          <div className="text-2xl font-bold text-yellow-900">{summary.pendingSuppliers}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Supplier List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Supplier List ({filteredSuppliers.length})
          </h3>
        </div>
        
        {filteredSuppliers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Name</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Memos (₹)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Detention (₹)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Extra Weight (₹)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Payments (₹)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding Balance (₹)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.map((supplier, index) => (
                  <tr key={supplier.supplierName} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{supplier.supplierName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600 font-medium">
                      {formatCurrency(supplier.totalMemos)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600 font-medium">
                      {formatCurrency(supplier.totalDetention)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-indigo-600 font-medium">
                      {formatCurrency(supplier.totalExtraWeight)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                      {formatCurrency(supplier.totalPayments)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                      supplier.outstandingAmount > 0 ? 'text-red-600' : 
                      supplier.outstandingAmount < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {formatCurrency(Math.abs(supplier.outstandingAmount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {supplier.outstandingAmount > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                      ) : supplier.outstandingAmount < 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Overpaid
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Cleared
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewLedger(supplier.supplierName)}
                          className="text-orange-600 hover:text-orange-900"
                          title="View Ledger"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'No suppliers found matching your search' : 'No suppliers found'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierMaster;
