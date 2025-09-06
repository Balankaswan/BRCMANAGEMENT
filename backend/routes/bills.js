import express from 'express';
import Bill from '../models/Bill.js';
import LoadingSlip from '../models/LoadingSlip.js';
import PartyCommissionLedger from '../models/PartyCommissionLedger.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes except GET (for testing)
// router.use(authenticateToken);

// Get all bills
router.get('/', async (req, res) => {
  try {
    const { status, party, vehicle_no, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (party) filter.party = new RegExp(party, 'i');
    if (vehicle_no) filter.vehicle_no = new RegExp(vehicle_no, 'i');

    const bills = await Bill.find(filter)
      .populate('loading_slip_id')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Bill.countDocuments(filter);

    // Ensure id field is present for frontend compatibility
    const billsWithId = bills.map(bill => {
      const billObj = bill.toObject();
      billObj.id = billObj._id.toString();
      return billObj;
    });

    res.json({
      bills: billsWithId,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ message: 'Failed to fetch bills', error: error.message });
  }
});

// Get bill by ID
router.get('/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('loading_slip_id');
    
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const billObj = bill.toObject();
    billObj.id = billObj._id.toString();
    res.json(billObj);
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ message: 'Failed to fetch bill', error: error.message });
  }
});

// Helper function to create party commission ledger entry
const createPartyCommissionEntry = async (bill, entryType = 'credit') => {
  if (bill.party_commission_cut && bill.party_commission_cut > 0) {
    const narration = entryType === 'credit' 
      ? `Commission Cut – Bill No. ${bill.bill_number}`
      : `Commission Cut Reversal – Bill No. ${bill.bill_number}`;
    
    // Use party_id/party_name if available, otherwise fallback to party field
    let partyId = bill.party_id;
    let partyName = bill.party_name || bill.party;
    
    // If no party_id, try to find party by name
    if (!partyId && bill.party) {
      try {
        const Party = (await import('../models/Party.js')).default;
        const foundParty = await Party.findOne({ name: bill.party });
        if (foundParty) {
          partyId = foundParty._id;
          partyName = foundParty.name;
        }
      } catch (error) {
        console.warn('Could not find party for commission ledger:', error);
      }
    }
    
    // Only create entry if we have party information
    if (partyId && partyName) {
      const commissionEntry = new PartyCommissionLedger({
        party_id: partyId,
        party_name: partyName,
        date: bill.date,
        bill_number: bill.bill_number,
        reference_id: bill.bill_number,
        entry_type: entryType,
        amount: bill.party_commission_cut,
        narration: narration,
        bill_id: bill._id
      });
      
      await commissionEntry.save();
      console.log(`✅ Created party commission ${entryType} entry for ${partyName}`);
    } else {
      console.warn(`⚠️ Skipping commission ledger entry - missing party info for bill ${bill.bill_number}`);
    }
  }
};

// Create new bill
router.post('/', async (req, res) => {
  try {
    const billData = req.body;

    // Check if bill already exists for this loading slip
    const existingBill = await Bill.findOne({ loading_slip_id: billData.loading_slip_id });
    if (existingBill) {
      return res.status(400).json({ message: 'Bill already exists for this loading slip' });
    }

    // Verify loading slip exists
    const loadingSlip = await LoadingSlip.findById(billData.loading_slip_id);
    if (!loadingSlip) {
      return res.status(400).json({ message: 'Loading slip not found' });
    }

    const bill = new Bill(billData);
    await bill.save();

    // Create party commission ledger entry if commission cut exists
    await createPartyCommissionEntry(bill, 'credit');

    // Populate loading slip data
    await bill.populate('loading_slip_id');

    const billObj = bill.toObject();
    billObj.id = billObj._id.toString();
    
    res.status(201).json({
      message: 'Bill created successfully',
      bill: billObj
    });
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ message: 'Failed to create bill', error: error.message });
  }
});

// Update bill
router.put('/:id', async (req, res) => {
  try {
    // Get original bill to compare commission cut changes
    const originalBill = await Bill.findById(req.params.id);
    if (!originalBill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('loading_slip_id');

    // Handle party commission ledger updates
    const originalCommission = originalBill.party_commission_cut || 0;
    const newCommission = bill.party_commission_cut || 0;

    if (originalCommission !== newCommission) {
      // Remove old commission entry if it existed
      if (originalCommission > 0) {
        await PartyCommissionLedger.deleteMany({
          bill_id: bill._id
        });
        console.log(`🗑️ Removed old commission entry for bill ${bill.bill_number}`);
      }
      
      // Create new commission entry if needed
      if (newCommission > 0) {
        await createPartyCommissionEntry(bill, 'credit');
        console.log(`✅ Updated commission entry for bill ${bill.bill_number}: ₹${newCommission}`);
      }
    }

    const billObj = bill.toObject();
    billObj.id = billObj._id.toString();
    
    res.json({
      message: 'Bill updated successfully',
      bill: billObj
    });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ message: 'Failed to update bill', error: error.message });
  }
});

// Delete bill
router.delete('/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    // Delete associated party commission ledger entries
    await PartyCommissionLedger.deleteMany({
      bill_id: bill._id
    });
    console.log(`🗑️ Deleted commission ledger entries for bill ${bill.bill_number}`);

    // Delete the bill
    await Bill.findByIdAndDelete(req.params.id);

    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({ message: 'Failed to delete bill', error: error.message });
  }
});

// Mark bill as received
router.patch('/:id/received', async (req, res) => {
  try {
    const { received_date, received_amount } = req.body;

    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      {
        status: 'received',
        received_date,
        received_amount
      },
      { new: true }
    ).populate('loading_slip_id');

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const billObj = bill.toObject();
    billObj.id = billObj._id.toString();
    
    res.json({
      message: 'Bill marked as received',
      bill: billObj
    });
  } catch (error) {
    console.error('Mark bill received error:', error);
    res.status(500).json({ message: 'Failed to mark bill as received', error: error.message });
  }
});

// Add advance payment to bill
router.post('/:id/advance', async (req, res) => {
  try {
    const { date, amount, mode, reference, description } = req.body;

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const advancePayment = {
      date,
      amount,
      mode,
      reference,
      description
    };

    bill.advance_payments.push(advancePayment);
    await bill.save();

    const billObj = bill.toObject();
    billObj.id = billObj._id.toString();
    
    res.json({
      message: 'Advance payment added successfully',
      bill: billObj
    });
  } catch (error) {
    console.error('Add advance payment error:', error);
    res.status(500).json({ message: 'Failed to add advance payment', error: error.message });
  }
});

export default router;
