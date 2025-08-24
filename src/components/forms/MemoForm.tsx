import React, { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import { formatCurrency } from '../../utils/numberGenerator';
import type { LoadingSlip, Memo, AdvancePayment } from '../../types';

interface MemoFormProps {
  slip?: LoadingSlip;
  nextMemoNumber?: string;
  initialData?: Memo | null;
  onSubmit: (data: Omit<Memo, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

type MemoFormState = {
  memo_number: string;
  loading_slip_id: string;
  date: string;
  supplier: string;
  freight: number;
  commission_rate: number;
  commission: number;
  mamool: number;
  detention: number;
  extra: number;
  rto: number;
  net_amount: number;
  advance_payments: AdvancePayment[];
  status: 'pending' | 'paid';
  narration: string;
};

const MemoForm: React.FC<MemoFormProps> = ({ slip, nextMemoNumber, initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<MemoFormState>({
    memo_number: initialData?.memo_number || nextMemoNumber || '',
    loading_slip_id: initialData?.loading_slip_id || slip?.id || '',
    date: initialData ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0],
    supplier: initialData?.supplier || slip?.supplier || '',
    freight: initialData?.freight || slip?.freight || 0,
    commission_rate: 6,
    commission: initialData?.commission || 0,
    mamool: initialData?.mamool || 0,
    detention: initialData?.detention || 0,
    extra: initialData?.extra || 0,
    rto: initialData?.rto || slip?.rto || 0,
    net_amount: initialData?.net_amount || 0,
    advance_payments: initialData?.advance_payments || [] as AdvancePayment[],
    status: initialData?.status || 'pending' as const,
    narration: initialData?.narration || '',
  });

  // When rate or freight changes, update commission from rate
  useEffect(() => {
    const commission = formData.freight * (formData.commission_rate / 100);
    setFormData(prev => ({
      ...prev,
      commission,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.freight, formData.commission_rate]);

  // Always compute net_amount from current values (including manually edited commission)
  useEffect(() => {
    const netAmount = formData.freight - formData.commission - formData.mamool + formData.detention + formData.extra + formData.rto;
    setFormData(prev => ({
      ...prev,
      net_amount: netAmount,
    }));
  }, [formData.freight, formData.commission, formData.mamool, formData.detention, formData.extra, formData.rto]);

  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            New Memo
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Memo Number
              </label>
              <input
                type="text"
                name="memo_number"
                value={formData.memo_number}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {slip && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Loading Slip Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Slip No:</span>
                  <span className="ml-2 font-medium">{slip.slip_number}</span>
                </div>
                <div>
                  <span className="text-blue-700">Vehicle:</span>
                  <span className="ml-2 font-medium">{slip.vehicle_no}</span>
                </div>
                <div>
                  <span className="text-blue-700">Route:</span>
                  <span className="ml-2 font-medium">{slip.from_location} → {slip.to_location}</span>
                </div>
                <div>
                  <span className="text-blue-700">Party:</span>
                  <span className="ml-2 font-medium">{slip.party}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                Commission Rate (%)
              </label>
              <input
                type="number"
                name="commission_rate"
                value={formData.commission_rate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commission (₹) — auto-fills from rate but editable
              </label>
              <input
                type="number"
                name="commission"
                value={formData.commission}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Currently {formData.commission_rate}% of freight = {formatCurrency(formData.freight * (formData.commission_rate / 100))}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mamool (₹)
              </label>
              <input
                type="number"
                name="mamool"
                value={formData.mamool}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detention (₹)
              </label>
              <input
                type="number"
                name="detention"
                value={formData.detention}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Extra (₹)
              </label>
              <input
                type="number"
                name="extra"
                value={formData.extra}
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

          {/* Calculation Summary */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center mb-3">
              <Calculator className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="text-sm font-medium text-green-900">Calculation Summary</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-green-700">Freight:</span>
                <span className="ml-2 font-medium">{formatCurrency(formData.freight)}</span>
              </div>
              <div>
                <span className="text-red-700">Commission:</span>
                <span className="ml-2 font-medium">-{formatCurrency(formData.commission)}</span>
              </div>
              <div>
                <span className="text-red-700">Mamool:</span>
                <span className="ml-2 font-medium">-{formatCurrency(formData.mamool)}</span>
              </div>
              <div>
                <span className="text-green-700">Detention + Extra:</span>
                <span className="ml-2 font-medium">+{formatCurrency(formData.detention + formData.extra)}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-green-900 font-medium">Net Amount:</span>
                <span className="text-xl font-bold text-green-900">{formatCurrency(formData.net_amount)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div>
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
                Create Memo
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemoForm;