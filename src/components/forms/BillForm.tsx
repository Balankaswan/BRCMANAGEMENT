import React, { useState, useEffect } from 'react';
import { X, Calculator, Upload } from 'lucide-react';
import { formatCurrency } from '../../utils/numberGenerator';
import PDFGenerator from '../PDFGenerator';
import { apiService } from '../../lib/api';
import type { LoadingSlip, Bill } from '../../types';

interface BillFormProps {
  loadingSlip?: LoadingSlip;
  nextBillNumber: string;
  initialData?: Bill | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const BillForm: React.FC<BillFormProps> = ({ loadingSlip, nextBillNumber, initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    bill_number: initialData ? initialData.bill_number : nextBillNumber,
    loading_slip_id: loadingSlip?.id || '',
    date: new Date().toISOString().split('T')[0],
    party: loadingSlip?.party || '',
    bill_amount: loadingSlip?.total_freight || 0,
    detention: 0,
    extra: 0,
    rto: loadingSlip?.rto || 0,
    mamool: 0,
    tds: 0,
    penalties: 0,
    party_commission_cut: 0,
    net_amount: 0,
    pod_image: '',
    status: 'pending' as 'pending' | 'received',
    narration: '',
  });
  const [podFileName, setPodFileName] = useState<string>('');

  // Calculate net amount (excludes party commission cut for supplier payment calculation)
  useEffect(() => {
    const netAmount = formData.bill_amount + formData.detention + formData.extra + formData.rto - formData.mamool - formData.tds - formData.penalties - formData.party_commission_cut;
    setFormData(prev => ({
      ...prev,
      net_amount: netAmount,
    }));
  }, [formData.bill_amount, formData.detention, formData.extra, formData.rto, formData.mamool, formData.tds, formData.penalties, formData.party_commission_cut]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        bill_number: initialData.bill_number,
        loading_slip_id: initialData.loading_slip_id,
        date: initialData.date.split('T')[0],
        party: initialData.party,
        bill_amount: initialData.bill_amount,
        detention: initialData.detention || 0,
        extra: initialData.extra || 0,
        rto: initialData.rto || 0,
        mamool: initialData.mamool,
        tds: initialData.tds,
        penalties: initialData.penalties,
        party_commission_cut: initialData.party_commission_cut || 0,
        net_amount: initialData.net_amount,
        pod_image: initialData.pod_image || '',
        status: initialData.status || 'pending' as 'pending' | 'received',
        narration: initialData.narration || '',
      });
    } else if (loadingSlip) {
      // Auto-populate from loading slip when creating new bill
      setFormData(prev => ({
        ...prev,
        bill_number: nextBillNumber,
        loading_slip_id: loadingSlip.id,
        party: loadingSlip.party,
        bill_amount: loadingSlip.total_freight,
        rto: loadingSlip.rto || 0,
      }));
    }
  }, [initialData, loadingSlip, nextBillNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If POD image is uploaded, save it to POD collection
    if (formData.pod_image) {
      try {
        const podData = {
          filename: podFileName || `POD_${formData.bill_number}_${Date.now()}.jpg`,
          fileData: formData.pod_image,
          fileType: 'image/jpeg',
          billNo: formData.bill_number,
          party: formData.party,
          uploadDate: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        
        // Save POD to backend
        await apiService.createPODFile(podData);
        console.log('POD image saved successfully for bill:', formData.bill_number);
      } catch (error) {
        console.error('Failed to save POD image:', error);
        // Continue with bill creation even if POD save fails
      }
    }
    
    onSubmit(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Read as Data URL so we can embed in PDF
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setFormData(prev => ({ ...prev, pod_image: result }));
      setPodFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {initialData ? 'Edit Bill' : 'New Bill'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Number
              </label>
              <input
                type="text"
                name="bill_number"
                value={formData.bill_number}
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
                Party (M/S)
              </label>
              <input
                type="text"
                name="party"
                value={formData.party}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {loadingSlip && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Loading Slip Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Slip No:</span>
                  <span className="ml-2 font-medium">{loadingSlip.slip_number}</span>
                </div>
                <div>
                  <span className="text-blue-700">Vehicle:</span>
                  <span className="ml-2 font-medium">{loadingSlip.vehicle_no}</span>
                </div>
                <div>
                  <span className="text-blue-700">Route:</span>
                  <span className="ml-2 font-medium">{loadingSlip.from_location} → {loadingSlip.to_location}</span>
                </div>
                <div>
                  <span className="text-blue-700">Party:</span>
                  <span className="ml-2 font-medium">{loadingSlip.party}</span>
                </div>
                <div>
                  <span className="text-blue-700">Material:</span>
                  <span className="ml-2 font-medium">{loadingSlip.material || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-blue-700">Weight:</span>
                  <span className="ml-2 font-medium">{loadingSlip.weight} MT</span>
                </div>
                <div>
                  <span className="text-blue-700">Dimension:</span>
                  <span className="ml-2 font-medium">{loadingSlip.dimension}</span>
                </div>
                <div>
                  <span className="text-blue-700">Supplier:</span>
                  <span className="ml-2 font-medium">{loadingSlip.supplier}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Amount (₹)
              </label>
              <input
                type="number"
                name="bill_amount"
                value={formData.bill_amount}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                POD Image
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pod-upload"
                />
                <label
                  htmlFor="pod-upload"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {podFileName || 'Upload POD Image'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                Extra Weight (₹)
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                TDS (₹)
              </label>
              <input
                type="number"
                name="tds"
                value={formData.tds}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Penalties (₹)
              </label>
              <input
                type="number"
                name="penalties"
                value={formData.penalties}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Party Commission Cut Field */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Party Commission Cut (₹)
              </label>
              <input
                type="number"
                name="party_commission_cut"
                value={formData.party_commission_cut}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
                placeholder="Enter commission cut amount"
              />
              <p className="text-xs text-gray-500 mt-1">
                This amount will be deducted from net payable to supplier and posted to Party Commission Ledger
              </p>
            </div>
            <div className="flex items-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 w-full">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Commission Impact</h4>
                <div className="text-xs text-yellow-700">
                  <div>• Bill PDF: Shows full freight amount</div>
                  <div>• Supplier Payment: Reduced by commission cut</div>
                  <div>• Commission Ledger: Auto-posted as credit</div>
                </div>
              </div>
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
              <h3 className="text-sm font-medium text-green-900">Bill Calculation</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-green-700">Bill Amount:</span>
                <span className="ml-2 font-medium">{formatCurrency(formData.bill_amount)}</span>
              </div>
              <div>
                <span className="text-green-700">Detention:</span>
                <span className="ml-2 font-medium">+{formatCurrency(formData.detention)}</span>
              </div>
              <div>
                <span className="text-green-700">Extra Weight:</span>
                <span className="ml-2 font-medium">+{formatCurrency(formData.extra)}</span>
              </div>
              <div>
                <span className="text-green-700">RTO:</span>
                <span className="ml-2 font-medium">+{formatCurrency(formData.rto)}</span>
              </div>
              <div>
                <span className="text-red-700">Mamool:</span>
                <span className="ml-2 font-medium">-{formatCurrency(formData.mamool)}</span>
              </div>
              <div>
                <span className="text-red-700">TDS:</span>
                <span className="ml-2 font-medium">-{formatCurrency(formData.tds)}</span>
              </div>
              <div>
                <span className="text-red-700">Penalties:</span>
                <span className="ml-2 font-medium">-{formatCurrency(formData.penalties)}</span>
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
              {initialData && loadingSlip && (
                <PDFGenerator
                  type="bill"
                  data={initialData}
                  loadingSlip={loadingSlip}
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
                {initialData ? 'Update' : 'Create'} Bill
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BillForm;