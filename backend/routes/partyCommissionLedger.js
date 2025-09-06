import express from 'express';
import PartyCommissionLedger from '../models/PartyCommissionLedger.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all party commission ledger entries with optional filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date_from, date_to, bill_number, party_id } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Filter by party if specified
    if (party_id) {
      filter.party_id = party_id;
    }
    
    if (date_from || date_to) {
      filter.date = {};
      if (date_from) filter.date.$gte = new Date(date_from);
      if (date_to) filter.date.$lte = new Date(date_to);
    }
    
    if (bill_number) {
      filter.bill_number = { $regex: bill_number, $options: 'i' };
    }
    
    const entries = await PartyCommissionLedger.find(filter)
      .populate('party_id', 'name')
      .sort({ date: -1, created_at: -1 });
    
    res.json(entries);
  } catch (error) {
    console.error('Error fetching party commission ledger entries:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get ledger summary (party-wise or overall)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { date_from, date_to, party_id } = req.query;
    
    const filter = {};
    
    // Filter by party if specified
    if (party_id) {
      filter.party_id = party_id;
    }
    
    if (date_from || date_to) {
      filter.date = {};
      if (date_from) filter.date.$gte = new Date(date_from);
      if (date_to) filter.date.$lte = new Date(date_to);
    }

    const summary = await PartyCommissionLedger.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCredits: {
            $sum: {
              $cond: [{ $eq: ['$entry_type', 'credit'] }, '$amount', 0]
            }
          },
          totalDebits: {
            $sum: {
              $cond: [{ $eq: ['$entry_type', 'debit'] }, '$amount', 0]
            }
          },
          totalEntries: { $sum: 1 }
        }
      }
    ]);

    const result = summary[0] || { totalCredits: 0, totalDebits: 0, totalEntries: 0 };
    result.balance = result.totalCredits - result.totalDebits;

    res.json(result);
  } catch (error) {
    console.error('Error fetching party commission ledger summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get list of parties with commission entries
router.get('/parties', authenticateToken, async (req, res) => {
  try {
    const parties = await PartyCommissionLedger.aggregate([
      {
        $group: {
          _id: '$party_id',
          party_name: { $first: '$party_name' },
          totalCredits: {
            $sum: {
              $cond: [{ $eq: ['$entry_type', 'credit'] }, '$amount', 0]
            }
          },
          totalDebits: {
            $sum: {
              $cond: [{ $eq: ['$entry_type', 'debit'] }, '$amount', 0]
            }
          },
          entryCount: { $sum: 1 },
          lastEntryDate: { $max: '$date' }
        }
      },
      {
        $addFields: {
          balance: { $subtract: ['$totalCredits', '$totalDebits'] }
        }
      },
      {
        $sort: { party_name: 1 }
      }
    ]);

    res.json(parties);
  } catch (error) {
    console.error('Error fetching parties with commission entries:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create party commission ledger entry (internal use)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const entry = new PartyCommissionLedger(req.body);
    await entry.save();
    res.status(201).json({ entry });
  } catch (error) {
    console.error('Error creating party commission ledger entry:', error);
    res.status(400).json({ message: 'Error creating entry', error: error.message });
  }
});

// Delete party commission ledger entry (internal use)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const entry = await PartyCommissionLedger.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting party commission ledger entry:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
