import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Download, Filter, Users } from 'lucide-react';
import { useDataStore } from '../lib/store';
import { formatCurrency } from '../utils/numberGenerator';
import { Party } from '../types';
import { apiService } from '../lib/api';

interface CommissionSummary {
  totalCredits: number;
  totalDebits: number;
  balance: number;
  totalEntries: number;
  partiesCount: number;
}

interface PartyCommissionInfo {
  party: Party;
  totalDebits: number;
  entryCount: number;
  lastEntryDate: string;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  partyId: string;
  searchTerm: string;
}

const PartyCommissionLedger: React.FC = () => {
  const { ledgerEntries, parties } = useDataStore();
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [partyCommissionEntries, setPartyCommissionEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    dateFrom: '',
    dateTo: '',
    partyId: '',
    searchTerm: ''
  });

  // Fetch party commission entries from the PartyCommissionLedger collection
  useEffect(() => {
    const fetchPartyCommissionEntries = async () => {
      try {
        setLoading(true);
        const response = await apiService.getPartyCommissionLedger();
        console.log('🔍 Fetched PartyCommissionLedger entries:', response);
        setPartyCommissionEntries(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('❌ Failed to fetch party commission entries:', error);
        setPartyCommissionEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPartyCommissionEntries();
  }, []);

  // Combine both PartyCommissionLedger entries and general ledger commission entries
  const commissionEntries = useMemo(() => {
    console.log('🔍 PartyCommissionLedger - Total ledger entries:', ledgerEntries.length);
    console.log('🔍 PartyCommissionLedger - PartyCommissionLedger entries:', partyCommissionEntries.length);
    
    // Get commission entries from general ledger
    const generalLedgerCommission = ledgerEntries.filter(entry => 
      entry.ledger_type === 'commission'
    );
    
    // Convert PartyCommissionLedger entries to match the expected format
    const convertedPartyCommissionEntries = partyCommissionEntries.map(entry => ({
      id: entry._id || entry.id,
      _id: entry._id,
      ledger_type: 'commission',
      reference_id: entry.bill_number || entry.reference_id,
      reference_name: entry.party_name,
      date: entry.date,
      description: entry.narration,
      narration: entry.narration,
      debit: entry.entry_type === 'debit' ? entry.amount : 0,
      credit: entry.entry_type === 'credit' ? entry.amount : 0,
      balance: 0,
      source_type: 'bill'
    }));
    
    // Combine both arrays
    const allCommissionEntries = [...generalLedgerCommission, ...convertedPartyCommissionEntries];
    
    console.log('🔍 General ledger commission entries:', generalLedgerCommission.length);
    console.log('🔍 Converted party commission entries:', convertedPartyCommissionEntries.length);
    console.log('🔍 Total combined commission entries:', allCommissionEntries.length);
    console.log('🔍 Sample entries:', allCommissionEntries.slice(0, 3));
    
    return allCommissionEntries;
  }, [ledgerEntries, partyCommissionEntries]);

  // Apply filters to entries
  const filteredEntries = useMemo(() => {
    let filtered = commissionEntries;

    // Filter by party - check both reference_id and reference_name
    if (filters.partyId) {
      filtered = filtered.filter(entry => 
        entry.reference_id === filters.partyId || 
        entry.reference_name === filters.partyId ||
        (entry.reference_name && entry.reference_name.toLowerCase().includes(filters.partyId.toLowerCase()))
      );
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(entry => new Date(entry.date) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      filtered = filtered.filter(entry => new Date(entry.date) <= new Date(filters.dateTo));
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        (entry.description || '').toLowerCase().includes(searchLower) ||
        (entry.reference_name || '').toLowerCase().includes(searchLower)
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [commissionEntries, filters]);

  // Calculate summary
  const summary = useMemo((): CommissionSummary => {
    const totalCredits = filteredEntries.reduce((sum, entry) => sum + entry.credit, 0);
    const totalDebits = filteredEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const uniqueParties = new Set(filteredEntries.map(entry => entry.reference_id));
    
    return {
      totalCredits,
      totalDebits,
      balance: totalCredits - totalDebits,
      totalEntries: filteredEntries.length,
      partiesCount: uniqueParties.size
    };
  }, [filteredEntries]);

  // Get party commission info
  const partyCommissionInfo = useMemo((): PartyCommissionInfo[] => {
    const partyMap = new Map<string, PartyCommissionInfo>();

    commissionEntries.forEach(entry => {
      // Find party by name instead of ID since entries use party names
      const party = parties.find(p => 
        p.name === entry.reference_name || 
        p.id === entry.reference_id
      );
      
      // If no party found in master list, create a temporary party object
      const partyToUse = party || {
        id: entry.reference_name || entry.reference_id,
        name: entry.reference_name || 'Unknown Party',
        contact: '',
        address: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Party;

      const partyKey = partyToUse.name;

      if (!partyMap.has(partyKey)) {
        partyMap.set(partyKey, {
          party: partyToUse,
          totalDebits: 0,
          entryCount: 0,
          lastEntryDate: entry.date
        });
      }

      const info = partyMap.get(partyKey)!;
      info.totalDebits += entry.debit;
      info.entryCount += 1;
      
      // Update last entry date if this entry is more recent
      if (new Date(entry.date) > new Date(info.lastEntryDate)) {
        info.lastEntryDate = entry.date;
      }
    });

    return Array.from(partyMap.values()).sort((a, b) => b.totalDebits - a.totalDebits);
  }, [commissionEntries, parties]);

  // Calculate running balance for entries (credits increase, debits decrease the balance)
  const entriesWithRunningBalance = useMemo(() => {
    let runningBalance = 0;
    
    // Sort entries by date (oldest first) for proper running balance calculation
    const sortedEntries = [...filteredEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const entriesWithBalance = sortedEntries.map((entry) => {
      runningBalance += entry.credit - entry.debit; // Credits add, debits subtract
      return {
        ...entry,
        running_balance: runningBalance
      };
    });
    
    // Return in reverse order (newest first) for display
    return entriesWithBalance.reverse();
  }, [filteredEntries]);

  const handlePartySelect = (party: Party | null) => {
    setSelectedParty(party);
    setFilters(prev => ({
      ...prev,
      partyId: party ? party.name : '' // Use party name for filtering instead of ID
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      partyId: '',
      searchTerm: ''
    });
    setSelectedParty(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Export to CSV
  const exportToCSV = () => {
    const partyName = selectedParty ? selectedParty.name.replace(/[^a-zA-Z0-9]/g, '_') : 'All_Parties';
    const csvHeaders = ['Date', 'Party', 'Description', 'Amount Paid', 'Running Total'];
    const csvData = entriesWithRunningBalance.map(entry => [
      formatDate(entry.date),
      entry.reference_name,
      entry.description,
      entry.debit.toString(),
      entry.running_balance.toString()
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `party-commission-payments-${partyName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export to PDF (placeholder for future implementation)
  const exportToPDF = () => {
    alert('PDF export functionality will be implemented soon.');
  };


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
          
          {partyCommissionInfo.map((info, index) => (
            <div
              key={info.party.id || `party-${index}`}
              onClick={() => handlePartySelect(info.party)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedParty?.id === info.party.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{info.party.name}</div>
              <div className="text-sm text-gray-500">
                Total Paid: {formatCurrency(info.totalDebits)} | Entries: {info.entryCount}
              </div>
              <div className="text-xs text-gray-400">
                Last payment: {formatDate(info.lastEntryDate)}
              </div>
            </div>
          ))}
        </div>
        
        {selectedParty && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900">Selected: {selectedParty.name}</h3>
            <div className="text-sm text-blue-700 mt-1">
              Viewing commission payments for this party
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
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                placeholder="Search by description or party"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Ledger Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DATE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BILL NO/REF
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NARRATION
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CREDIT
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DEBIT
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RUNNING BALANCE
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      Loading commission entries...
                    </div>
                  </td>
                </tr>
              ) : entriesWithRunningBalance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No commission entries found
                    {selectedParty && (
                      <div className="text-sm mt-1">
                        No entries recorded for {selectedParty.name}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                entriesWithRunningBalance.map((entry, index) => (
                  <tr key={entry.id || entry._id || `entry-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.reference_id || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.description || entry.narration || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {entry.credit > 0 ? (
                        <span className="text-green-600 font-medium">
                          {formatCurrency(entry.credit)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {entry.debit > 0 ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(entry.debit)}
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
