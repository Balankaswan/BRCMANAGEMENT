import React, { useState } from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import PDFGenerator from './PDFGenerator';
import type { LoadingSlip, Memo, Bill } from '../types';

const PDFDemo: React.FC = () => {
  // Sample data for demonstration
  const sampleLoadingSlip: LoadingSlip = {
    id: '1',
    slip_number: 'SL25081001',
    date: '2025-08-19',
    party: 'M/S. PERFECT CARGO MOVERS',
    vehicle_no: 'GJ01AB1234',
    from_location: 'HAZIRA',
    to_location: 'HYDERABAD',
    dimension: '20ft x 8ft x 8ft',
    weight: 47,
    supplier: 'Rajesh Transport',
    freight: 300000,
    advance: 0,
    balance: 300000,
    rto: 0,
    total_freight: 300000,
    created_at: '2025-08-19T12:30:00Z',
    updated_at: '2025-08-19T12:30:00Z'
  };

  const sampleMemo: Memo = {
    id: '1',
    memo_number: 'MO25081001',
    loading_slip_id: '1',
    date: '2025-08-19',
    supplier: 'Rajesh Transport',
    freight: 230000,
    commission: 13800,
    mamool: 2000,
    detention: 0,
    extra: 0,
    rto: 0,
    net_amount: 214200,
    advance_payments: [],
    status: 'pending' as const,
    created_at: '2025-08-19T12:30:00Z',
    updated_at: '2025-08-19T12:30:00Z'
  };

  const sampleBill: Bill = {
    id: '1',
    bill_number: 'BL25081001',
    loading_slip_id: '1',
    date: '2025-08-19',
    party: 'M/S. PERFECT CARGO MOVERS',
    bill_amount: 300000,
    mamool: 2000,
    tds: 9000,
    penalties: 0,
    net_amount: 289000,
    totalFreight: 300000,
    status: 'pending' as const,
    advance_payments: [],
    created_at: '2025-08-19T12:30:00Z',
    updated_at: '2025-08-19T12:30:00Z'
  };

  const [activeTab, setActiveTab] = useState<'loading-slip' | 'memo' | 'bill'>('loading-slip');

  const renderSampleData = () => {
    switch (activeTab) {
      case 'loading-slip':
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Loading Slip Sample Data</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium">Slip No:</span> {sampleLoadingSlip.slip_number}</div>
              <div><span className="font-medium">Date:</span> {sampleLoadingSlip.date}</div>
              <div><span className="font-medium">Party:</span> {sampleLoadingSlip.party}</div>
              <div><span className="font-medium">Vehicle:</span> {sampleLoadingSlip.vehicle_no}</div>
              <div><span className="font-medium">From:</span> {sampleLoadingSlip.from_location}</div>
              <div><span className="font-medium">To:</span> {sampleLoadingSlip.to_location}</div>
              <div><span className="font-medium">Weight:</span> {sampleLoadingSlip.weight} MT</div>
              <div><span className="font-medium">Freight:</span> ₹{sampleLoadingSlip.freight.toLocaleString()}</div>
            </div>
          </div>
        );
      case 'memo':
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Broker Memo Sample Data</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium">Memo No:</span> {sampleMemo.memo_number}</div>
              <div><span className="font-medium">Date:</span> {sampleMemo.date}</div>
              <div><span className="font-medium">Supplier:</span> {sampleMemo.supplier}</div>
              <div><span className="font-medium">Freight:</span> ₹{sampleMemo.freight.toLocaleString()}</div>
              <div><span className="font-medium">Commission:</span> ₹{sampleMemo.commission.toLocaleString()}</div>
              <div><span className="font-medium">Mamool:</span> ₹{sampleMemo.mamool.toLocaleString()}</div>
              <div><span className="font-medium">Net Amount:</span> ₹{sampleMemo.net_amount.toLocaleString()}</div>
            </div>
          </div>
        );
      case 'bill':
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Bill Sample Data</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium">Bill No:</span> {sampleBill.bill_number}</div>
              <div><span className="font-medium">Date:</span> {sampleBill.date}</div>
              <div><span className="font-medium">Party:</span> {sampleBill.party}</div>
              <div><span className="font-medium">Bill Amount:</span> ₹{sampleBill.bill_amount.toLocaleString()}</div>
              <div><span className="font-medium">TDS:</span> ₹{sampleBill.tds.toLocaleString()}</div>
              <div><span className="font-medium">Mamool:</span> ₹{sampleBill.mamool.toLocaleString()}</div>
              <div><span className="font-medium">Net Amount:</span> ₹{sampleBill.net_amount.toLocaleString()}</div>
            </div>
          </div>
        );
    }
  };

  const getPDFGenerator = () => {
    switch (activeTab) {
      case 'loading-slip':
        return (
          <PDFGenerator
            type="loading-slip"
            data={sampleLoadingSlip}
            size="lg"
            className="w-full justify-center"
          />
        );
      case 'memo':
        return (
          <PDFGenerator
            type="memo"
            data={sampleMemo}
            loadingSlip={sampleLoadingSlip}
            size="lg"
            className="w-full justify-center"
          />
        );
      case 'bill':
        return (
          <PDFGenerator
            type="bill"
            data={sampleBill}
            loadingSlip={sampleLoadingSlip}
            size="lg"
            className="w-full justify-center"
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <FileText className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">PDF Generator Demo</h2>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Generate professional PDF documents for your transport business. Choose a document type below to see sample data and generate a PDF.
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Available PDF Templates:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Loading Slip:</strong> Complete loading slip with company details, transport info, and financial breakdown</li>
              <li>• <strong>Broker Memo:</strong> Professional memo format with commission calculations and supplier details</li>
              <li>• <strong>Bill:</strong> Detailed bill format with party information and payment calculations</li>
            </ul>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('loading-slip')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'loading-slip'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            Loading Slip
          </button>
          <button
            onClick={() => setActiveTab('memo')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'memo'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Broker Memo
          </button>
          <button
            onClick={() => setActiveTab('bill')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'bill'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Bill
          </button>
        </div>

        {/* Sample Data Display */}
        {renderSampleData()}

        {/* PDF Generator Button */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Click the button below to generate and download a PDF with the sample data above.
            </p>
            {getPDFGenerator()}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">How to Use PDF Generation in Your Forms:</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <ol className="text-sm text-gray-700 space-y-2">
              <li>1. <strong>In Forms:</strong> PDF generation buttons appear automatically when editing existing records</li>
              <li>2. <strong>Custom Logo:</strong> Replace the logo in <code className="bg-gray-200 px-1 rounded">src/assets/logo.ts</code> with your company logo</li>
              <li>3. <strong>Company Info:</strong> Update company details in <code className="bg-gray-200 px-1 rounded">src/utils/pdfGenerator.ts</code></li>
              <li>4. <strong>Advance Payments:</strong> You can add advance payment functionality later as mentioned</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFDemo;
