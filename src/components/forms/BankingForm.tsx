import React, { useMemo, useState } from 'react';
import { X, CreditCard, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../utils/numberGenerator';
import type { BankingEntry } from '../../types';
import { useDataStore } from '../../lib/store';

interface BankingFormProps {
  onSubmit: (data: Omit<BankingEntry, 'id' | 'created_at'>) => void;
  onCancel: () => void;
}

const BankingForm: React.FC<BankingFormProps> = ({ onSubmit, onCancel }) => {
  const { memos, bills, ledgerEntries, parties } = useDataStore();
  const [formData, setFormData] = useState({
    type: 'credit' as 'credit' | 'debit',
    category: 'other' as 'bill_advance' | 'bill_payment' | 'memo_advance' | 'memo_payment' | 'expense' | 'fuel_wallet' | 'other',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    reference_id: '',
    reference_name: '',
    narration: '',
  });

  const existingMemos = useMemo(() => memos.map(m => m.memo_number), [memos]);
  const existingBills = useMemo(() => bills.map(b => b.bill_number), [bills]);
  const [showReferenceDropdown, setShowReferenceDropdown] = useState(false);
  
  // Get existing general ledger names for expense dropdown
  const existingLedgerNames = useMemo(() => {
    const generalEntries = ledgerEntries.filter(entry => entry.ledger_type === 'general');
    const partyNames = parties.map(p => p.name);
    const ledgerNames = Array.from(new Set(generalEntries.map(entry => entry.reference_name)));
    return Array.from(new Set([...partyNames, ...ledgerNames])).sort();
  }, [ledgerEntries, parties]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        { value: 'other', label: 'Other Income' },
      ];
    } else {
      return [
        { value: 'memo_advance', label: 'Memo Advance' },
        { value: 'memo_payment', label: 'Memo Payment' },
        { value: 'expense', label: 'Expense' },
        { value: 'fuel_wallet', label: 'Fuel Wallet Credit' },
        { value: 'other', label: 'Other Expense' },
      ];
    }
  };

  const needsReference = () => {
    return ['bill_advance', 'bill_payment', 'memo_advance', 'memo_payment'].includes(formData.category);
  };

  const getReferenceOptions = () => {
    if (formData.category.includes('bill')) {
      return existingBills;
    } else if (formData.category.includes('memo')) {
      return existingMemos;
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
      }
      return {
        ...prev,
        reference_id: value,
        reference_name,
      };
    });
    setShowReferenceDropdown(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">New Banking Entry</h2>
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

          {!needsReference() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.category === 'fuel_wallet' ? 'Fuel Wallet Name' :
                 (formData.type === 'debit' && (formData.category === 'expense' || formData.category === 'other')) 
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
              ) : (formData.type === 'debit' && (formData.category === 'expense' || formData.category === 'other')) ? (
                <div className="relative">
                  <input
                    type="text"
                    name="reference_name"
                    value={formData.reference_name}
                    onChange={handleInputChange}
                    onFocus={() => setShowReferenceDropdown(true)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Select existing ledger or enter new name"
                    required
                  />
                  <ChevronDown 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
                    onClick={() => setShowReferenceDropdown(!showReferenceDropdown)}
                  />
                  {showReferenceDropdown && existingLedgerNames.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {existingLedgerNames
                        .filter(name => name.toLowerCase().includes(formData.reference_name.toLowerCase()))
                        .map((name, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, reference_name: name }));
                            setShowReferenceDropdown(false);
                          }}
                        >
                          {name}
                        </div>
                      ))}
                      {formData.reference_name && !existingLedgerNames.some(name => 
                        name.toLowerCase() === formData.reference_name.toLowerCase()) && (
                        <div className="px-4 py-2 text-gray-500 italic border-t">
                          Create new ledger: "{formData.reference_name}"
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
              Create Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BankingForm;