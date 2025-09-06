import express from 'express';
import BankingEntry from '../models/BankingEntry.js';

const router = express.Router();

// Get all cashbook entries (cash transactions only)
router.get('/', async (req, res) => {
  try {
    const cashbookEntries = await BankingEntry.find({ 
      payment_mode: 'cash' 
    }).sort({ date: -1, createdAt: -1 });
    
    res.json({
      cashbookEntries,
      total: cashbookEntries.length,
      totalPages: 1
    });
  } catch (error) {
    console.error('Error fetching cashbook entries:', error);
    res.status(500).json({ error: 'Failed to fetch cashbook entries' });
  }
});

// Create new cashbook entry
router.post('/', async (req, res) => {
  try {
    const cashbookEntry = new BankingEntry(req.body);
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
    const updateData = {
      ...req.body,
      payment_mode: 'cash' // Ensure it remains a cash transaction
    };
    
    const cashbookEntry = await BankingEntry.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!cashbookEntry) {
      return res.status(404).json({ error: 'Cashbook entry not found' });
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
    const cashbookEntry = await BankingEntry.findByIdAndDelete(req.params.id);
    
    if (!cashbookEntry) {
      return res.status(404).json({ error: 'Cashbook entry not found' });
    }
    
    res.json({
      message: 'Cashbook entry deleted successfully',
      cashbookEntry
    });
  } catch (error) {
    console.error('Error deleting cashbook entry:', error);
    res.status(500).json({ error: 'Failed to delete cashbook entry' });
  }
});

export default router;
