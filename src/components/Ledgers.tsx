import React, { useMemo, useState } from 'react';
import { Users, Truck, Building, Download, Eye } from 'lucide-react';
import { useDataStore } from '../lib/store';
import type { LedgerEntry } from '../types';

interface LedgersProps {
  onViewLedger?: (name: string, type: 'party' | 'supplier') => void;
}

const LedgersComponent: React.FC<LedgersProps> = ({ onViewLedger }) => {
  const [activeTab, setActiveTab] = useState<'party' | 'supplier' | 'general'>('party');
  const { ledgerEntries } = useDataStore();

  const grouped = useMemo(() => {
    if (activeTab === 'general') return [] as any[];
    const type = activeTab;
    const map = new Map<string, { name: string; entries: LedgerEntry[]; totalDebit: number; totalCredit: number }>();
    ledgerEntries
      .filter((e: LedgerEntry) => e.ledger_type === type)
      .forEach((e: LedgerEntry) => {
        const key = e.reference_name;
        const g = map.get(key) || { name: e.reference_name, entries: [], totalDebit: 0, totalCredit: 0 };
        g.entries = [...g.entries, e];
        g.totalDebit += e.debit;
        g.totalCredit += e.credit;
        map.set(key, g);
      });
    return Array.from(map.values());
  }, [ledgerEntries, activeTab]);

  const counts = useMemo(() => {
    const partyNames = new Set<string>();
    const supplierNames = new Set<string>();
    ledgerEntries.forEach((e: LedgerEntry) => {
      if (e.ledger_type === 'party') partyNames.add(e.reference_name);
      if (e.ledger_type === 'supplier') supplierNames.add(e.reference_name);
    });
    return { party: partyNames.size, supplier: supplierNames.size, general: 0 };
  }, [ledgerEntries]);

  const tabs = [
    { id: 'party', label: 'Party Ledgers', count: counts.party, icon: Users },
    { id: 'supplier', label: 'Supplier Ledgers', count: counts.supplier, icon: Truck },
    { id: 'general', label: 'General Ledgers', count: counts.general, icon: Building },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ledger Management</h1>
        <div className="text-sm text-gray-600">
          {activeTab === 'supplier' ? 'Supplier' : activeTab === 'party' ? 'Party' : 'General'} Ledgers: {
            tabs.find(tab => tab.id === activeTab)?.count || 0
          }
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Summary Cards */}
      {activeTab === 'supplier' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Supplier Outstanding</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">Rs. 8,46,000</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Supplier Ledgers</p>
                <p className="text-2xl font-bold text-red-600 mt-2">1</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-red-600">1</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder={`Search ${activeTab} ledgers...`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            defaultValue="2025-08-16"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            defaultValue="2025-08-16"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Ledgers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === 'party' ? 'Party' : activeTab === 'supplier' ? 'Supplier' : 'Ledger'} Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total {activeTab === 'party' ? 'Bills' : activeTab === 'supplier' ? 'Memos' : 'Entries'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entries
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outstanding Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeTab !== 'general' && grouped.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No entries</td>
                </tr>
              )}
              {activeTab !== 'general' && grouped.map(g => (
                <tr key={g.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{g.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{activeTab === 'party' ? g.entries.filter((e: LedgerEntry) => e.bill_number).length : g.entries.filter((e: LedgerEntry) => e.memo_number).length}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{g.entries.length}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${activeTab === 'party' ? 'text-green-600' : 'text-orange-600'}`}>
                    Rs. {(g.totalDebit - g.totalCredit).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => onViewLedger?.(g.name, activeTab)}
                        title="View Ledger"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-800">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {activeTab === 'general' && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No general ledgers found</p>
                    <p className="text-sm">General ledgers will appear here for your own vehicles</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LedgersComponent;