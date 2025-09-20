import express from 'express';
import CashbookEntry from '../models/CashbookEntry.js';

const router = express.Router();

// Get all cashbook entries with balance summary
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    
    const cashbookEntries = await CashbookEntry.find({})
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await CashbookEntry.countDocuments();
    const totalPages = Math.ceil(total / limit);
    
    // Get current cash balance (latest running balance)
    const latestEntry = await CashbookEntry.findOne({}, {}, { sort: { date: -1, createdAt: -1 } });
    const currentBalance = latestEntry ? latestEntry.running_balance : 0;
    
    res.json({
      cashbookEntries,
      total,
      totalPages,
      currentPage: parseInt(page),
      currentBalance
    });
  } catch (error) {
    console.error('Error fetching cashbook entries:', error);
    res.status(500).json({ error: 'Failed to fetch cashbook entries' });
  }
});

// Create new cashbook entry
router.post('/', async (req, res) => {
  try {
    const cashbookEntry = new CashbookEntry(req.body);
    await cashbookEntry.save();

    // Create corresponding ledger entries for vehicle expenses
    if (cashbookEntry.vehicle_no && cashbookEntry.category === 'vehicle_expense') {
      const LedgerEntry = (await import('../models/LedgerEntry.js')).default;
      
      const vehicleExpenseEntry = new LedgerEntry({
        referenceId: cashbookEntry._id,
        reference_id: cashbookEntry._id.toString(),
        ledger_type: 'vehicle_expense',
        reference_name: `Vehicle ${cashbookEntry.vehicle_no} - Cash Expense`,
        source_type: 'cashbook',
        type: 'expense',
        date: cashbookEntry.date,
        description: cashbookEntry.narration || 'Vehicle cash expense',
        debit: cashbookEntry.amount,
        credit: 0,
        balance: 0,
        vehicle_no: cashbookEntry.vehicle_no,
      });
      
      await vehicleExpenseEntry.save();
      console.log('✅ Created vehicle ledger entry for cashbook expense:', vehicleExpenseEntry._id);
    }

    // Create party on account ledger entry for on account payments
    if (cashbookEntry.category === 'party_on_account' && cashbookEntry.reference_name) {
      const LedgerEntry = (await import('../models/LedgerEntry.js')).default;
      const Party = (await import('../models/Party.js')).default;
      
      // Find the party by name
      const party = await Party.findOne({ name: cashbookEntry.reference_name });
      const partyId = party ? party._id : cashbookEntry.reference_name;
      
      const onAccountLedgerEntry = new LedgerEntry({
        referenceId: partyId,
        reference_id: cashbookEntry._id.toString(),
        ledger_type: 'party',
        reference_name: cashbookEntry.reference_name,
        source_type: 'cashbook',
        type: 'party',
        date: cashbookEntry.date,
        description: `On Account Payment – Cash Payment`,
        narration: `On Account Payment – Cash Payment`,
        debit: 0,
        credit: cashbookEntry.amount,
        balance: 0,
        partyId: partyId
      });
      
      await onAccountLedgerEntry.save();
      console.log('✅ Created party on account ledger entry from cashbook:', onAccountLedgerEntry._id);
    }

    // Create supplier ledger entry for supplier payments
    if (cashbookEntry.category === 'supplier_payment' && cashbookEntry.reference_name) {
      const LedgerEntry = (await import('../models/LedgerEntry.js')).default;
      const Supplier = (await import('../models/Supplier.js')).default;
      
      // Find the supplier by name
      const supplier = await Supplier.findOne({ name: cashbookEntry.reference_name });
      const supplierId = supplier ? supplier._id : cashbookEntry.reference_name;
      
      const supplierLedgerEntry = new LedgerEntry({
        referenceId: supplierId,
        reference_id: cashbookEntry._id.toString(),
        ledger_type: 'supplier',
        reference_name: cashbookEntry.reference_name,
        source_type: 'cashbook',
        type: 'payment',
        date: cashbookEntry.date,
        description: `Supplier Payment – Cash Payment`,
        narration: `Supplier Payment – Cash Payment`,
        debit: cashbookEntry.amount,
        credit: 0,
        balance: 0,
        supplierId: supplierId
      });
      
      await supplierLedgerEntry.save();
      console.log('✅ Created supplier ledger entry from cashbook:', supplierLedgerEntry._id);
    }

    // Create party commission ledger entry for commission payments
    if (cashbookEntry.category === 'party_commission' && cashbookEntry.type === 'debit' && cashbookEntry.reference_name) {
      const PartyCommissionLedger = (await import('../models/PartyCommissionLedger.js')).default;
      const Party = (await import('../models/Party.js')).default;
      
      // Find the party by name
      const party = await Party.findOne({ name: cashbookEntry.reference_name });
      const partyId = party ? party._id : cashbookEntry.reference_name;
      
      const commissionEntry = new PartyCommissionLedger({
        party_id: partyId,
        party_name: cashbookEntry.reference_name,
        date: cashbookEntry.date,
        bill_number: '',
        reference_id: cashbookEntry._id.toString(),
        entry_type: 'debit',
        amount: cashbookEntry.amount,
        narration: `Commission Payment – Cash Ref #${cashbookEntry._id.toString().slice(-6)}`,
        cashbook_entry_id: cashbookEntry._id,
        reference_type: 'cashbook'
      });
      
      await commissionEntry.save();
      console.log('✅ Created party commission payment entry from cashbook:', commissionEntry._id);
    }

    // Handle bill and memo advance payments
    if (cashbookEntry.category === 'bill_advance' && cashbookEntry.reference_id) {
      const Bill = (await import('../models/Bill.js')).default;
      const bill = await Bill.findOne({ bill_number: cashbookEntry.reference_id });
      
      if (bill) {
        const advancePayment = {
          date: cashbookEntry.date,
          amount: cashbookEntry.amount,
          mode: 'cash',
          reference: `Cashbook Entry: ${cashbookEntry._id}`,
          description: cashbookEntry.narration || 'Cash advance payment'
        };
        
        bill.advance_payments.push(advancePayment);
        await bill.save();
        console.log('✅ Added cash advance payment to bill:', cashbookEntry.reference_id);
      }
    }
    
    if (cashbookEntry.category === 'memo_advance' && cashbookEntry.reference_id) {
      const Memo = (await import('../models/Memo.js')).default;
      const memo = await Memo.findOne({ memo_number: cashbookEntry.reference_id });
      
      if (memo) {
        const advancePayment = {
          date: cashbookEntry.date,
          amount: cashbookEntry.amount,
          mode: 'cash',
          reference: `Cashbook Entry: ${cashbookEntry._id}`,
          description: cashbookEntry.narration || 'Cash advance payment'
        };
        
        memo.advance_payments.push(advancePayment);
        await memo.save();
        console.log('✅ Added cash advance payment to memo:', cashbookEntry.reference_id);
      }
    }

    // Create general ledger entries for all cashbook transactions (same as banking)
    const LedgerEntry = (await import('../models/LedgerEntry.js')).default;
    
    // Determine ledger type based on category
    let ledgerType = 'general';
    if (cashbookEntry.category === 'party_commission') {
      ledgerType = 'commission';
    } else if (cashbookEntry.category === 'vehicle_expense') {
      ledgerType = 'vehicle_expense';
    }
    
    const generalLedgerEntry = new LedgerEntry({
      referenceId: cashbookEntry._id,
      reference_id: cashbookEntry._id.toString(),
      ledger_type: ledgerType,
      reference_name: cashbookEntry.reference_name || cashbookEntry.category || 'Cash Transaction',
      source_type: 'cashbook',
      type: cashbookEntry.type === 'debit' ? 'expense' : 'payment',
      date: cashbookEntry.date,
      description: cashbookEntry.narration || `Cash ${cashbookEntry.type} - ${cashbookEntry.category}`,
      debit: cashbookEntry.type === 'debit' ? cashbookEntry.amount : 0,
      credit: cashbookEntry.type === 'credit' ? cashbookEntry.amount : 0,
      balance: 0,
      vehicle_no: cashbookEntry.vehicle_no || undefined,
    });
    
    await generalLedgerEntry.save();
    console.log('✅ Created general ledger entry for cashbook transaction:', generalLedgerEntry._id);

    res.status(201).json({
      message: 'Cashbook entry created successfully',
      cashbookEntry
    });
  } catch (error) {
    console.error('Create cashbook entry error:', error);
    res.status(500).json({ message: 'Failed to create cashbook entry', error: error.message });
  }
});

// Update cashbook entry
router.put('/:id', async (req, res) => {
  try {
    const oldCashbookEntry = await CashbookEntry.findById(req.params.id);
    if (!oldCashbookEntry) {
      return res.status(404).json({ error: 'Cashbook entry not found' });
    }

    const updateData = {
      ...req.body,
      payment_mode: 'cash' // Ensure it remains a cash transaction
    };
    
    const cashbookEntry = await CashbookEntry.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    // Update corresponding ledger entries
    const LedgerEntry = (await import('../models/LedgerEntry.js')).default;
    
    // Find and update the ledger entry
    const ledgerEntry = await LedgerEntry.findOne({ referenceId: cashbookEntry._id });
    if (ledgerEntry) {
      // Determine ledger type based on category
      let ledgerType = 'general';
      if (cashbookEntry.category === 'party_commission') {
        ledgerType = 'commission';
      } else if (cashbookEntry.category === 'vehicle_expense') {
        ledgerType = 'vehicle_expense';
      }
      
      // Update ledger entry with new data
      await LedgerEntry.findByIdAndUpdate(ledgerEntry._id, {
        ledger_type: ledgerType,
        reference_name: cashbookEntry.reference_name || cashbookEntry.category || 'Cash Transaction',
        type: cashbookEntry.type === 'debit' ? 'expense' : 'payment',
        date: cashbookEntry.date,
        description: cashbookEntry.narration || `Cash ${cashbookEntry.type} - ${cashbookEntry.category}`,
        debit: cashbookEntry.type === 'debit' ? cashbookEntry.amount : 0,
        credit: cashbookEntry.type === 'credit' ? cashbookEntry.amount : 0,
        vehicle_no: cashbookEntry.vehicle_no || undefined,
      });
      
      console.log('✅ Updated corresponding ledger entry for cashbook entry:', req.params.id);
    }
    
    res.json({
      message: 'Cashbook entry updated successfully',
      cashbookEntry
    });
  } catch (error) {
    console.error('Error updating cashbook entry:', error);
    res.status(500).json({ error: 'Failed to update cashbook entry' });
  }
});

// Delete cashbook entry
router.delete('/:id', async (req, res) => {
  try {
    const cashbookEntry = await CashbookEntry.findById(req.params.id);
    
    if (!cashbookEntry) {
      return res.status(404).json({ error: 'Cashbook entry not found' });
    }

    // Remove advance payments from bills and memos
    if (cashbookEntry.category === 'bill_advance' && cashbookEntry.reference_id) {
      const Bill = (await import('../models/Bill.js')).default;
      const bill = await Bill.findOne({ bill_number: cashbookEntry.reference_id });
      
      if (bill) {
        bill.advance_payments = bill.advance_payments.filter(
          payment => payment.reference !== `Cashbook Entry: ${cashbookEntry._id}`
        );
        await bill.save();
        console.log('✅ Removed cash advance payment from bill:', cashbookEntry.reference_id);
      }
    }
    
    if (cashbookEntry.category === 'memo_advance' && cashbookEntry.reference_id) {
      const Memo = (await import('../models/Memo.js')).default;
      const memo = await Memo.findOne({ memo_number: cashbookEntry.reference_id });
      
      if (memo) {
        memo.advance_payments = memo.advance_payments.filter(
          payment => payment.reference !== `Cashbook Entry: ${cashbookEntry._id}`
        );
        await memo.save();
        console.log('✅ Removed cash advance payment from memo:', cashbookEntry.reference_id);
      }
    }

    // Delete associated party commission ledger entries
    const PartyCommissionLedger = (await import('../models/PartyCommissionLedger.js')).default;
    await PartyCommissionLedger.deleteMany({
      cashbook_entry_id: cashbookEntry._id,
      reference_type: 'cashbook'
    });

    // Delete associated general ledger entries
    const LedgerEntry = (await import('../models/LedgerEntry.js')).default;
    await LedgerEntry.deleteMany({
      referenceId: cashbookEntry._id,
      source_type: 'cashbook'
    });
    console.log('✅ Deleted associated ledger entries for cashbook entry:', req.params.id);

    // Delete the cashbook entry
    await CashbookEntry.findByIdAndDelete(req.params.id);
    
    res.json({
      message: 'Cashbook entry deleted successfully',
      cashbookEntry
    });
  } catch (error) {
    console.error('Error deleting cashbook entry:', error);
    res.status(500).json({ error: 'Failed to delete cashbook entry' });
  }
});

// Get cashbook balance summary
router.get('/balance', async (req, res) => {
  try {
    // Get current balance
    const latestEntry = await CashbookEntry.findOne({}, {}, { sort: { date: -1, createdAt: -1 } });
    const currentBalance = latestEntry ? latestEntry.running_balance : 0;
    
    // Get today's transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayTransactions = await CashbookEntry.find({
      date: { $gte: today, $lt: tomorrow }
    });
    
    const todayCredits = todayTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const todayDebits = todayTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Get monthly summary
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyTransactions = await CashbookEntry.find({
      date: { $gte: startOfMonth }
    });
    
    const monthlyCredits = monthlyTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyDebits = monthlyTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    res.json({
      currentBalance,
      today: {
        credits: todayCredits,
        debits: todayDebits,
        net: todayCredits - todayDebits,
        transactions: todayTransactions.length
      },
      thisMonth: {
        credits: monthlyCredits,
        debits: monthlyDebits,
        net: monthlyCredits - monthlyDebits,
        transactions: monthlyTransactions.length
      }
    });
  } catch (error) {
    console.error('Error fetching cashbook balance:', error);
    res.status(500).json({ error: 'Failed to fetch cashbook balance' });
  }
});

export default router;
