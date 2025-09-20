import { useState, useEffect } from 'react';
import { Plus, CreditCard, TrendingUp, TrendingDown, Calendar, Trash, Edit } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import BankingForm from './forms/BankingForm';
import type { BankingEntry } from '../types';
import { useDataStore } from '../lib/store';
import { apiService } from '../lib/api';

export default function Cashbook() {
  const { 
    cashbookEntries: entries, 
    setCashbookEntries, 
    addCashbookEntry,
    updateCashbookEntry
  } = useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BankingEntry | null>(null);

  // Force refresh cashbook data on component mount to ensure data persistence
  useEffect(() => {
    const refreshCashbookData = async () => {
      try {
        console.log('🔄 Refreshing cashbook data on component mount...');
        const response = await apiService.getCashbookEntries();
        if (response.cashbookEntries) {
          setCashbookEntries(response.cashbookEntries);
          console.log('✅ Cashbook data refreshed:', response.cashbookEntries.length, 'entries');
        }
      } catch (error) {
        console.error('❌ Failed to refresh cashbook data:', error);
      }
    };
    
    refreshCashbookData();
  }, [setCashbookEntries]);

  const handleCreateEntry = async (entryData: Omit<BankingEntry, 'id' | 'created_at'>) => {
    try {
      if (editingEntry) {
        // Update existing entry with cash payment mode
        const updatedEntry: BankingEntry = {
          ...entryData,
          payment_mode: 'cash', // Force cash mode for cashbook entries
          id: editingEntry.id,
          created_at: editingEntry.created_at,
        };
        updateCashbookEntry(updatedEntry);
        setEditingEntry(null);
      } else {
        // Create new entry via API
        const entryToCreate = {
          ...entryData,
          payment_mode: 'cash', // Force cash mode for cashbook entries
        };
        
        const response = await apiService.createCashbookEntry(entryToCreate);
        const savedEntry = response.cashbookEntry;
        
        // Add to local store using addCashbookEntry to ensure proper processing
        addCashbookEntry(savedEntry);
        
        // All ledger entries (including party commission) are now created automatically by the backend
        // No need to create any ledger entries manually in the frontend
        
        // Trigger data sync
        window.dispatchEvent(new CustomEvent('data-sync-required'));
      }
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create cashbook entry:', error);
    }
  };

  const handleEditEntry = (entry: BankingEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setShowForm(false);
  };

  const totalCredits = entries
    .filter(entry => entry.type === 'credit')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalDebits = entries
    .filter(entry => entry.type === 'debit')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const netBalance = totalCredits - totalDebits;

  const confirmAndDelete = async (id: string) => {
    if (window.confirm('Delete this cashbook entry? This will also remove related ledger entries.')) {
      try {
        console.log('🗑️ Attempting to delete cashbook entry with ID:', id);
        
        // Find the entry to get the correct ID
        const entryToDelete = entries.find(entry => entry._id === id || entry.id === id);
        if (!entryToDelete) {
          console.error('Entry not found in local store:', id);
          alert('Entry not found. Please refresh and try again.');
          return;
        }
        
        const deleteId = entryToDelete._id || entryToDelete.id;
        console.log('Using delete ID:', deleteId);
        
        // Delete from backend first
        const deleteResponse = await apiService.deleteCashbookEntry(deleteId);
        console.log('Delete response:', deleteResponse);
        
        // Remove from local store
        setCashbookEntries(entries.filter(entry => entry._id !== deleteId && entry.id !== deleteId));
        
        // Create party commission ledger entry for commission payments
        if (entryToDelete.category === 'party_commission' && entryToDelete.reference_name) {
          const commissionLedgerEntry = {
            ledger_type: 'commission',
            reference_id: entryToDelete.reference_id || `CASH-COMM-${Date.now()}`,
            reference_name: entryToDelete.reference_name,
            date: entryToDelete.date,
            description: entryToDelete.narration || `Party commission payment to ${entryToDelete.reference_name}`,
            debit: entryToDelete.amount,
            credit: 0,
            balance: 0,
            source_type: 'cashbook',
          };
          
          try {
            await apiService.createLedgerEntry(commissionLedgerEntry);
            console.log('✅ Party commission ledger entry created from cashbook:', commissionLedgerEntry);
          } catch (error) {
            console.error('❌ Failed to create party commission ledger entry from cashbook:', error);
          }
        }
        
        // Delete related ledger entries
        const ledgerResponse = await apiService.getLedgerEntries();
        const relatedLedgers = ledgerResponse.ledgerEntries.filter(
          ledger => (ledger.reference_id === deleteId || ledger.reference_id === id) && ledger.source_type === 'cashbook'
        );
        
        console.log('Found related ledger entries:', relatedLedgers.length);
        
        // Delete each related ledger entry
        for (const ledger of relatedLedgers) {
          try {
            await apiService.deleteLedgerEntry(ledger._id);
            console.log('Deleted ledger entry:', ledger._id);
          } catch (ledgerError) {
            console.warn('Failed to delete ledger entry:', ledger._id, ledgerError);
          }
        }
        
        // Trigger data sync
        window.dispatchEvent(new CustomEvent('data-sync-required'));
        
        console.log('✅ Cashbook entry deleted successfully');
        
      } catch (error) {
        console.error('❌ Failed to delete cashbook entry:', error);
        
        // Check if it's a 404 error (entry already deleted)
        if (error instanceof Error && error.message.includes('404')) {
          // Remove from local store anyway since it's already gone from backend
          setCashbookEntries(entries.filter(entry => entry._id !== id && entry.id !== id));
          window.dispatchEvent(new CustomEvent('data-sync-required'));
          console.log('Entry was already deleted from backend, removed from local store');
        } else {
          alert('Failed to delete cashbook entry. Please try again.');
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cashbook</h1>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Entry</span>
        </button>
      </div>

      {showForm && (
        <BankingForm
          onSubmit={handleCreateEntry}
          onCancel={handleCancelEdit}
          editingEntry={editingEntry}
        />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Credits</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(totalCredits)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Debits</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(totalDebits)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Balance</p>
              <p className={`text-2xl font-bold mt-2 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netBalance)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Cashbook Entries</h3>
        </div>
        <div className="overflow-x-auto">
          {entries.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No cashbook entries found</p>
              <p className="text-sm">Add your first cashbook entry to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Narration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry._id || entry.id || `cashbook-${Date.now()}-${Math.random()}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{new Date(entry.date).toLocaleDateString('en-IN')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.type === 'credit' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {entry.type === 'credit' ? 'Credit' : 'Debit'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {entry.category.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {entry.reference_id && (
                          <div className="font-medium">{entry.reference_id}</div>
                        )}
                        <div className="text-gray-500">{entry.reference_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={entry.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                        {entry.type === 'credit' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {entry.narration}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="inline-flex items-center px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                          title="Edit entry"
                        >
                          <Edit className="w-3 h-3 mr-1" /> Edit
                        </button>
                        <button
                          onClick={() => confirmAndDelete(entry.id)}
                          className="inline-flex items-center px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded"
                          title="Delete entry"
                        >
                          <Trash className="w-3 h-3 mr-1" /> Delete
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
    </div>
  );
};

// Export removed - using default export above
