import React, { useState, useEffect } from 'react';
import { Truck, Search, Plus, Eye, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import { useDataStore } from '../lib/store';

interface SuppliersProps {
  onNavigate?: (page: string, params?: any) => void;
}

const Suppliers: React.FC<SuppliersProps> = ({ onNavigate }) => {
  const { suppliers, memos, vehicles, loadingSlips } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSuppliers, setFilteredSuppliers] = useState(suppliers);

  useEffect(() => {
    // Deduplicate suppliers by name first
    const uniqueSuppliers = suppliers.reduce((acc, supplier) => {
      const existing = acc.find(s => s.name === supplier.name);
      if (!existing) {
        acc.push(supplier);
      }
      return acc;
    }, [] as typeof suppliers);

    const filtered = uniqueSuppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSuppliers(filtered);
  }, [searchTerm, suppliers]);

  // Calculate supplier balance and active trips for each supplier (only market vehicles)
  const getSupplierStats = (supplierName: string) => {
    const supplierMemos = memos.filter(memo => memo.supplier === supplierName);
    
    let totalBalance = 0;
    let activeTripCount = 0;

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
      if (vehicle?.ownership_type === 'market') {
        totalBalance += memo.net_amount;
        activeTripCount++;
      }
    });

    return { totalBalance, activeTripCount };
  };

  const handleSupplierClick = (supplier: any) => {
    if (onNavigate) {
      onNavigate('supplier-detail', { supplierId: supplier.id, supplierName: supplier.name });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onNavigate?.('dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplier, index) => {
          const stats = getSupplierStats(supplier.name);
          
          return (
            <div
              key={`supplier-${supplier.id || supplier._id || supplier.name.replace(/\s+/g, '-')}-${index}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-orange-300 cursor-pointer transition-all duration-200"
              onClick={() => handleSupplierClick(supplier)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                    <p className="text-sm text-gray-500">{supplier.contact_person}</p>
                  </div>
                </div>
                <Eye className="w-5 h-5 text-gray-400" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Supplier Balance</span>
                  <span className="font-semibold text-lg text-orange-600">
                    {formatCurrency(stats.totalBalance)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Trips</span>
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm font-medium">
                    {stats.activeTripCount}
                  </span>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Phone:</span>
                    <span className="text-gray-900">{supplier.phone}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Location:</span>
                    <span className="text-gray-900">{supplier.address?.split(',')[0] || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button className="w-full bg-orange-50 text-orange-700 py-2 rounded-lg hover:bg-orange-100 transition-colors">
                  View Pending Memos →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12">
          <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No suppliers found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first supplier'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
