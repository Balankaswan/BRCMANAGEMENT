import express from 'express';
import Memo from '../models/Memo.js';
import LoadingSlip from '../models/LoadingSlip.js';
import LedgerEntry from '../models/LedgerEntry.js';
import { authenticateToken } from '../middleware/auth.js';
import { createMemoLedgerEntries } from '../services/ledgerService.js';

const router = express.Router();

// Apply authentication to all routes except GET (for testing)
// router.use(authenticateToken);

// Get all memos
router.get('/', async (req, res) => {
  try {
    const { status, supplier, vehicle_no, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (supplier) filter.supplier = new RegExp(supplier, 'i');
    if (vehicle_no) filter.vehicle_no = new RegExp(vehicle_no, 'i');

    const memos = await Memo.find(filter)
      .populate({ path: 'loading_slip_id', model: 'LoadingSlip' })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Memo.countDocuments(filter);

    // Ensure id field is present for frontend compatibility
    const memosWithId = memos.map(memo => {
      const memoObj = memo.toObject();
      memoObj.id = memoObj._id.toString();
      return memoObj;
    });

    res.json({
      memos: memosWithId,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get memos error:', error);
    res.status(500).json({ message: 'Failed to fetch memos', error: error.message });
  }
});

// Get memo by ID
router.get('/:id', async (req, res) => {
  try {
    const memo = await Memo.findById(req.params.id).populate({ path: 'loading_slip_id', model: 'LoadingSlip' });
    
    if (!memo) {
      return res.status(404).json({ message: 'Memo not found' });
    }

    const memoObj = memo.toObject();
    memoObj.id = memoObj._id.toString();
    res.json(memoObj);
  } catch (error) {
    console.error('Get memo error:', error);
    res.status(500).json({ message: 'Failed to fetch memo', error: error.message });
  }
});

// Create new memo
router.post('/', async (req, res) => {
  try {
    const memoData = req.body;

    // Check if memo already exists for this loading slip
    const existingMemo = await Memo.findOne({ loading_slip_id: memoData.loading_slip_id });
    if (existingMemo) {
      return res.status(400).json({ 
        message: 'Memo already exists for this loading slip',
        existingMemo: {
          id: existingMemo._id,
          memo_number: existingMemo.memo_number,
          loading_slip_id: existingMemo.loading_slip_id
        }
      });
    }

    // Verify loading slip exists
    const loadingSlip = await LoadingSlip.findById(memoData.loading_slip_id);
    if (!loadingSlip) {
      return res.status(400).json({ message: 'Loading slip not found' });
    }

    const memo = new Memo(memoData);
    await memo.save();

    // Populate loading slip data
    await memo.populate({ path: 'loading_slip_id', model: 'LoadingSlip' });

    // Automatically create ledger entries
    await createMemoLedgerEntries(memo);

    const memoObj = memo.toObject();
    memoObj.id = memoObj._id.toString();
    
    res.status(201).json({
      message: 'Memo created successfully',
      memo: memoObj
    });
  } catch (error) {
    console.error('Create memo error:', error);
    res.status(500).json({ message: 'Failed to create memo', error: error.message });
  }
});

// Update memo
router.put('/:id', async (req, res) => {
  try {
    // Delete existing ledger entries for this memo
    await LedgerEntry.deleteMany({ referenceId: req.params.id });
    
    const memo = await Memo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate({ path: 'loading_slip_id', model: 'LoadingSlip' });

    if (!memo) {
      return res.status(404).json({ message: 'Memo not found' });
    }

    // Create new ledger entries with updated memo data
    await createMemoLedgerEntries(memo);

    const memoObj = memo.toObject();
    memoObj.id = memoObj._id.toString();
    
    res.json({
      message: 'Memo updated successfully',
      memo: memoObj
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete memo
router.delete('/:id', async (req, res) => {
  try {
    // Delete associated ledger entries first
    await LedgerEntry.deleteMany({ referenceId: req.params.id });
    
    const memo = await Memo.findByIdAndDelete(req.params.id);

    if (!memo) {
      return res.status(404).json({ message: 'Memo not found' });
    }

    res.json({ message: 'Memo deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark memo as paid
router.patch('/:id/paid', async (req, res) => {
  try {
    const { paid_date, paid_amount } = req.body;

    const memo = await Memo.findByIdAndUpdate(
      req.params.id,
      {
        status: 'paid',
        paid_date,
        paid_amount
      },
      { new: true }
    ).populate({ path: 'loading_slip_id', model: 'LoadingSlip' });

    if (!memo) {
      return res.status(404).json({ message: 'Memo not found' });
    }

    const memoObj = memo.toObject();
    memoObj.id = memoObj._id.toString();
    
    res.json({
      message: 'Memo marked as paid',
      memo: memoObj
    });
  } catch (error) {
    console.error('Mark memo paid error:', error);
    res.status(500).json({ message: 'Failed to mark memo as paid', error: error.message });
  }
});

// Add advance payment to memo
router.post('/:id/advance', async (req, res) => {
  try {
    const { date, amount, mode, reference, description } = req.body;

    const memo = await Memo.findById(req.params.id);
    if (!memo) {
      return res.status(404).json({ message: 'Memo not found' });
    }

    const advancePayment = {
      date,
      amount,
      mode,
      reference,
      description
    };

    memo.advance_payments.push(advancePayment);
    await memo.save();

    const memoObj = memo.toObject();
    memoObj.id = memoObj._id.toString();
    
    res.json({
      message: 'Advance payment added successfully',
      memo: memoObj
    });
  } catch (error) {
    console.error('Add advance payment error:', error);
    res.status(500).json({ message: 'Failed to add advance payment', error: error.message });
  }
});

export default router;
