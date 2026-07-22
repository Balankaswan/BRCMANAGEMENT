import React, { useState, useMemo } from 'react';
import MonthFilterDropdown from './MonthFilterDropdown';
import { TrendingUp, Users, Truck, DollarSign, FileText, Receipt, FileDown, Table, Download } from 'lucide-react';
import { formatCurrency } from '../utils/numberGenerator';
import { useDataStore } from '../lib/store';
import type { PartyLedgerSummary, DashboardExportOptions } from '../utils/dashboardPartyLedgerExport';

interface DashboardProps {
  onNavigate?: (page: string, params?: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { memos, bills, bankingEntries, cashbookEntries, loadingSlips, vehicles } = useDataStore();
  
  // Multi-month filter state — default to current month
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    const now = new Date();
    return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`];
  });

  // Helper: filter items by selected months array
  // If selectedMonths is empty → show everything (Overall mode)
  const filterByMonth = (items: any[], dateField: string = 'date') => {
    if (!selectedMonths || selectedMonths.length === 0) return items;
    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      const itemMonth = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
      return selectedMonths.includes(itemMonth);
    });
  };

  // Filter data by selected month (only for profit and revenue calculations)
  const filteredBills = useMemo(() => filterByMonth(bills), [bills, selectedMonths]);
  const filteredMemos = useMemo(() => filterByMonth(memos), [memos, selectedMonths]);
  

  // Calculate actual profit: Bill Net Amount (excluding TDS and Party Commission Cut) - Memo Net Amount
  const totalProfit = useMemo(() => {
    const totalBillNetAmount = filteredBills.reduce((sum, bill) => {
      // freight - mamool - commission + detention + rto + extra - penalties - party_commission_cut
      const billNetAmountExcludingTDS = bill.bill_amount - (bill.mamool || 0) - (bill.commission || 0) + (bill.detention || 0) + (bill.rto || 0) + (bill.extra || 0) - (bill.penalties || 0) - (bill.party_commission_cut || 0);
      return sum + billNetAmountExcludingTDS;
    }, 0);
    
    const totalMemoNetAmount = filteredMemos.reduce((sum, memo) => sum + memo.net_amount, 0);
    
    return totalBillNetAmount - totalMemoNetAmount;
  }, [filteredBills, filteredMemos]);

  // Calculate party balance (bills due from parties) - OVERALL, not filtered by month
  const partyBalance = useMemo(() => {
    console.log('🔄 Calculating Party Balance...');
    console.log('Total bills:', bills.length);
    const pendingBills = bills.filter(bill => bill.status !== 'received');
    const receivedBills = bills.filter(bill => bill.status === 'received');
    console.log('Pending bills (included):', pendingBills.length);
    console.log('Received bills (excluded):', receivedBills.length);
    console.log('Total banking entries:', bankingEntries.length);
    
    let totalBillAmount = 0;
    let totalPayments = 0;
    
    const balance = bills
      .filter(bill => bill.status !== 'received') // Exclude paid/received bills
      .reduce((sum, bill) => {
      // Calculate total bill amount (what party owes)
      const billAmount = bill.bill_amount || 0;
      const detention = bill.detention || 0;
      const extra = bill.extra || 0;
      const rto = bill.rto || 0;
      const mamool = bill.mamool || 0;
      const tds = bill.tds || 0;
      const penalties = bill.penalties || 0;
      
      // Net amount party owes = Bill Amount + Extras - Deductions
      const partyOwes = billAmount + detention + extra + rto - mamool - tds - penalties;
      
      // Find all payments for this bill from banking entries
      const bankingPayments = bankingEntries
        .filter(entry => {
          const matchesReference = entry.reference_id === bill.bill_number;
          const isCredit = entry.type === 'credit';
          // Include all credit entries that reference this bill
          return matchesReference && isCredit;
        })
        .reduce((total, entry) => {
          console.log(`  Banking Payment found: ${entry.category} - ₹${entry.amount}`);
          return total + entry.amount;
        }, 0);
      
      // Find all payments for this bill from cashbook entries
      const cashbookPayments = cashbookEntries
        .filter(entry => {
          const matchesReference = entry.reference_id === bill.bill_number;
          const isCredit = entry.type === 'credit';
          return matchesReference && isCredit;
        })
        .reduce((total, entry) => {
          console.log(`  Cashbook Payment found: ${entry.category} - ₹${entry.amount}`);
          return total + entry.amount;
        }, 0);
      
      const billPayments = bankingPayments + cashbookPayments;
      
      const billBalance = partyOwes - billPayments;
      
      // Only include positive balances (pending amounts)
      const pendingAmount = Math.max(0, billBalance);
      
      totalBillAmount += partyOwes;
      totalPayments += billPayments;
      
      console.log(`Bill ${bill.bill_number}:`);
      console.log(`  Bill Amount: ₹${billAmount}, Detention: ₹${detention}, Extra: ₹${extra}, RTO: ₹${rto}`);
      console.log(`  Mamool: ₹${mamool}, TDS: ₹${tds}, Penalties: ₹${penalties}`);
      console.log(`  Party Owes: ₹${partyOwes}, Paid: ₹${billPayments}, Pending: ₹${pendingAmount}`);
      
      return sum + pendingAmount;
    }, 0);
    
    // Subtract party on account payments from total balance
    const partyOnAccountPayments = bankingEntries
      .filter(entry => entry.type === 'credit' && entry.category === 'party_on_account')
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const partyOnAccountCashPayments = cashbookEntries
      .filter(entry => entry.type === 'credit' && entry.category === 'party_on_account')
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    // Subtract party debit notes from total balance (debit notes reduce what party owes us)
    const partyDebitNotes = bankingEntries
      .filter(entry => entry.type === 'credit' && entry.category === 'party_debit_note')
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const totalOnAccountPayments = partyOnAccountPayments + partyOnAccountCashPayments;
    const totalDebitNotes = partyDebitNotes;
    const finalBalance = Math.max(0, balance - totalOnAccountPayments - totalDebitNotes);
    
    console.log('📊 Party Balance Summary:');
    console.log(`  Total Bill Amount: ₹${totalBillAmount}`);
    console.log(`  Total Payments: ₹${totalPayments}`);
    console.log(`  Total On Account Payments: ₹${totalOnAccountPayments}`);
    console.log(`  Total Debit Notes: ₹${totalDebitNotes}`);
    console.log(`  💰 Total Pending (Party Balance): ₹${finalBalance}`);
    
    // Debug: Show breakdown of on-account payments by party
    const onAccountByParty = bankingEntries
      .filter(entry => entry.type === 'credit' && entry.category === 'party_on_account')
      .reduce((acc, entry) => {
        const party = entry.reference_name || 'Unknown';
        acc[party] = (acc[party] || 0) + entry.amount;
        return acc;
      }, {} as Record<string, number>);
    
    console.log('🏦 On Account Payments by Party:', onAccountByParty);
    
    // Verification: Simple calculation
    const simpleTotalBills = bills.reduce((sum, bill) => {
      // freight - mamool - commission + detention + rto + extra - tds - penalties
      const netAmount = (bill.bill_amount || 0) - (bill.mamool || 0) - (bill.commission || 0) + (bill.detention || 0) + (bill.rto || 0) + (bill.extra || 0) - (bill.tds || 0) - (bill.penalties || 0);
      return sum + netAmount;
    }, 0);
    
    const simpleBankingPayments = bankingEntries
      .filter(entry => entry.type === 'credit' && bills.some(bill => bill.bill_number === entry.reference_id))
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const simpleCashbookPayments = cashbookEntries
      .filter(entry => entry.type === 'credit' && bills.some(bill => bill.bill_number === entry.reference_id))
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    // Add party on account payments (these should reduce party balance)
    const verifyPartyOnAccountPayments = bankingEntries
      .filter(entry => entry.type === 'credit' && entry.category === 'party_on_account')
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const verifyPartyOnAccountCashPayments = cashbookEntries
      .filter(entry => entry.type === 'credit' && entry.category === 'party_on_account')
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const simpleTotalPayments = simpleBankingPayments + simpleCashbookPayments + verifyPartyOnAccountPayments + verifyPartyOnAccountCashPayments;
    
    console.log('🔍 Verification:');
    console.log(`  Simple Total Bills: ₹${simpleTotalBills}`);
    console.log(`  Simple Total Payments: ₹${simpleTotalPayments}`);
    console.log(`  Simple Balance: ₹${Math.max(0, simpleTotalBills - simpleTotalPayments)}`);
    
    return finalBalance;
  }, [bills, bankingEntries, cashbookEntries]);

  // Calculate supplier balance (memos due to suppliers - ONLY market vehicles) - OVERALL, not filtered by month
  const supplierBalance = useMemo(() => {
    console.log('🔄 Calculating Supplier Balance...');
    console.log('Total memos:', memos.length);
    const pendingMemos = memos.filter(memo => memo.status !== 'paid');
    const paidMemos = memos.filter(memo => memo.status === 'paid');
    console.log('Pending memos (included):', pendingMemos.length);
    console.log('Paid memos (excluded):', paidMemos.length);
    console.log('Total loading slips:', loadingSlips.length);
    console.log('Total vehicles:', vehicles.length);
    
    const balance = memos
      .filter(memo => memo.status !== 'paid') // Exclude memos explicitly marked as paid
      .reduce((sum, memo) => {
      // Handle both string loading_slip_id and populated object
      let loadingSlipId: string;
      if (typeof memo.loading_slip_id === 'string') {
        loadingSlipId = memo.loading_slip_id;
      } else if (memo.loading_slip_id && typeof memo.loading_slip_id === 'object') {
        loadingSlipId = (memo.loading_slip_id as any)._id || (memo.loading_slip_id as any).id;
      } else {
        console.log(`Memo ${memo.memo_number}: No loading slip ID`);
        return sum;
      }
      
      // Find the loading slip and vehicle to check ownership
      const ls = loadingSlips.find(s => {
        const idMatch = s.id === loadingSlipId;
        const objectIdMatch = (s as any)._id === loadingSlipId;
        const objectIdStringMatch = String((s as any)._id) === String(loadingSlipId);
        return idMatch || objectIdMatch || objectIdStringMatch;
      });
      
      if (!ls) {
        console.log(`Memo ${memo.memo_number}: Loading slip not found for ID ${loadingSlipId}`);
        return sum;
      }
      
      const vehicle = vehicles.find(v => v.vehicle_no === ls.vehicle_no);
      
      if (!vehicle) {
        console.log(`Memo ${memo.memo_number}: Vehicle not found for ${ls.vehicle_no}`);
        return sum;
      }
      
      console.log(`Memo ${memo.memo_number}: Vehicle ${ls.vehicle_no}, Ownership: ${vehicle.ownership_type}, Amount: ₹${memo.net_amount}`);
      
      // Only include market vehicles in supplier balance
      if (vehicle.ownership_type !== 'market') {
        console.log(`Skipping memo ${memo.memo_number} - not market vehicle (${vehicle.ownership_type})`);
        return sum;
      }
      
      // Check if memo has been paid (subtract all debit entries that reference this memo
      // in both banking and cashbook, same logic as SupplierDetail)
      const bankingPayments = bankingEntries
        .filter(entry => entry.reference_id === memo.memo_number && entry.type === 'debit')
        .reduce((total, entry) => total + entry.amount, 0);

      const cashbookPayments = cashbookEntries
        .filter(entry => entry.reference_id === memo.memo_number && entry.type === 'debit')
        .reduce((total, entry) => total + entry.amount, 0);
      
      const memoPayments = bankingPayments + cashbookPayments;

      const rawMemoBalance = (memo.net_amount || 0) - memoPayments;
      const memoBalance = Math.max(0, rawMemoBalance);
      console.log(`Memo ${memo.memo_number}: Owes ₹${memo.net_amount}, Paid ₹${memoPayments}, Balance ₹${memoBalance} (raw: ₹${rawMemoBalance})`);

      // Only add positive pending amount; fully paid or overpaid memos do not affect supplier balance
      return sum + memoBalance;
    }, 0);
    
    // Subtract supplier on account payments from total balance
    const supplierOnAccountPayments = bankingEntries
      .filter(entry => entry.type === 'debit' && (entry.category as any) === 'supplier_on_account')
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const supplierOnAccountCashPayments = cashbookEntries
      .filter(entry => entry.type === 'debit' && entry.category === 'supplier_on_account')
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    // Subtract supplier debit notes from total balance (debit notes reduce what we owe suppliers)
    const supplierDebitNotes = bankingEntries
      .filter(entry => entry.type === 'credit' && (entry.category as any) === 'supplier_debit_note')
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const totalSupplierOnAccountPayments = supplierOnAccountPayments + supplierOnAccountCashPayments;
    const totalSupplierDebitNotes = supplierDebitNotes;
    const finalSupplierBalance = Math.max(0, balance - totalSupplierOnAccountPayments - totalSupplierDebitNotes);
    
    console.log('💰 Supplier Balance Summary:');
    console.log(`  Total Memo Balance: ₹${balance}`);
    console.log(`  Total On Account Payments: ₹${totalSupplierOnAccountPayments}`);
    console.log(`  Total Debit Notes: ₹${totalSupplierDebitNotes}`);
    console.log(`  💰 Final Supplier Balance: ₹${finalSupplierBalance}`);
    
    return finalSupplierBalance;
  }, [memos, loadingSlips, vehicles, bankingEntries, cashbookEntries]);

  // ─── Compute full per-party ledger summaries for PDF/Excel export ─────
  const allPartyLedgerSummaries = useMemo((): PartyLedgerSummary[] => {
    // Unique party names from bills
    const partyNames = Array.from(new Set(bills.map(b => b.party))).sort();

    return partyNames.map(partyName => {
      const partyBills = bills
        .filter(b => b.party === partyName)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const partyBankingEntries = bankingEntries.filter(entry => {
        if (
          (entry.category === 'bill_payment' || entry.category === 'bill_advance') &&
          partyBills.some(bill => bill.bill_number === entry.reference_id)
        ) return true;
        if (entry.category === 'party_on_account' && entry.reference_name === partyName) return true;
        if (entry.category === 'party_debit_note' && entry.reference_name === partyName) return true;
        return false;
      });

      const partyCashbookEntries = (cashbookEntries || []).filter(entry => {
        if (
          (entry.category === 'bill_payment' || entry.category === 'bill_advance') &&
          partyBills.some(bill => bill.bill_number === entry.reference_id)
        ) return true;
        if (entry.category === 'party_on_account' && entry.reference_name === partyName) return true;
        if (entry.category === 'party_commission' && entry.reference_name === partyName) return true;
        return false;
      });

      // Build combined timeline
      const allEntries: Array<{
        type: 'bill' | 'payment' | 'advance' | 'on_account' | 'debit_note';
        date: string;
        data: any;
        source?: 'bank' | 'cash';
      }> = [];

      partyBills.forEach(bill => allEntries.push({ type: 'bill', date: bill.date, data: bill }));
      partyBankingEntries.forEach(entry => {
        if (entry.category === 'bill_payment') allEntries.push({ type: 'payment', date: entry.date, data: entry, source: 'bank' });
        else if (entry.category === 'bill_advance') allEntries.push({ type: 'advance', date: entry.date, data: entry, source: 'bank' });
        else if (entry.category === 'party_on_account') allEntries.push({ type: 'on_account', date: entry.date, data: entry, source: 'bank' });
        else if (entry.category === 'party_debit_note') allEntries.push({ type: 'debit_note', date: entry.date, data: entry, source: 'bank' });
      });
      partyCashbookEntries.forEach(entry => {
        if (entry.category === 'bill_payment') allEntries.push({ type: 'payment', date: entry.date, data: entry, source: 'cash' });
        else if (entry.category === 'bill_advance') allEntries.push({ type: 'advance', date: entry.date, data: entry, source: 'cash' });
        else if (entry.category === 'party_on_account') allEntries.push({ type: 'on_account', date: entry.date, data: entry, source: 'cash' });
        else if (entry.category === 'party_commission') allEntries.push({ type: 'on_account', date: entry.date, data: entry, source: 'cash' });
      });

      allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Build ledger rows
      let runningBalance = 0;
      let totalNetBills = 0;
      let totalPayments = 0;
      const rows: PartyLedgerSummary['entries'] = [];

      allEntries.forEach(entry => {
        const bill = entry.type === 'bill'
          ? entry.data
          : partyBills.find(b => b.bill_number === entry.data.reference_id);
        const ls = bill ? loadingSlips.find(s => s.id === bill.loading_slip_id) : null;
        const tripDetails = ls
          ? `${ls.from_location} – ${ls.to_location} / ${ls.vehicle_no}`
          : '';

        let credit = 0;
        let debitPayment = 0;
        let remarks = '';
        let billAmount = 0, detention = 0, extra = 0, rto = 0, tds = 0, mamool = 0, commission = 0, penalties = 0;

        if (entry.type === 'bill') {
          billAmount = entry.data.bill_amount || 0;
          detention = entry.data.detention || 0;
          extra = entry.data.extra || 0;
          rto = entry.data.rto || 0;
          tds = entry.data.tds || 0;
          mamool = entry.data.mamool || 0;
          commission = entry.data.commission || 0;
          penalties = entry.data.penalties || 0;
          credit = billAmount + detention + extra + rto - mamool - commission - tds - penalties;

          const billAdvances = partyBankingEntries.filter(
            be => be.category === 'bill_advance' && be.reference_id === entry.data.bill_number
          );
          const totalAdv = billAdvances.reduce((s, a) => s + a.amount, 0);
          runningBalance += credit - totalAdv;
          totalNetBills += credit;
          remarks = totalAdv > 0
            ? `Bill Created (Adv ₹${totalAdv.toLocaleString('en-IN')})`
            : 'Bill Created';
        } else if (entry.type === 'payment') {
          debitPayment = entry.data.amount;
          runningBalance -= debitPayment;
          totalPayments += debitPayment;
          remarks = `Payment (${entry.source?.toUpperCase() || ''})`;
        } else if (entry.type === 'advance') {
          return; // already accounted
        } else if (entry.type === 'on_account') {
          debitPayment = entry.data.amount;
          runningBalance -= debitPayment;
          totalPayments += debitPayment;
          remarks = `On Account (${entry.source?.toUpperCase() || ''})`;
        } else if (entry.type === 'debit_note') {
          debitPayment = entry.data.amount;
          runningBalance -= debitPayment;
          totalPayments += debitPayment;
          remarks = `Debit Note - ${entry.data.narration || 'Adj'}`;
        }

        rows.push({
          date: entry.date,
          billNo: bill?.bill_number || '',
          tripDetails,
          billAmount,
          detention,
          extra,
          rto,
          tds,
          mamool,
          commission,
          penalties,
          netBill: credit,
          debitPayment,
          runningBalance,
          remarks,
        });
      });

      return {
        partyName: partyName,
        totalBills: partyBills.length,
        totalNetBillAmount: totalNetBills,
        totalPayments: totalPayments,
        outstandingBalance: runningBalance,
        entries: rows,
      };
    });
  }, [bills, bankingEntries, cashbookEntries, loadingSlips]);

  // ─── Export handlers ──────────────────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const { generateDashboardPartyLedgerPDF } = await import(
        '../utils/dashboardPartyLedgerExport'
      );
      await generateDashboardPartyLedgerPDF({
        parties: allPartyLedgerSummaries,
        grandTotalOutstanding: allPartyLedgerSummaries
          .filter(p => p.outstandingBalance > 0)
          .reduce((s, p) => s + p.outstandingBalance, 0),
        exportDate: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('PDF export failed:', err);
      alert(`PDF export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const { generateDashboardPartyLedgerExcel } = await import(
        '../utils/dashboardPartyLedgerExport'
      );
      await generateDashboardPartyLedgerExcel({
        parties: allPartyLedgerSummaries,
        grandTotalOutstanding: allPartyLedgerSummaries
          .filter(p => p.outstandingBalance > 0)
          .reduce((s, p) => s + p.outstandingBalance, 0),
        exportDate: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Excel export failed:', err);
      alert(`Excel export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate monthly revenue (total bill amounts)
  const monthlyRevenue = useMemo(() => {
    return filteredBills.reduce((sum, bill) => sum + bill.bill_amount, 0);
  }, [filteredBills]);

  const stats = [
    {
      title: 'Total Profit (Bill - Memo)',
      value: formatCurrency(totalProfit),
      icon: TrendingUp,
      color: 'bg-green-50 text-green-700',
      iconBg: 'bg-green-100',
    },
    {
      title: 'Party Balance',
      value: formatCurrency(partyBalance),
      icon: Users,
      color: 'bg-blue-50 text-blue-700',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'Supplier Balance',
      value: formatCurrency(supplierBalance),
      icon: Truck,
      color: 'bg-orange-50 text-orange-700',
      iconBg: 'bg-orange-100',
    },
    {
      title: selectedMonths.length === 0 ? 'Total Revenue' : selectedMonths.length === 1 ? 'Monthly Revenue' : 'Multi-Month Revenue',
      value: formatCurrency(monthlyRevenue),
      icon: DollarSign,
      color: 'bg-purple-50 text-purple-700',
      iconBg: 'bg-purple-100',
    },
  ];

  // Get recent bills and memos from filtered data
  const recentBills = filteredBills.slice(0, 5).map((bill, index) => ({
    id: bill.id || `bill-${index}-${Date.now()}`,
    bill_number: bill.bill_number,
    party: bill.party,
    amount: bill.net_amount,
    date: bill.date,
    status: 'Pending' // TODO: Add status tracking
  }));

  const recentMemos = filteredMemos.slice(0, 5).map((memo, index) => ({
    id: memo.id || `memo-${index}-${Date.now()}`,
    memo_number: memo.memo_number,
    supplier: memo.supplier,
    amount: memo.net_amount,
    date: memo.date,
    status: 'Pending' // TODO: Add status tracking
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <MonthFilterDropdown
            selectedMonths={selectedMonths}
            onChange={setSelectedMonths}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isClickable = stat.title === 'Party Balance' || stat.title === 'Supplier Balance';
          
          const handleClick = () => {
            if (!onNavigate) return;
            
            if (stat.title === 'Party Balance') {
              onNavigate('parties');
            } else if (stat.title === 'Supplier Balance') {
              onNavigate('suppliers');
            }
          };
          
          return (
            <div 
              key={`stat-${stat.title}-${index}`} 
              className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200 ${
                isClickable 
                  ? 'cursor-pointer hover:shadow-md hover:border-blue-300 hover:bg-blue-50' 
                  : ''
              }`}
              onClick={isClickable ? handleClick : undefined}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  {isClickable && (
                    <p className="text-xs text-blue-600 mt-1">Click to view details →</p>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color.split(' ')[1]}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Party Ledger Export Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Party Ledger Report</h3>
              <p className="text-sm text-gray-500">
                Export all parties' ledger with bills, payments &amp; outstanding balances
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportPDF}
              disabled={isExporting || bills.length === 0}
              className="inline-flex items-center px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors space-x-2 shadow-sm"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExporting ? 'Generating...' : 'Download PDF'}</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isExporting || bills.length === 0}
              className="inline-flex items-center px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors space-x-2 shadow-sm"
            >
              <Table className="w-4 h-4" />
              <span>{isExporting ? 'Generating...' : 'Download Excel'}</span>
            </button>
          </div>
        </div>

        {/* Quick party-wise outstanding preview */}
        {allPartyLedgerSummaries.filter(p => p.outstandingBalance > 0).length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Top Outstanding Parties</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {allPartyLedgerSummaries
                .filter(p => p.outstandingBalance > 0)
                .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
                .slice(0, 4)
                .map((party, idx) => (
                  <div key={`top-party-${idx}`} className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="text-sm font-medium text-gray-800 truncate">{party.partyName}</div>
                    <div className="text-lg font-bold text-red-700 mt-1">{formatCurrency(party.outstandingBalance)}</div>
                    <div className="text-xs text-gray-500">{party.totalBills} bills</div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Bills</h3>
          </div>
          <div className="p-6">
            {recentBills.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent bills found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentBills.map((bill) => (
                  <div key={`bill-${bill.id}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{bill.bill_number}</div>
                      <div className="text-sm text-gray-500">{bill.party}</div>
                      <div className="text-xs text-gray-400">{new Date(bill.date).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{formatCurrency(bill.amount)}</div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bill.status === 'Paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {bill.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Memos</h3>
          </div>
          <div className="p-6">
            {recentMemos.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent memos found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMemos.map((memo) => (
                  <div key={`memo-${memo.id}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{memo.memo_number}</div>
                      <div className="text-sm text-gray-500">{memo.supplier}</div>
                      <div className="text-xs text-gray-400">{new Date(memo.date).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{formatCurrency(memo.amount)}</div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        memo.status === 'Paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {memo.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;