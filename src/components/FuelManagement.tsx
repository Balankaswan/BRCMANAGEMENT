import React, { useState, useMemo } from 'react';
import { Plus, Fuel, Truck, Wallet, UserPlus } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import { useDataStore } from '../lib/store';
import type { BankingEntry, Vehicle } from '../types';

const FuelManagement: React.FC = () => {
  const { 
    fuelWallets, 
    vehicleFuelExpenses, 
    vehicles, 
    addBankingEntry, 
    allocateFuelToVehicle,
    getVehicleFuelExpenses,
    addVehicle 
  } = useDataStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'allocate' | 'wallets' | 'vehicles' | 'add-vehicle'>('dashboard');
  const [selectedWallet, setSelectedWallet] = useState('BPCL');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [allocationForm, setAllocationForm] = useState({
    amount: '',
    fuelQuantity: '',
    ratePerLiter: '',
    odometerReading: '',
    narration: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [walletCreditForm, setWalletCreditForm] = useState({
    walletName: 'BPCL',
    amount: '',
    narration: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [newVehicleForm, setNewVehicleForm] = useState({
    vehicleNo: '',
    vehicleType: 'Truck',
    ownerName: '',
    driverName: '',
    driverPhone: ''
  });

  // Calculate totals
  const totalWalletBalance = fuelWallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const totalFuelAllocated = vehicleFuelExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalVehicles = vehicles.length;

  // Handle new vehicle registration
  const handleAddVehicle = () => {
    if (!newVehicleForm.vehicleNo) return;

    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      vehicle_no: newVehicleForm.vehicleNo.toUpperCase(),
      vehicle_type: newVehicleForm.vehicleType,
      owner_name: newVehicleForm.ownerName || undefined,
      driver_name: newVehicleForm.driverName || undefined,
      driver_phone: newVehicleForm.driverPhone || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    addVehicle(newVehicle);
    setNewVehicleForm({
      vehicleNo: '',
      vehicleType: 'Truck',
      ownerName: '',
      driverName: '',
      driverPhone: ''
    });
    setActiveTab('vehicles');
  };

  // Handle wallet credit (from bank)
  const handleWalletCredit = () => {
    if (!walletCreditForm.amount || !walletCreditForm.walletName) return;

    const bankingEntry: BankingEntry = {
      id: Date.now().toString(),
      type: 'debit',
      category: 'fuel_wallet',
      amount: parseFloat(walletCreditForm.amount),
      date: walletCreditForm.date,
      reference_name: walletCreditForm.walletName,
      narration: walletCreditForm.narration || `Fuel wallet credit to ${walletCreditForm.walletName}`,
      created_at: new Date().toISOString()
    };

    addBankingEntry(bankingEntry);
    setWalletCreditForm({
      walletName: 'BPCL',
      amount: '',
      narration: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Handle fuel allocation to vehicle
  const handleFuelAllocation = () => {
    if (!selectedVehicle || !selectedWallet || !allocationForm.amount) return;

    const amount = parseFloat(allocationForm.amount);
    const fuelQuantity = allocationForm.fuelQuantity ? parseFloat(allocationForm.fuelQuantity) : undefined;
    const ratePerLiter = allocationForm.ratePerLiter ? parseFloat(allocationForm.ratePerLiter) : undefined;
    const odometerReading = allocationForm.odometerReading ? parseInt(allocationForm.odometerReading) : undefined;

    allocateFuelToVehicle(
      selectedVehicle,
      selectedWallet,
      amount,
      allocationForm.date,
      allocationForm.narration,
      fuelQuantity,
      ratePerLiter,
      odometerReading
    );

    setAllocationForm({
      amount: '',
      fuelQuantity: '',
      ratePerLiter: '',
      odometerReading: '',
      narration: '',
      date: new Date().toISOString().split('T')[0]
    });
    setSelectedVehicle('');
  };

  // Get vehicle fuel summary
  const vehicleFuelSummary = useMemo(() => {
    return vehicles.map(vehicle => {
      const expenses = getVehicleFuelExpenses(vehicle.vehicle_no);
      const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalQuantity = expenses.reduce((sum, exp) => sum + (exp.fuel_quantity || 0), 0);
      return {
        vehicleNo: vehicle.vehicle_no,
        vehicle,
        totalExpense,
        totalQuantity,
        expenseCount: expenses.length,
        lastFuelDate: expenses.length > 0 ? expenses[0].date : null
      };
    });
  }, [vehicles, vehicleFuelExpenses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Fuel Management</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('allocate')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'allocate'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Allocate Fuel
          </button>
          <button
            onClick={() => setActiveTab('wallets')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'wallets'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Fuel Wallets
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'vehicles'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Vehicles
          </button>
          <button
            onClick={() => setActiveTab('add-vehicle')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'add-vehicle'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <UserPlus className="w-4 h-4 inline-block mr-2" />
            Add Vehicle
          </button>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Wallet Balance</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{formatCurrency(totalWalletBalance)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Fuel Allocated</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(totalFuelAllocated)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Fuel className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Vehicles</p>
                  <p className="text-2xl font-bold text-purple-600 mt-2">{totalVehicles}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Fuel Wallets Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Fuel Wallets</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {fuelWallets.map((wallet) => (
                  <div key={wallet.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{wallet.name}</h4>
                      <Fuel className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className={`text-xl font-bold ${wallet.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(wallet.balance)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Updated: {new Date(wallet.updated_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Fuel Tab */}
      {activeTab === 'allocate' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Allocate Fuel to Vehicle</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.vehicle_no}>{vehicle.vehicle_no}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Wallet</label>
                <select
                  value={selectedWallet}
                  onChange={(e) => setSelectedWallet(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {fuelWallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.name}>
                      {wallet.name} - {formatCurrency(wallet.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  value={allocationForm.amount}
                  onChange={(e) => setAllocationForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={allocationForm.date}
                  onChange={(e) => setAllocationForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Quantity (Liters)</label>
                <input
                  type="number"
                  value={allocationForm.fuelQuantity}
                  onChange={(e) => setAllocationForm(prev => ({ ...prev, fuelQuantity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rate per Liter</label>
                <input
                  type="number"
                  value={allocationForm.ratePerLiter}
                  onChange={(e) => setAllocationForm(prev => ({ ...prev, ratePerLiter: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Odometer Reading</label>
                <input
                  type="number"
                  value={allocationForm.odometerReading}
                  onChange={(e) => setAllocationForm(prev => ({ ...prev, odometerReading: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
                <input
                  type="text"
                  value={allocationForm.narration}
                  onChange={(e) => setAllocationForm(prev => ({ ...prev, narration: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleFuelAllocation}
                disabled={!selectedVehicle || !selectedWallet || !allocationForm.amount}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Fuel className="w-4 h-4" />
                <span>Allocate Fuel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fuel Wallets Tab */}
      {activeTab === 'wallets' && (
        <div className="space-y-6">
          {/* Add Credit to Wallet */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Add Credit to Fuel Wallet</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Wallet</label>
                <select
                  value={walletCreditForm.walletName}
                  onChange={(e) => setWalletCreditForm(prev => ({ ...prev, walletName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {fuelWallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.name}>{wallet.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  value={walletCreditForm.amount}
                  onChange={(e) => setWalletCreditForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={walletCreditForm.date}
                  onChange={(e) => setWalletCreditForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
                <input
                  type="text"
                  value={walletCreditForm.narration}
                  onChange={(e) => setWalletCreditForm(prev => ({ ...prev, narration: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Payment reference or notes"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleWalletCredit}
                disabled={!walletCreditForm.amount || !walletCreditForm.walletName}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Credit</span>
              </button>
            </div>
          </div>

          {/* Wallet Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Wallet Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wallet Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fuelWallets.map((wallet) => (
                    <tr key={wallet.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {wallet.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-semibold ${wallet.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(wallet.balance)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(wallet.updated_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Reports Tab */}
      {activeTab === 'vehicles' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Vehicle Fuel Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Expense
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Quantity (L)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fuel Entries
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Fuel Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicleFuelSummary.map((summary) => (
                    <tr key={summary.vehicleNo} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center space-x-2">
                          <Truck className="w-4 h-4 text-gray-400" />
                          <span>{summary.vehicleNo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(summary.totalExpense)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {summary.totalQuantity.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {summary.expenseCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {summary.lastFuelDate ? new Date(summary.lastFuelDate).toLocaleDateString('en-IN') : 'No fuel records'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Tab */}
      {activeTab === 'add-vehicle' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Register New Vehicle</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number *</label>
              <input
                type="text"
                value={newVehicleForm.vehicleNo}
                onChange={(e) => setNewVehicleForm(prev => ({ ...prev, vehicleNo: e.target.value.toUpperCase() }))}
                placeholder="e.g., GJ01AB1234"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
              <select
                value={newVehicleForm.vehicleType}
                onChange={(e) => setNewVehicleForm(prev => ({ ...prev, vehicleType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Truck">Truck</option>
                <option value="Trailer">Trailer</option>
                <option value="Container">Container</option>
                <option value="Tanker">Tanker</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Owner Name</label>
              <input
                type="text"
                value={newVehicleForm.ownerName}
                onChange={(e) => setNewVehicleForm(prev => ({ ...prev, ownerName: e.target.value }))}
                placeholder="Vehicle owner name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Driver Name</label>
              <input
                type="text"
                value={newVehicleForm.driverName}
                onChange={(e) => setNewVehicleForm(prev => ({ ...prev, driverName: e.target.value }))}
                placeholder="Driver name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Driver Phone</label>
              <input
                type="tel"
                value={newVehicleForm.driverPhone}
                onChange={(e) => setNewVehicleForm(prev => ({ ...prev, driverPhone: e.target.value }))}
                placeholder="Driver phone number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleAddVehicle}
              disabled={!newVehicleForm.vehicleNo}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4 inline-block mr-2" />
              Register Vehicle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelManagement;
