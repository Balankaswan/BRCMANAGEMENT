import React, { useState, useEffect } from 'react';
import { Filter, FileText, FileSpreadsheet, Search, Truck, Fuel } from 'lucide-react';
import { apiService } from '../lib/api';
import { format } from 'date-fns';

interface FuelTransaction {
  _id: string;
  type: 'debit' | 'credit' | 'fuel_allocation' | 'wallet_credit';
  wallet_name: string;
  amount: number;
  date: string;
  vehicle_no?: string;
  narration?: string;
  fuel_quantity?: number;
  rate_per_liter?: number;
  odometer_reading?: number;
  fuel_type?: string;
  allocated_by?: string;
  createdAt: string;
  updatedAt: string;
}

interface FilterOptions {
  dateFrom: string;
  dateTo: string;
  vehicleNo: string;
  fuelType: string;
  walletName: string;
}

const FuelAllocationLedger: React.FC = () => {
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<FuelTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filters, setFilters] = useState<FilterOptions>({
    dateFrom: '',
    dateTo: '',
    vehicleNo: '',
    fuelType: '',
    walletName: ''
  });

  const [summary, setSummary] = useState({
    totalAllocations: 0,
    totalAmount: 0,
    totalQuantity: 0,
    uniqueVehicles: 0
  });

  useEffect(() => {
    fetchFuelTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, filters, searchTerm]);

  const fetchFuelTransactions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getFuelTransactions();
      
      // Filter fuel allocation transactions (type: 'fuel_allocation' or 'debit')
      const allocations = response.transactions?.filter((t: FuelTransaction) => 
        t.type === 'debit' || t.type === 'fuel_allocation'
      ) || [];
      console.log('🔍 Fetched fuel transactions:', response.transactions?.length);
      console.log('🔍 Filtered allocations:', allocations.length);
      setTransactions(allocations);
      setError(null);
    } catch (err) {
      console.error('Error fetching fuel transactions:', err);
      setError('Failed to load fuel allocation data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Apply date filters
    if (filters.dateFrom) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      filtered = filtered.filter(t => new Date(t.date) <= new Date(filters.dateTo));
    }

    // Apply vehicle filter
    if (filters.vehicleNo) {
      filtered = filtered.filter(t => 
        t.vehicle_no?.toLowerCase().includes(filters.vehicleNo.toLowerCase())
      );
    }

    // Apply fuel type filter
    if (filters.fuelType) {
      filtered = filtered.filter(t => t.fuel_type === filters.fuelType);
    }

    // Apply wallet filter
    if (filters.walletName) {
      filtered = filtered.filter(t => 
        t.wallet_name?.toLowerCase().includes(filters.walletName.toLowerCase())
      );
    }

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.vehicle_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.wallet_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.narration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.allocated_by?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);

    // Calculate summary
    const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);
    const totalQuantity = filtered.reduce((sum, t) => sum + (t.fuel_quantity || 0), 0);
    const uniqueVehicles = new Set(filtered.map(t => t.vehicle_no).filter(Boolean)).size;

    setSummary({
      totalAllocations: filtered.length,
      totalAmount,
      totalQuantity,
      uniqueVehicles
    });
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      vehicleNo: '',
      fuelType: '',
      walletName: ''
    });
    setSearchTerm('');
  };

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Fuel Allocation Ledger Report', 14, 22);
      
      // Add summary
      doc.setFontSize(12);
      doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 35);
      doc.text(`Total Allocations: ${summary.totalAllocations}`, 14, 45);
      doc.text(`Total Amount: ${formatCurrency(summary.totalAmount)}`, 14, 55);
      doc.text(`Total Quantity: ${summary.totalQuantity.toFixed(2)} L`, 14, 65);
      doc.text(`Unique Vehicles: ${summary.uniqueVehicles}`, 14, 75);
      
      // Prepare table data
      const tableData = filteredTransactions.map(transaction => [
        formatDate(transaction.date),
        transaction.vehicle_no || 'N/A',
        transaction.fuel_type || 'Diesel',
        transaction.fuel_quantity ? `${transaction.fuel_quantity.toFixed(2)}` : 'N/A',
        transaction.rate_per_liter ? formatCurrency(transaction.rate_per_liter) : 'N/A',
        formatCurrency(transaction.amount),
        transaction.wallet_name,
        transaction.allocated_by || 'System',
        transaction.narration || 'N/A'
      ]);
      
      // Add table
      autoTable(doc, {
        head: [['Date', 'Vehicle', 'Fuel Type', 'Quantity (L)', 'Rate/L', 'Amount', 'Wallet', 'Allocated By', 'Narration']],
        body: tableData,
        startY: 85,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 25 },
          6: { cellWidth: 20 },
          7: { cellWidth: 20 },
          8: { cellWidth: 30 }
        }
      });
      
      // Save the PDF
      doc.save(`fuel-allocation-ledger-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      // Prepare data for Excel
      const excelData = filteredTransactions.map(transaction => ({
        'Date': formatDate(transaction.date),
        'Vehicle No': transaction.vehicle_no || 'N/A',
        'Fuel Type': transaction.fuel_type || 'Diesel',
        'Quantity (L)': transaction.fuel_quantity || 0,
        'Rate per Liter': transaction.rate_per_liter || 0,
        'Total Amount': transaction.amount,
        'Wallet Name': transaction.wallet_name,
        'Allocated By': transaction.allocated_by || 'System',
        'Narration': transaction.narration || 'N/A',
        'Odometer Reading': transaction.odometer_reading ? `${transaction.odometer_reading} km` : 'N/A',
        'Created At': format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm')
      }));
      
      // Add summary row
      excelData.unshift({
        'Date': 'SUMMARY',
        'Vehicle No': `Total Allocations: ${summary.totalAllocations}`,
        'Fuel Type': `Total Amount: ${formatCurrency(summary.totalAmount)}`,
        'Quantity (L)': `Total Quantity: ${summary.totalQuantity.toFixed(2)} L` as any,
        'Rate per Liter': `Unique Vehicles: ${summary.uniqueVehicles}` as any,
        'Total Amount': `Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}` as any,
        'Wallet Name': '',
        'Allocated By': '',
        'Narration': '',
        'Odometer Reading': '',
        'Created At': ''
      });
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      const colWidths = [
        { wch: 12 }, // Date
        { wch: 15 }, // Vehicle No
        { wch: 12 }, // Fuel Type
        { wch: 12 }, // Quantity
        { wch: 15 }, // Rate per Liter
        { wch: 15 }, // Total Amount
        { wch: 15 }, // Wallet Name
        { wch: 15 }, // Allocated By
        { wch: 30 }, // Narration
        { wch: 15 }, // Odometer Reading
        { wch: 18 }  // Created At
      ];
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Fuel Allocation Ledger');
      
      // Save the Excel file
      XLSX.writeFile(wb, `fuel-allocation-ledger-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading fuel allocation data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 text-sm">{error}</div>
          <button
            onClick={fetchFuelTransactions}
            className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Fuel className="mr-2 h-6 w-6 text-blue-600" />
            Fuel Allocation Ledger
          </h2>
          <p className="text-gray-600 mt-1">Detailed fuel allocation records with filtering and export options</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportToPDF}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-600 text-sm font-medium">Total Allocations</div>
          <div className="text-2xl font-bold text-blue-900">{summary.totalAllocations}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-600 text-sm font-medium">Total Amount</div>
          <div className="text-2xl font-bold text-green-900">{formatCurrency(summary.totalAmount)}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-purple-600 text-sm font-medium">Total Quantity</div>
          <div className="text-2xl font-bold text-purple-900">{summary.totalQuantity.toFixed(2)} L</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-orange-600 text-sm font-medium">Unique Vehicles</div>
          <div className="text-2xl font-bold text-orange-900">{summary.uniqueVehicles}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by vehicle, wallet, narration, or allocated by..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </button>
          </div>
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Clear All
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No</label>
              <input
                type="text"
                placeholder="Enter vehicle number"
                value={filters.vehicleNo}
                onChange={(e) => setFilters(prev => ({ ...prev, vehicleNo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
              <select
                value={filters.fuelType}
                onChange={(e) => setFilters(prev => ({ ...prev, fuelType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="Diesel">Diesel</option>
                <option value="Petrol">Petrol</option>
                <option value="CNG">CNG</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Name</label>
              <input
                type="text"
                placeholder="Enter wallet name"
                value={filters.walletName}
                onChange={(e) => setFilters(prev => ({ ...prev, walletName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Fuel Allocation Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity (L)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/Liter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Odometer</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    <Fuel className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                    <div className="text-lg font-medium">No fuel allocations found</div>
                    <div className="text-sm">Try adjusting your filters or search criteria</div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Truck className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {transaction.vehicle_no || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.fuel_type === 'Diesel' ? 'bg-blue-100 text-blue-800' :
                        transaction.fuel_type === 'Petrol' ? 'bg-green-100 text-green-800' :
                        transaction.fuel_type === 'CNG' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.fuel_type || 'Diesel'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.fuel_quantity ? `${transaction.fuel_quantity.toFixed(2)}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.rate_per_liter ? formatCurrency(transaction.rate_per_liter) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.wallet_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.allocated_by || 'System'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {transaction.narration || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.odometer_reading ? `${transaction.odometer_reading} km` : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Summary */}
      {filteredTransactions.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center text-sm">
            <div className="text-gray-600">
              Showing {filteredTransactions.length} of {transactions.length} fuel allocations
            </div>
            <div className="flex space-x-6 text-gray-900 font-medium">
              <span>Total Amount: {formatCurrency(summary.totalAmount)}</span>
              <span>Total Quantity: {summary.totalQuantity.toFixed(2)} L</span>
              <span>Vehicles: {summary.uniqueVehicles}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelAllocationLedger;
