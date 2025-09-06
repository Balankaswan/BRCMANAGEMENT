import express from 'express';
import LedgerEntry from '../models/LedgerEntry.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Disable authentication for all routes temporarily for debugging
router.use((req, res, next) => {
  console.log(`Ledger route: ${req.method} ${req.path}`);
  next(); // Skip authentication completely
});

// Get all ledger entries
router.get('/', async (req, res) => {
  try {
    const { vehicleNo, partyId, supplierId, type, page = 1, limit = 100 } = req.query;
    
    const filter = {};
    if (vehicleNo) filter.vehicleNo = vehicleNo;
    if (partyId) filter.partyId = partyId;
    if (supplierId) filter.supplierId = supplierId;
    if (type) filter.type = type;

    const ledgerEntries = await LedgerEntry.find(filter)
      .sort({ date: 1, createdAt: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await LedgerEntry.countDocuments(filter);

    // Ensure id field is present for frontend compatibility
    const entriesWithId = ledgerEntries.map(entry => {
      const entryObj = entry.toObject();
      entryObj.id = entryObj._id.toString();
      return entryObj;
    });

    res.json({
      ledgerEntries: entriesWithId,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get ledger entries error:', error);
    res.status(500).json({ message: 'Failed to fetch ledger entries', error: error.message });
  }
});

// Get ledger summary by reference name
router.get('/summary/:referenceName', async (req, res) => {
  try {
    const { referenceName } = req.params;
    const { ledger_type } = req.query;
    
    const filter = { reference_name: referenceName };
    if (ledger_type) filter.ledger_type = ledger_type;

    const entries = await LedgerEntry.find(filter).sort({ date: 1 });
    
    let balance = 0;
    const entriesWithBalance = entries.map(entry => {
      balance += entry.debit - entry.credit;
      return {
        ...entry.toObject(),
        runningBalance: balance
      };
    });

    const summary = {
      reference_name: referenceName,
      total_debit: entries.reduce((sum, entry) => sum + entry.debit, 0),
      total_credit: entries.reduce((sum, entry) => sum + entry.credit, 0),
      balance: balance,
      entries: entriesWithBalance
    };

    res.json(summary);
  } catch (error) {
    console.error('Get ledger summary error:', error);
    res.status(500).json({ message: 'Failed to fetch ledger summary', error: error.message });
  }
});

// Clear all ledger entries (for testing)
router.delete('/clear', async (req, res) => {
  try {
    await LedgerEntry.deleteMany({});
    res.json({ message: 'All ledger entries cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear ledger entries', error: error.message });
  }
});

// Create new ledger entry
router.post('/', async (req, res) => {
  try {
    const ledgerData = req.body;
    
    const ledgerEntry = new LedgerEntry(ledgerData);
    await ledgerEntry.save();

    const entryObj = ledgerEntry.toObject();
    entryObj.id = entryObj._id.toString();
    
    res.status(201).json({
      message: 'Ledger entry created successfully',
      ledgerEntry: entryObj
    });
  } catch (error) {
    console.error('Create ledger entry error:', error);
    res.status(500).json({ message: 'Failed to create ledger entry', error: error.message });
  }
});

// Update ledger entry
router.put('/:id', async (req, res) => {
  try {
    const ledgerEntry = await LedgerEntry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!ledgerEntry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }

    res.json({
      message: 'Ledger entry updated successfully',
      ledgerEntry
    });
  } catch (error) {
    console.error('Update ledger entry error:', error);
    res.status(500).json({ message: 'Failed to update ledger entry', error: error.message });
  }
});

// Delete ledger entry
router.delete('/:id', async (req, res) => {
  try {
    const ledgerEntry = await LedgerEntry.findByIdAndDelete(req.params.id);

    if (!ledgerEntry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }

    res.json({ message: 'Ledger entry deleted successfully' });
  } catch (error) {
    console.error('Delete ledger entry error:', error);
    res.status(500).json({ message: 'Failed to delete ledger entry', error: error.message });
  }
});

export default router;
