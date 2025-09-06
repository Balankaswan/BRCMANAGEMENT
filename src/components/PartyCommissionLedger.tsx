import React, { useState, useEffect } from 'react';
import { FileText, Download, Filter, Users } from 'lucide-react';
import { apiService } from '../lib/api';

interface LedgerEntry {
  _id: string;
  party_id: string;
  party_name: string;
  bill_number?: string;
  reference_id?: string;
  date: string;
  entry_type: 'credit' | 'debit';
  amount: number;
  narration: string;
  running_balance?: number;
}

interface LedgerSummary {
  totalCredits: number;
  totalDebits: number;
  balance: number;
  totalEntries: number;
}

interface PartyInfo {
  _id: string;
  party_name: string;
  totalCredits: number;
  totalDebits: number;
  balance: number;
  entryCount: number;
  lastEntryDate: string;
}

interface Filters {
  date_from: string;
  date_to: string;
  bill_number: string;
  party_id: string;
}

const PartyCommissionLedger: React.FC = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [parties, setParties] = useState<PartyInfo[]>([]);
  const [selectedParty, setSelectedParty] = useState<PartyInfo | null>(null);
  const [summary, setSummary] = useState<LedgerSummary>({
    totalCredits: 0,
    totalDebits: 0,
    balance: 0,
    totalEntries: 0
  });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string>('');
  const [filters, setFilters] = useState<Filters>({
    date_from: '',
    date_to: '',
    bill_number: '',
    party_id: ''
  });

  const fetchParties = async () => {
    try {
      const partiesData = await apiService.getPartyCommissionLedgerParties();
      setParties(partiesData as PartyInfo[]);
    } catch (error) {
      console.error('Error fetching parties:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [entriesData, summaryData] = await Promise.all([
        apiService.getPartyCommissionLedger(filters),
        apiService.getPartyCommissionLedgerSummary(filters)
      ]);
      
      setEntries(entriesData as LedgerEntry[]);
      setSummary(summaryData as LedgerSummary);
      setError('');
    } catch (error: any) {
      console.error('Error fetching party commission ledger data:', error);
      setError('Failed to fetch ledger data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  // Calculate running balance for entries
  const entriesWithRunningBalance = entries.map((entry, index) => {
    let runningBalance = 0;
    
    // Calculate running balance up to this entry
    for (let i = entries.length - 1; i >= entries.length - 1 - index; i--) {
      const currentEntry = entries[i];
      if (currentEntry.entry_type === 'credit') {
        runningBalance += currentEntry.amount;
      } else {
        runningBalance -= currentEntry.amount;
      }
    }
    
    return {
      ...entry,
      running_balance: runningBalance
    };
  });

  const handlePartySelect = (party: PartyInfo | null) => {
    setSelectedParty(party);
    setFilters(prev => ({
      ...prev,
      party_id: party ? party._id : ''
    }));
  };

  const handleApplyFilters = () => {
    fetchData();
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setFilters({
      date_from: '',
      date_to: '',
      bill_number: '',
      party_id: ''
    });
    setSelectedParty(null);
    setShowFilters(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Export to CSV
  const exportToCSV = () => {
    const partyName = selectedParty ? selectedParty.party_name : 'All_Parties';
    const csvHeaders = ['Date', 'Bill No/Ref', 'Narration', 'Credit', 'Debit', 'Running Balance'];
    const csvData = entriesWithRunningBalance.map(entry => [
      new Date(entry.date).toLocaleDateString(),
      entry.bill_number || entry.reference_id,
      entry.narration,
      entry.entry_type === 'credit' ? entry.amount.toString() : '0',
      entry.entry_type === 'debit' ? entry.amount.toString() : '0',
      entry.running_balance.toString()
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `party-commission-ledger-${partyName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export to PDF
  const exportToPDF = async () => {
    const { generatePartyCommissionLedgerPDF } = await import('../utils/pdfGenerator');
    await generatePartyCommissionLedgerPDF(entriesWithRunningBalance, summary, filters, selectedParty);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Party Commission Ledger</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Party Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Users className="w-5 h-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Select Party</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            onClick={() => handlePartySelect(null)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              !selectedParty 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-gray-900">All Parties</div>
            <div className="text-sm text-gray-500">View combined ledger</div>
          </div>
          
          {parties.map((party) => (
            <div
              key={party._id}
              onClick={() => handlePartySelect(party)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedParty?._id === party._id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{party.party_name}</div>
              <div className="text-sm text-gray-500">
                Balance: {formatCurrency(party.balance)} | Entries: {party.entryCount}
              </div>
              <div className="text-xs text-gray-400">
                Last entry: {formatDate(party.lastEntryDate)}
              </div>
            </div>
          ))}
        </div>
        
        {selectedParty && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900">Selected: {selectedParty.party_name}</h3>
            <div className="text-sm text-blue-700 mt-1">
              Credits: {formatCurrency(selectedParty.totalCredits)} | 
              Debits: {formatCurrency(selectedParty.totalDebits)} | 
              Balance: {formatCurrency(selectedParty.balance)}
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900">Total Credits</p>
              <p className="text-lg font-semibold text-green-700">
                {formatCurrency(summary.totalCredits)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-900">Total Debits</p>
              <p className="text-lg font-semibold text-red-700">
                {formatCurrency(summary.totalDebits)}
              </p>
            </div>
          </div>
        </div>

        <div className={`${summary.balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4`}>
          <div className="flex items-center">
            <div className={`p-2 ${summary.balance >= 0 ? 'bg-blue-100' : 'bg-yellow-100'} rounded-lg`}>
              <FileText className={`w-5 h-5 ${summary.balance >= 0 ? 'text-blue-600' : 'text-yellow-600'}`} />
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${summary.balance >= 0 ? 'text-blue-900' : 'text-yellow-900'}`}>
                Outstanding Balance
              </p>
              <p className={`text-lg font-semibold ${summary.balance >= 0 ? 'text-blue-700' : 'text-yellow-700'}`}>
                {formatCurrency(summary.balance)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Total Entries</p>
              <p className="text-lg font-semibold text-gray-700">{summary.totalEntries}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
              <input
                type="text"
                value={filters.bill_number}
                onChange={(e) => setFilters(prev => ({ ...prev, bill_number: e.target.value }))}
                placeholder="Search by bill number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={handleApplyFilters}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply
              </button>
              <button
                onClick={handleResetFilters}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill No/Ref
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Narration
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Running Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entriesWithRunningBalance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No commission ledger entries found
                  </td>
                </tr>
              ) : (
                entriesWithRunningBalance.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.bill_number || entry.reference_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.narration}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {entry.entry_type === 'credit' ? (
                        <span className="text-green-600 font-medium">
                          {formatCurrency(entry.amount)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {entry.entry_type === 'debit' ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(entry.amount)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className={entry.running_balance >= 0 ? 'text-blue-600' : 'text-red-600'}>
                        {formatCurrency(entry.running_balance)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PartyCommissionLedger;
