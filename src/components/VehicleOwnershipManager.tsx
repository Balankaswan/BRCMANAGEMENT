import React, { useState } from 'react';
import { Truck, Edit2, Save, X } from 'lucide-react';
import { useDataStore } from '../lib/store';
import { apiService } from '../lib/api';

const VehicleOwnershipManager: React.FC = () => {
  const { vehicles, updateVehicle, cleanupSupplierLedgerForOwnVehicles } = useDataStore();
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [tempOwnership, setTempOwnership] = useState<'own' | 'market'>('market');

  const handleEditOwnership = (vehicleId: string, currentOwnership: 'own' | 'market') => {
    setEditingVehicle(vehicleId);
    setTempOwnership(currentOwnership);
  };

  const handleSaveOwnership = async (vehicle: any) => {
    const updatedVehicle = {
      ...vehicle,
      ownership_type: tempOwnership,
      owner_name: tempOwnership === 'own' ? 'Bhavishya Road Carriers' : vehicle.owner_name
    };
    
    try {
      const vehicleId = vehicle._id || vehicle.id;
      if (!vehicleId) {
        console.error('Vehicle ID is missing:', vehicle);
        return;
      }
      const response = await apiService.updateVehicle(vehicleId, updatedVehicle);
      updateVehicle(response.vehicle);
      console.log('Vehicle ownership updated and synced:', response.vehicle);
    } catch (error) {
      console.error('Failed to update vehicle ownership:', error);
      updateVehicle(updatedVehicle);
    }
    
    // Clean up incorrect supplier ledger entries after updating ownership
    cleanupSupplierLedgerForOwnVehicles();
    
    setEditingVehicle(null);
  };

  const handleCancel = () => {
    setEditingVehicle(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vehicle Ownership Manager</h1>
        <div className="text-sm text-gray-600">
          Fix vehicle ownership types to ensure correct ledger entries
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Vehicles</h3>
          <p className="text-sm text-gray-600 mt-1">
            Change ownership type to fix supplier ledger issues
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {vehicles.map((vehicle, index) => (
              <div key={vehicle._id || vehicle.id || `vehicle-${vehicle.vehicle_no}-${index}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Truck className="w-6 h-6 text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">{vehicle.vehicle_no}</div>
                    <div className="text-sm text-gray-500">Owner: {vehicle.owner_name || 'Not specified'}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {editingVehicle === vehicle.id ? (
                    <div className="flex items-center space-x-2">
                      <select
                        value={tempOwnership}
                        onChange={(e) => setTempOwnership(e.target.value as 'own' | 'market')}
                        className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="own">Own Vehicle</option>
                        <option value="market">Market Vehicle</option>
                      </select>
                      <button
                        onClick={() => handleSaveOwnership(vehicle)}
                        className="p-1 text-green-600 hover:text-green-800"
                        title="Save"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="p-1 text-gray-600 hover:text-gray-800"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vehicle.ownership_type === 'own' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {vehicle.ownership_type === 'own' ? 'Own Vehicle' : 'Market Vehicle'}
                      </span>
                      <button
                        onClick={() => handleEditOwnership(vehicle.id, vehicle.ownership_type)}
                        className="p-1 text-gray-600 hover:text-gray-800"
                        title="Edit ownership"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {vehicles.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No vehicles found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleOwnershipManager;
