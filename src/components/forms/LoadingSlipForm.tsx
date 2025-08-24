import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../utils/numberGenerator';
import PDFGenerator from '../PDFGenerator';
import { useDataStore } from '../../lib/store';
import type { LoadingSlip } from '../../types';

interface LoadingSlipFormProps {
  initialData?: LoadingSlip | null;
  nextSlipNumber: string;
  onSubmit: (data: Omit<LoadingSlip, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

const LoadingSlipForm: React.FC<LoadingSlipFormProps> = ({ initialData, nextSlipNumber, onSubmit, onCancel }) => {
  const { parties, suppliers, vehicles, addParty, addSupplier } = useDataStore();
  const [formData, setFormData] = useState({
    slip_number: initialData ? initialData.slip_number : nextSlipNumber,
    date: new Date().toISOString().split('T')[0],
    party: '',
    vehicle_no: '',
    from_location: '',
    to_location: '',
    dimension: '',
    weight: 0,
    supplier: '',
    freight: 0,
    advance: 0,
    rto: 0,
    narration: '',
  });

  // Sample data for autocomplete - in real app, this would come from database
  const [locations] = useState(['HAZIRA', 'HYD', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Ahmedabad']);
  const [showNewPartyForm, setShowNewPartyForm] = useState(false);
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        slip_number: initialData.slip_number,
        date: initialData.date.split('T')[0],
        party: initialData.party,
        vehicle_no: initialData.vehicle_no,
        from_location: initialData.from_location,
        to_location: initialData.to_location,
        dimension: initialData.dimension,
        weight: initialData.weight,
        supplier: initialData.supplier,
        freight: initialData.freight,
        advance: initialData.advance,
        rto: initialData.rto,
        narration: initialData.narration || '',
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = formData.freight - formData.advance;
    const total_freight = formData.freight + formData.rto;
    
    onSubmit({
      ...formData,
      balance,
      total_freight,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleDropdownSelect = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Close all dropdowns
    setShowPartyDropdown(false);
    setShowSupplierDropdown(false);
    setShowVehicleDropdown(false);
    setShowFromDropdown(false);
    setShowToDropdown(false);
  };

  const handleAddNewParty = () => {
    if (newPartyName.trim()) {
      const newParty = {
        id: Date.now().toString(),
        name: newPartyName.trim(),
        contact: '',
        address: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      addParty(newParty);
      setFormData(prev => ({ ...prev, party: newPartyName.trim() }));
      setNewPartyName('');
      setShowNewPartyForm(false);
    }
  };

  const handleAddNewSupplier = () => {
    if (newSupplierName.trim()) {
      const newSupplier = {
        id: Date.now().toString(),
        name: newSupplierName.trim(),
        contact: '',
        address: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      addSupplier(newSupplier);
      setFormData(prev => ({ ...prev, supplier: newSupplierName.trim() }));
      setNewSupplierName('');
      setShowNewSupplierForm(false);
    }
  };

  const filterOptions = (options: any[], searchTerm: string) => {
    return options.filter(option => {
      const optionText = typeof option === 'string' ? option : option.vehicle_no || option.name || '';
      return optionText.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {initialData ? 'Edit Loading Slip' : 'New Loading Slip'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slip Number
              </label>
              <input
                type="text"
                name="slip_number"
                value={formData.slip_number}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Party (M/S)
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="party"
                  value={formData.party}
                  onChange={handleInputChange}
                  onFocus={() => setShowPartyDropdown(true)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <ChevronDown 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
                  onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                />
                {showPartyDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {parties.map((party) => (
                      <div
                        key={party.id}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, party: party.name }));
                          setShowPartyDropdown(false);
                        }}
                      >
                        {party.name}
                      </div>
                    ))}
                    <div className="border-t border-gray-200">
                      <div
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 cursor-pointer font-medium"
                        onClick={() => {
                          setShowNewPartyForm(true);
                          setShowPartyDropdown(false);
                        }}
                      >
                        + Add New Party
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle No
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="vehicle_no"
                  value={formData.vehicle_no}
                  onChange={handleInputChange}
                  onFocus={() => setShowVehicleDropdown(true)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <ChevronDown 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
                  onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
                />
                {showVehicleDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filterOptions(vehicles, formData.vehicle_no).map((vehicle, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                        onClick={() => handleDropdownSelect('vehicle_no', typeof vehicle === 'string' ? vehicle : vehicle.vehicle_no)}
                      >
                        {typeof vehicle === 'string' ? vehicle : vehicle.vehicle_no}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleInputChange}
                  onFocus={() => setShowSupplierDropdown(true)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <ChevronDown 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
                  onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                />
                {showSupplierDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {suppliers.map((supplier) => (
                      <div
                        key={supplier.id}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, supplier: supplier.name }));
                          setShowSupplierDropdown(false);
                        }}
                      >
                        {supplier.name}
                      </div>
                    ))}
                    <div className="border-t border-gray-200">
                      <div
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 cursor-pointer font-medium"
                        onClick={() => {
                          setShowNewSupplierForm(true);
                          setShowSupplierDropdown(false);
                        }}
                      >
                        + Add New Supplier
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="from_location"
                  value={formData.from_location}
                  onChange={handleInputChange}
                  onFocus={() => setShowFromDropdown(true)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <ChevronDown 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
                  onClick={() => setShowFromDropdown(!showFromDropdown)}
                />
                {showFromDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filterOptions(locations, formData.from_location).map((location, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                        onClick={() => handleDropdownSelect('from_location', location)}
                      >
                        {location}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="to_location"
                  value={formData.to_location}
                  onChange={handleInputChange}
                  onFocus={() => setShowToDropdown(true)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <ChevronDown 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
                  onClick={() => setShowToDropdown(!showToDropdown)}
                />
                {showToDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filterOptions(locations, formData.to_location).map((location, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                        onClick={() => handleDropdownSelect('to_location', location)}
                      >
                        {location}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dimension
              </label>
              <input
                type="text"
                name="dimension"
                value={formData.dimension}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 20ft x 8ft x 8ft"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight (MT)
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Freight (₹)
              </label>
              <input
                type="number"
                name="freight"
                value={formData.freight}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Advance (₹)
              </label>
              <input
                type="number"
                name="advance"
                value={formData.advance}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RTO (₹)
              </label>
              <input
                type="number"
                name="rto"
                value={formData.rto}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Narration Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Narration
            </label>
            <textarea
              name="narration"
              value={formData.narration}
              onChange={(e) => setFormData(prev => ({ ...prev, narration: e.target.value }))}
              placeholder="Enter narration or remarks"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Calculated Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Balance (Freight - Advance)
              </label>
              <div className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                {formatCurrency(formData.freight - formData.advance)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Freight (Freight + RTO)
              </label>
              <div className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                {formatCurrency(formData.freight + formData.rto)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div>
              {initialData && (
                <PDFGenerator
                  type="loading-slip"
                  data={initialData}
                  size="md"
                />
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {initialData ? 'Update' : 'Create'} Loading Slip
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* New Party Modal */}
      {showNewPartyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Party</h3>
            <input
              type="text"
              value={newPartyName}
              onChange={(e) => setNewPartyName(e.target.value)}
              placeholder="Enter party name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewPartyForm(false);
                  setNewPartyName('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNewParty}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={!newPartyName.trim()}
              >
                Add Party
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {showNewSupplierForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Supplier</h3>
            <input
              type="text"
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              placeholder="Enter supplier name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewSupplierForm(false);
                  setNewSupplierName('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNewSupplier}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={!newSupplierName.trim()}
              >
                Add Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingSlipForm;