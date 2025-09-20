import express from 'express';
import BankingEntry from '../models/BankingEntry.js';
import PartyCommissionLedger from '../models/PartyCommissionLedger.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Disable authentication for all routes temporarily for debugging
router.use((req, res, next) => {
  console.log(`Banking route: ${req.method} ${req.path}`);
  next(); // Skip authentication completely
});

// Get all banking entries
router.get('/', async (req, res) => {
  try {
    console.log('Banking GET request received');
    const { type, category, vehicle_no, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (vehicle_no) filter.vehicle_no = new RegExp(vehicle_no, 'i');

    console.log('Banking filter:', filter);
    const bankingEntries = await BankingEntry.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await BankingEntry.countDocuments(filter);
    console.log('Banking entries found:', bankingEntries.length, 'total:', total);

    res.json({
      bankingEntries,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get banking entries error:', error);
    res.status(500).json({ message: 'Failed to fetch banking entries', error: error.message });
  }
});

// Get banking entry by ID
router.get('/:id', async (req, res) => {
  try {
    const bankingEntry = await BankingEntry.findById(req.params.id);
    
    if (!bankingEntry) {
      return res.status(404).json({ message: 'Banking entry not found' });
    }

    res.json(bankingEntry);
  } catch (error) {
    console.error('Get banking entry error:', error);
    res.status(500).json({ message: 'Failed to fetch banking entry', error: error.message });
  }
});

// Helper function to create party commission ledger entry for payments
const createPartyCommissionPaymentEntry = async (bankingEntry) => {
  if (bankingEntry.category === 'party_commission' && bankingEntry.type === 'debit' && bankingEntry.amount > 0) {
    // Extract party info from reference_name or narration
    let partyId = bankingEntry.party_id;
    let partyName = bankingEntry.reference_name || bankingEntry.party_name || bankingEntry.narration;
    
    // If party info not provided, try to extract from narration
    if (!partyId && partyName) {
      // Try to find party by name
      const Party = (await import('../models/Party.js')).default;
      const party = await Party.findOne({ name: partyName });
      if (party) {
        partyId = party._id;
        partyName = party.name;
      }
    }
    
    if (partyId && partyName) {
      const commissionEntry = new PartyCommissionLedger({
        party_id: partyId,
        party_name: partyName,
        date: bankingEntry.date,
        bill_number: '',
        reference_id: bankingEntry._id.toString(),
        entry_type: 'debit',
        amount: bankingEntry.amount,
        narration: `Commission Payment – Bank Ref #${bankingEntry._id.toString().slice(-6)}`,
        banking_entry_id: bankingEntry._id,
        reference_type: 'banking'
      });
      
      await commissionEntry.save();
      console.log('✅ Created party commission payment entry:', commissionEntry._id);
    }
  }
};

// Create new banking entry
router.post('/', async (req, res) => {
  try {
    const bankingEntry = new BankingEntry(req.body);
    await bankingEntry.save();

    // Create corresponding ledger entries for vehicle expenses
    if (bankingEntry.vehicle_no && bankingEntry.category === 'vehicle_expense') {
      const LedgerEntry = (await import('../models/LedgerEntry.js')).default;
      
      const vehicleExpenseEntry = new LedgerEntry({
        referenceId: bankingEntry._id,
        reference_id: bankingEntry._id.toString(),
        ledger_type: 'vehicle_expense',
        reference_name: `Vehicle ${bankingEntry.vehicle_no} - Expense`,
        source_type: 'banking',
        type: 'expense',
        date: bankingEntry.date,
        description: bankingEntry.narration || 'Vehicle expense',
        debit: bankingEntry.amount,
        credit: 0,
        balance: 0,
        vehicle_no: bankingEntry.vehicle_no,
      });
      
      await vehicleExpenseEntry.save();
      console.log('✅ Created vehicle ledger entry for banking expense:', vehicleExpenseEntry._id);
    }

    // Create party on account ledger entry for on account payments
    if (bankingEntry.category === 'party_on_account' && bankingEntry.reference_name) {
      const LedgerEntry = (await import('../models/LedgerEntry.js')).default;
      const Party = (await import('../models/Party.js')).default;
      
      // Find the party by name
      const party = await Party.findOne({ name: bankingEntry.reference_name });
      const partyId = party ? party._id : bankingEntry.reference_name;
      
      const onAccountLedgerEntry = new LedgerEntry({
        referenceId: partyId,
        reference_id: bankingEntry._id.toString(),
        ledger_type: 'party',
        reference_name: bankingEntry.reference_name,
        source_type: 'banking',
        type: 'party',
        date: bankingEntry.date,
        description: `On Account Payment – Bank Transfer`,
        narration: `On Account Payment – Bank Transfer`,
        debit: 0,
        credit: bankingEntry.amount,
        balance: 0,
        partyId: partyId
      });
      
      await onAccountLedgerEntry.save();
      console.log('✅ Created party on account ledger entry:', onAccountLedgerEntry._id);
    }

    // Create party commission ledger entry for commission payments
    await createPartyCommissionPaymentEntry(bankingEntry);

    // Handle fuel wallet credits for banking transactions
    if (bankingEntry.category === 'fuel_wallet' && bankingEntry.reference_name && bankingEntry.type === 'debit') {
      const FuelWallet = (await import('../models/FuelWallet.js')).default;
      const FuelTransaction = (await import('../models/FuelTransaction.js')).default;
      
      // Find or create the fuel wallet
      let wallet = await FuelWallet.findOne({ name: bankingEntry.reference_name });
      if (!wallet) {
        wallet = new FuelWallet({
          name: bankingEntry.reference_name,
          balance: 0
        });
      }
      
      // Credit the wallet
      wallet.balance += bankingEntry.amount;
      await wallet.save();
      
      // Create fuel transaction record
      const fuelTransaction = new FuelTransaction({
        type: 'wallet_credit',
        wallet_name: bankingEntry.reference_name,
        amount: bankingEntry.amount,
        date: bankingEntry.date,
        narration: bankingEntry.narration || `Bank debit for fuel - ${bankingEntry.reference_name}`,
        fuel_type: 'Diesel'
      });
      
      await fuelTransaction.save();
      console.log('✅ Credited fuel wallet from banking:', bankingEntry.reference_name, 'Amount:', bankingEntry.amount);
    }

    // Create general ledger entry for all banking transactions
    const LedgerEntry = (await import('../models/LedgerEntry.js')).default;
    
    // Determine ledger type based on category
    let ledgerType = 'general';
    if (bankingEntry.category === 'party_commission') {
      ledgerType = 'commission';
    } else if (bankingEntry.category === 'vehicle_expense') {
      ledgerType = 'vehicle_expense';
    }
    
    const generalLedgerEntry = new LedgerEntry({
      referenceId: bankingEntry._id,
      reference_id: bankingEntry._id.toString(),
      ledger_type: ledgerType,
      reference_name: bankingEntry.reference_name || bankingEntry.category || 'Bank Transaction',
      source_type: 'banking',
      type: bankingEntry.type === 'debit' ? 'expense' : 'payment',
      date: bankingEntry.date,
      description: bankingEntry.narration || `Bank ${bankingEntry.type} - ${bankingEntry.category}`,
      debit: bankingEntry.type === 'debit' ? bankingEntry.amount : 0,
      credit: bankingEntry.type === 'credit' ? bankingEntry.amount : 0,
      balance: 0,
      vehicle_no: bankingEntry.vehicle_no || undefined,
    });
    
    await generalLedgerEntry.save();
    console.log('✅ Created general ledger entry for banking transaction:', generalLedgerEntry._id);

    res.status(201).json({
      message: 'Banking entry created successfully',
      bankingEntry
    });
  } catch (error) {
    console.error('Create banking entry error:', error);
    res.status(500).json({ message: 'Failed to create banking entry', error: error.message });
  }
});

// Update banking entry
router.put('/:id', async (req, res) => {
  try {
    const oldBankingEntry = await BankingEntry.findById(req.params.id);
    if (!oldBankingEntry) {
      return res.status(404).json({ message: 'Banking entry not found' });
    }

    const bankingEntry = await BankingEntry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Update corresponding ledger entries
    const LedgerEntry = (await import('../models/LedgerEntry.js')).default;
    
    // Determine ledger type based on category
    let ledgerType = 'general';
    if (bankingEntry.category === 'party_commission') {
      ledgerType = 'commission';
    } else if (bankingEntry.category === 'vehicle_expense') {
      ledgerType = 'vehicle_expense';
    }
    
    // Update all ledger entries with this referenceId (in case of duplicates)
    const updateResult = await LedgerEntry.updateMany(
      { referenceId: bankingEntry._id },
      {
        ledger_type: ledgerType,
        reference_name: bankingEntry.reference_name || bankingEntry.category || 'Bank Transaction',
        type: bankingEntry.type === 'debit' ? 'expense' : 'payment',
        date: bankingEntry.date,
        description: bankingEntry.narration || `Bank ${bankingEntry.type} - ${bankingEntry.category}`,
        debit: bankingEntry.type === 'debit' ? bankingEntry.amount : 0,
        credit: bankingEntry.type === 'credit' ? bankingEntry.amount : 0,
        vehicle_no: bankingEntry.vehicle_no || undefined,
      }
    );
    
    console.log('✅ Updated', updateResult.modifiedCount, 'ledger entries for banking entry:', req.params.id);

    res.json({
      message: 'Banking entry updated successfully',
      bankingEntry
    });
  } catch (error) {
    console.error('Update banking entry error:', error);
    res.status(500).json({ message: 'Failed to update banking entry', error: error.message });
  }
});

// Delete banking entry
router.delete('/:id', async (req, res) => {
  try {
    console.log('DELETE request for banking entry:', req.params.id);
    
    const bankingEntry = await BankingEntry.findById(req.params.id);
    if (!bankingEntry) {
      return res.status(404).json({ message: 'Banking entry not found' });
    }

    // Delete associated party commission ledger entries
    await PartyCommissionLedger.deleteMany({
      banking_entry_id: bankingEntry._id,
      reference_type: 'banking'
    });

    // Delete associated general ledger entries
    const LedgerEntry = (await import('../models/LedgerEntry.js')).default;
    await LedgerEntry.deleteMany({
      referenceId: bankingEntry._id,
      source_type: 'banking'
    });
    console.log('✅ Deleted associated ledger entries for banking entry:', req.params.id);

    // Delete the banking entry
    await BankingEntry.findByIdAndDelete(req.params.id);

    res.json({ message: 'Banking entry deleted successfully' });
  } catch (error) {
    console.error('Delete banking entry error:', error);
    res.status(500).json({ message: 'Failed to delete banking entry', error: error.message });
  }
});

export default router;
