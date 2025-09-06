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
  if (bankingEntry.category === 'party_commission_payment' && bankingEntry.amount > 0) {
    // Extract party info from narration or use provided party details
    let partyId = bankingEntry.party_id;
    let partyName = bankingEntry.party_name || bankingEntry.narration;
    
    // If party info not provided, try to extract from narration
    if (!partyId && bankingEntry.narration) {
      // Try to find party by name in narration
      const Party = (await import('../models/Party.js')).default;
      const parties = await Party.find({});
      const foundParty = parties.find(p => 
        bankingEntry.narration.toLowerCase().includes(p.name.toLowerCase())
      );
      if (foundParty) {
        partyId = foundParty._id;
        partyName = foundParty.name;
      }
    }
    
    if (partyId && partyName) {
      const commissionEntry = new PartyCommissionLedger({
        party_id: partyId,
        party_name: partyName,
        date: bankingEntry.date,
        bill_number: '',
        reference_id: bankingEntry.reference_id || bankingEntry._id.toString(),
        entry_type: 'debit',
        amount: bankingEntry.amount,
        narration: `Commission Payment – Bank Ref #${bankingEntry.reference_id || bankingEntry._id.toString().slice(-6)}`,
        banking_id: bankingEntry._id
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

    // Create party commission ledger entry for commission payments
    await createPartyCommissionPaymentEntry(bankingEntry);

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
    const bankingEntry = await BankingEntry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!bankingEntry) {
      return res.status(404).json({ message: 'Banking entry not found' });
    }

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

    // Delete the banking entry
    await BankingEntry.findByIdAndDelete(req.params.id);

    res.json({ message: 'Banking entry deleted successfully' });
  } catch (error) {
    console.error('Delete banking entry error:', error);
    res.status(500).json({ message: 'Failed to delete banking entry', error: error.message });
  }
});

export default router;
