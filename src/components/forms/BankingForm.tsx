import React, { useState, useMemo } from 'react';
import { X, ChevronDown, Plus, CreditCard } from 'lucide-react';
import { useDataStore } from '../../lib/store';
import { apiService } from '../../lib/api';
import { formatCurrency } from '../../utils/numberGenerator';
import type { BankingEntry } from '../../types';

interface BankingFormProps {
  onSubmit: (data: Omit<BankingEntry, 'id' | 'created_at'>) => void;
  onCancel: () => void;
  editingEntry?: BankingEntry | null;
}

const BankingForm: React.FC<BankingFormProps> = ({ onSubmit, onCancel, editingEntry }) => {
  const { memos, bills, ledgerEntries, parties, vehicles, loadingSlips } = useDataStore();
  const [formData, setFormData] = useState({
    type: editingEntry?.type || 'credit' as 'credit' | 'debit',
    category: editingEntry?.category || 'other' as 'bill_advance' | 'bill_payment' | 'memo_advance' | 'memo_payment' | 'expense' | 'fuel_wallet' | 'vehicle_expense' | 'vehicle_credit_note' | 'party_commission' | 'other',
    amount: editingEntry?.amount || 0,
    date: editingEntry?.date || new Date().toISOString().split('T')[0],
    reference_id: editingEntry?.reference_id || '',
    reference_name: editingEntry?.reference_name || '',
    narration: editingEntry?.narration || '',
    vehicle_no: editingEntry?.vehicle_no || '',
  });

  const existingMemos = useMemo(() => memos.map(m => m.memo_number), [memos]);
  const existingBills = useMemo(() => bills.map(b => b.bill_number), [bills]);
  const [showReferenceDropdown, setShowReferenceDropdown] = useState(false);
  const [showNewLedgerModal, setShowNewLedgerModal] = useState(false);
  const [newLedgerData, setNewLedgerData] = useState({
    name: '',
    type: 'expense' as 'expense' | 'income' | 'asset' | 'liability',
    description: '',
  });
  
  // Get existing general ledger names for expense dropdown
  const existingLedgerNames = useMemo(() => {
    const generalEntries = ledgerEntries.filter(entry => entry.ledger_type === 'general');
    const partyNames = parties.map(p => p.name).filter(Boolean);
    const ledgerNames = Array.from(new Set(
      generalEntries
        .map(entry => entry.reference_name)
        .filter(Boolean)
    ));
    return Array.from(new Set([...partyNames, ...ledgerNames])).sort();
  }, [ledgerEntries, parties]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create vehicle ledger entry for vehicle expenses
    if (formData.category === 'vehicle_expense' && formData.vehicle_no) {
      const vehicleLedgerEntry = {
        ledger_type: 'vehicle_expense',
        reference_id: formData.reference_id || `BANK-${Date.now()}`,
        reference_name: `Vehicle ${formData.vehicle_no} - ${formData.narration || 'Banking Expense'}`,
        date: formData.date,
        description: formData.narration || 'Vehicle expense from banking',
        debit: formData.amount,
        credit: 0,
        balance: 0,
        vehicle_no: formData.vehicle_no,
      };
      
      try {
        await apiService.createLedgerEntry(vehicleLedgerEntry);
        console.log('✅ Vehicle expense ledger entry created:', vehicleLedgerEntry);
      } catch (error) {
        console.error('❌ Failed to create vehicle expense ledger entry:', error);
      }
    }
    
    // Create party commission ledger entry for commission payments
    if (formData.category === 'party_commission' && formData.reference_name) {
      // Find the party ID for the reference
      const selectedParty = parties.find(p => p.name === formData.reference_name);
      const partyId = selectedParty ? selectedParty.id : formData.reference_name;
      
      const commissionLedgerEntry = {
        referenceId: partyId,
        ledger_type: 'commission',
        reference_name: selectedParty ? selectedParty.name : formData.reference_name,
        type: 'commission',
        date: formData.date,
        description: `Commission Payment – Bank Transfer`,
        narration: `Commission Payment – Bank Transfer`,
        debit: formData.amount,
        credit: 0,
        balance: 0,
        source_type: 'banking',
        partyId: partyId
      };
      
      console.log('🔍 Commission ledger entry to create:', commissionLedgerEntry);
      console.log('🔍 Party ID found:', partyId);
      
      try {
        await apiService.createLedgerEntry(commissionLedgerEntry);
        console.log('✅ Party commission ledger entry created:', commissionLedgerEntry);
      } catch (error) {
        console.error('❌ Failed to create party commission ledger entry:', error);
      }
    }
    
    onSubmit(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => {
      // if category changes, clear reference fields
      if (name === 'category') {
        return {
          ...prev,
          category: value as typeof prev.category,
          reference_id: '',
          reference_name: '',
        };
      }
      return {
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value,
      } as typeof prev;
    });
  };

  const getCategoryOptions = () => {
    if (formData.type === 'credit') {
      return [
        { value: 'bill_advance', label: 'Bill Advance' },
        { value: 'bill_payment', label: 'Bill Payment' },
        { value: 'vehicle_credit_note', label: 'Vehicle Credit Note (Insurance/Cashback)' },
        { value: 'other', label: 'Other Income' },
      ];
    } else {
      return [
        { value: 'memo_advance', label: 'Memo Advance' },
        { value: 'memo_payment', label: 'Memo Payment' },
        { value: 'expense', label: 'General Expense' },
        { value: 'vehicle_expense', label: 'Vehicle Expense' },
        { value: 'fuel_wallet', label: 'Fuel Wallet Credit' },
        { value: 'party_commission', label: 'Party Commission Payment' },
        { value: 'other', label: 'Other Expense' },
      ];
    }
  };

  const needsReference = () => {
    return ['bill_advance', 'bill_payment', 'memo_advance', 'memo_payment', 'party_commission'].includes(formData.category);
  };

  const needsVehicle = () => {
    return formData.category === 'vehicle_expense' || formData.category === 'vehicle_credit_note';
  };

  const getOwnVehicles = () => {
    return vehicles.filter(v => v.ownership_type === 'own');
  };

  const getReferenceOptions = () => {
    if (formData.category.includes('bill')) {
      return existingBills;
    } else if (formData.category.includes('memo')) {
      return existingMemos;
    } else if (formData.category === 'party_commission') {
      return parties.map(p => p.name).filter(Boolean);
    }
    return [];
  };

  const handleReferenceSelect = (value: string) => {
    setFormData(prev => {
      let reference_name = prev.reference_name;
      if (prev.category.includes('bill')) {
        const bill = bills.find(b => b.bill_number === value);
        reference_name = bill?.party || '';
      } else if (prev.category.includes('memo')) {
        const memo = memos.find(m => m.memo_number === value);
        reference_name = memo?.supplier || '';
      } else if (prev.category === 'party_commission') {
        reference_name = value; // Party name is the reference_name for commission payments
      }
      return {
        ...prev,
        reference_id: value,
        reference_name,
      };
    });
    setShowReferenceDropdown(false);
  };

  const handleCreateNewLedger = () => {
    setNewLedgerData({
      name: formData.reference_name,
      type: formData.type === 'debit' ? 'expense' : 'income',
      description: '',
    });
    setShowNewLedgerModal(true);
    setShowReferenceDropdown(false);
  };

  const handleNewLedgerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add the new ledger name to form data
    setFormData(prev => ({ ...prev, reference_name: newLedgerData.name }));
    setShowNewLedgerModal(false);
    setNewLedgerData({ name: '', type: 'expense', description: '' });
  };

  const handleNewLedgerInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewLedgerData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingEntry ? 'Edit Banking Entry' : 'New Banking Entry'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entry Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="credit">Credit (Money In)</option>
                <option value="debit">Debit (Money Out)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {getCategoryOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₹)
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
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
          </div>

          {needsReference() && (
            <>
              {/* Party Selection for Bill Advance and Bill Payment */}
              {(formData.category === 'bill_advance' || formData.category === 'bill_payment') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Party
                  </label>
                  <div className="relative">
                    <select
                      name="reference_name"
                      value={formData.reference_name}
                      onChange={(e) => {
                        const selectedParty = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          reference_name: selectedParty,
                          reference_id: '' // Clear bill selection when party changes
                        }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Party</option>
                      {parties.map((party) => (
                        <option key={party.id} value={party.name}>
                          {party.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Bill Selection for Bill Advance and Bill Payment */}
              {(formData.category === 'bill_advance' || formData.category === 'bill_payment') && formData.reference_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Bill for {formData.reference_name}
                  </label>
                  <div className="relative">
                    <select
                      name="reference_id"
                      value={formData.reference_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Bill</option>
                      {bills
                        .filter(bill => bill.party === formData.reference_name)
                        .map((bill, index) => {
                          // Calculate balance without party commission for banking transactions
                          const balanceAmount = bill.bill_amount - (bill.party_commission_cut || 0);
                          
                          // Get vehicle number from loading slip (bill has populated loading_slip_id object)
                          const vehicleNo = (bill.loading_slip_id as any)?.vehicle_no || 
                                          loadingSlips.find(ls => ls.id === bill.loading_slip_id)?.vehicle_no || 
                                          'N/A';
                          
                          return (
                            <option key={`${bill.id}-${bill.bill_number}-${index}`} value={bill.bill_number}>
                              {bill.bill_number} - {vehicleNo} - Balance: ₹{formatCurrency(balanceAmount)} ({bill.status})
                            </option>
                          );
                        })}
                    </select>
                    {bills.filter(bill => bill.party === formData.reference_name).length === 0 && (
                      <p className="text-sm text-gray-500 mt-1">No bills found for {formData.reference_name}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Reference fields for other categories */}
              {formData.category !== 'bill_advance' && formData.category !== 'bill_payment' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.category.includes('bill') ? 'Bill Number' : 'Memo Number'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="reference_id"
                        value={formData.reference_id}
                        onChange={handleInputChange}
                        onFocus={() => setShowReferenceDropdown(true)}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={formData.category.includes('bill') ? 'Select Bill Number' : 'Select Memo Number'}
                        required
                      />
                      <ChevronDown 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
                        onClick={() => setShowReferenceDropdown(!showReferenceDropdown)}
                      />
                      {showReferenceDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {getReferenceOptions().map((option, index) => (
                            <div
                              key={index}
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                              onClick={() => handleReferenceSelect(option)}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.category.includes('bill') ? 'Party Name' : 'Supplier Name'}
                    </label>
                    <input
                      type="text"
                      name="reference_name"
                      value={formData.reference_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={formData.category.includes('bill') ? 'Enter Party Name' : 'Enter Supplier Name'}
                      required
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {needsVehicle() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Vehicle (Own Vehicles Only)
              </label>
              <select
                name="vehicle_no"
                value={formData.vehicle_no}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Vehicle</option>
                {getOwnVehicles().map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.vehicle_no}>
                    {vehicle.vehicle_no} ({vehicle.vehicle_type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {!needsReference() && !needsVehicle() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.category === 'fuel_wallet' ? 'Fuel Wallet Name' :
                 ((formData.type === 'debit' && (formData.category === 'expense' || formData.category === 'other')) || 
                  (formData.type === 'credit' && formData.category === 'other'))
                  ? 'Select Ledger Account' : 'Reference Name'}
              </label>
              {formData.category === 'fuel_wallet' ? (
                <select
                  name="reference_name"
                  value={formData.reference_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Fuel Wallet</option>
                  <option value="BPCL">BPCL</option>
                  <option value="HPCL">HPCL</option>
                  <option value="IOCL">IOCL</option>
                  <option value="Shell">Shell</option>
                  <option value="Essar">Essar</option>
                </select>
              ) : ((formData.type === 'debit' && (formData.category === 'expense' || formData.category === 'other')) || 
                     (formData.type === 'credit' && formData.category === 'other')) ? (
                <div className="relative">
                  <input
                    type="text"
                    name="reference_name"
                    value={formData.reference_name}
                    onChange={handleInputChange}
                    onFocus={() => setShowReferenceDropdown(true)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={formData.type === 'credit' ? "Select income ledger or enter new name" : "Select existing ledger or enter new name"}
                    required
                  />
                  <ChevronDown 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
                    onClick={() => setShowReferenceDropdown(!showReferenceDropdown)}
                  />
                  {showReferenceDropdown && existingLedgerNames.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {existingLedgerNames
                        .filter(name => name && name.toLowerCase().includes((formData.reference_name || '').toLowerCase()))
                        .map((name, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, reference_name: name || '' }));
                            setShowReferenceDropdown(false);
                          }}
                        >
                          {name}
                        </div>
                      ))}
                      {formData.reference_name && !existingLedgerNames.some(name => 
                        name && name.toLowerCase() === formData.reference_name.toLowerCase()) && (
                        <div 
                          className="px-4 py-2 text-blue-600 hover:bg-blue-50 cursor-pointer border-t flex items-center space-x-2"
                          onClick={handleCreateNewLedger}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create new ledger: "{formData.reference_name}"</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  name="reference_name"
                  value={formData.reference_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter name or description"
                  required
                />
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Narration
            </label>
            <textarea
              name="narration"
              value={formData.narration}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter transaction details..."
              required
            />
          </div>

          {/* Summary */}
          <div className={`p-4 rounded-lg ${formData.type === 'credit' ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className={`w-5 h-5 ${formData.type === 'credit' ? 'text-green-600' : 'text-red-600'}`} />
                <span className={`font-medium ${formData.type === 'credit' ? 'text-green-900' : 'text-red-900'}`}>
                  {formData.type === 'credit' ? 'Credit Entry' : 'Debit Entry'}
                </span>
              </div>
              <span className={`text-xl font-bold ${formData.type === 'credit' ? 'text-green-900' : 'text-red-900'}`}>
                {formData.type === 'credit' ? '+' : '-'}{formatCurrency(formData.amount)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
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
              {editingEntry ? 'Update Entry' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>

      {/* New Ledger Creation Modal */}
      {showNewLedgerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Ledger Account</h3>
              <button 
                onClick={() => setShowNewLedgerModal(false)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleNewLedgerSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ledger Account Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={newLedgerData.name}
                  onChange={handleNewLedgerInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter ledger account name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Type
                </label>
                <select
                  name="type"
                  value={newLedgerData.type}
                  onChange={handleNewLedgerInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="expense">Expense Account</option>
                  <option value="income">Income Account</option>
                  <option value="asset">Asset Account</option>
                  <option value="liability">Liability Account</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={newLedgerData.description}
                  onChange={handleNewLedgerInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter description for this ledger account"
                />
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNewLedgerModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankingForm;