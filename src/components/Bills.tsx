import React, { useMemo, useState } from 'react';
import { Plus, FileText, Edit, Download, Image, Eye } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import BillForm from './forms/BillForm';
import { generateBillPDF } from '../utils/pdfGenerator';
import type { Bill } from '../types';
import { useDataStore } from '../lib/store';

interface BillsListProps {
  showOnlyFullyReceived?: boolean;
}

const BillsComponent: React.FC<BillsListProps> = ({ showOnlyFullyReceived = false }) => {
  const { bills, addBill, updateBill, bankingEntries } = useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [viewBill, setViewBill] = useState<Bill | null>(null);

  const handleCreateBill = (billData: Omit<Bill, 'id' | 'created_at' | 'updated_at'>) => {
    const newBill: Bill = {
      ...billData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addBill(newBill);
    setShowForm(false);
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setShowForm(true);
  };

  const handleUpdateBill = (billData: Omit<Bill, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingBill) {
      const updatedBill: Bill = {
        ...billData,
        id: editingBill.id,
        created_at: editingBill.created_at,
        updated_at: new Date().toISOString(),
      };
      updateBill(updatedBill);
      setShowForm(false);
      setEditingBill(null);
    }
  };

  const handleDownloadPDF = async (bill: Bill) => {
    await generateBillPDF(bill, bill.pod_image);
  };

  const filteredBills = useMemo(() => {
    if (!showOnlyFullyReceived) return bills;
    return bills.filter(b => {
      const received = bankingEntries
        .filter(e => (e.category === 'bill_advance' || e.category === 'bill_payment') && e.reference_id === b.bill_number)
        .reduce((sum, e) => sum + e.amount, 0);
      return received >= b.net_amount && b.net_amount > 0;
    });
  }, [bills, bankingEntries, showOnlyFullyReceived]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Bill</span>
        </button>
      </div>

      {showForm && (
        <BillForm
          initialData={editingBill}
          onSubmit={editingBill ? handleUpdateBill : handleCreateBill}
          onCancel={() => {
            setShowForm(false);
            setEditingBill(null);
          }}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Bills</h3>
        </div>
        <div className="overflow-x-auto">
          {filteredBills.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No bills found</p>
              <p className="text-sm">Create bills from loading slips</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Party
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deductions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    POD
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {bill.bill_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(bill.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {bill.party}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(bill.bill_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      -{formatCurrency(bill.mamool + bill.tds + bill.penalties)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {formatCurrency(bill.net_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bill.pod_image ? (
                        <div className="flex items-center space-x-1">
                          <Image className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">Yes</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setViewBill(bill)}
                          className="text-gray-700 hover:text-gray-900"
                          title="View Bill"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditBill(bill)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit Bill"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(bill)}
                          className="text-green-600 hover:text-green-800"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {viewBill && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Bill #{viewBill.bill_number}</h3>
              <button onClick={() => setViewBill(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Date:</span> {new Date(viewBill.date).toLocaleDateString('en-IN')}</div>
              <div><span className="text-gray-500">Party:</span> {viewBill.party}</div>
              <div><span className="text-gray-500">Bill Amount:</span> {formatCurrency(viewBill.bill_amount)}</div>
              <div><span className="text-gray-500">Deductions:</span> {formatCurrency(viewBill.mamool + viewBill.tds + viewBill.penalties)}</div>
              <div className="col-span-2"><span className="text-gray-500">Net Amount:</span> {formatCurrency(viewBill.net_amount)}</div>
              <div className="col-span-2 flex items-center space-x-2">
                <span className="text-gray-500">POD:</span>
                {viewBill.pod_image ? (
                  <span className="text-green-600 flex items-center space-x-1"><Image className="w-4 h-4" /><span>Available</span></span>
                ) : (
                  <span className="text-gray-400">Not Attached</span>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button onClick={() => setViewBill(null)} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillsComponent;