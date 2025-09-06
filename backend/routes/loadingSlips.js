import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import LoadingSlip from '../models/LoadingSlip.js';
import Memo from '../models/Memo.js';
import Bill from '../models/Bill.js';

const router = express.Router();

// Apply authentication to all routes except GET (for testing)
// router.use(authenticateToken);

// Get all loading slips
router.get('/', async (req, res) => {
  try {
    const { party, vehicle_no, supplier, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (party) filter.party = new RegExp(party, 'i');
    if (vehicle_no) filter.vehicle_no = new RegExp(vehicle_no, 'i');
    if (supplier) filter.supplier = new RegExp(supplier, 'i');

    const loadingSlips = await LoadingSlip.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await LoadingSlip.countDocuments(filter);


    const enrichedLoadingSlips = await Promise.all(
      loadingSlips.map(async (slip) => {
        const slipObj = slip.toObject();

        // Find memo and bill associated with this loading slip
        // Try both string and ObjectId formats to handle different data types
        const memo = await Memo.findOne({ 
          $or: [
            { loading_slip_id: slip._id },
            { loading_slip_id: slip._id.toString() }
          ]
        });
        
        const bill = await Bill.findOne({ 
          $or: [
            { loading_slip_id: slip._id },
            { loading_slip_id: slip._id.toString() }
          ]
        });

        slipObj.memo_number = memo ? memo.memo_number : null;
        slipObj.bill_number = bill ? bill.bill_number : null;
        
        // Ensure id field is present for frontend compatibility
        slipObj.id = slipObj._id.toString();

        return slipObj;
      })
    );

    res.json({
      loadingSlips: enrichedLoadingSlips,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get loading slips error:', error);
    res.status(500).json({ message: 'Failed to fetch loading slips', error: error.message });
  }
});

// Get loading slip by ID
router.get('/:id', async (req, res) => {
  try {
    const loadingSlip = await LoadingSlip.findById(req.params.id);
    
    if (!loadingSlip) {
      return res.status(404).json({ message: 'Loading slip not found' });
    }

    const slipObj = loadingSlip.toObject();
    slipObj.id = slipObj._id.toString();
    res.json(slipObj);
  } catch (error) {
    console.error('Get loading slip error:', error);
    res.status(500).json({ message: 'Failed to fetch loading slip', error: error.message });
  }
});

// Create new loading slip
router.post('/', async (req, res) => {
  try {
    const loadingSlip = new LoadingSlip(req.body);
    await loadingSlip.save();

    const slipObj = loadingSlip.toObject();
    slipObj.id = slipObj._id.toString();
    
    res.status(201).json({
      message: 'Loading slip created successfully',
      loadingSlip: slipObj
    });
  } catch (error) {
    console.error('Create loading slip error:', error);
    res.status(500).json({ message: 'Failed to create loading slip', error: error.message });
  }
});

// Update loading slip
router.put('/:id', async (req, res) => {
  try {
    const loadingSlip = await LoadingSlip.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!loadingSlip) {
      return res.status(404).json({ message: 'Loading slip not found' });
    }

    const slipObj = loadingSlip.toObject();
    slipObj.id = slipObj._id.toString();
    
    res.json({
      message: 'Loading slip updated successfully',
      loadingSlip: slipObj
    });
  } catch (error) {
    console.error('Update loading slip error:', error);
    res.status(500).json({ message: 'Failed to update loading slip', error: error.message });
  }
});

// Delete loading slip
router.delete('/:id', async (req, res) => {
  try {
    const loadingSlip = await LoadingSlip.findByIdAndDelete(req.params.id);

    if (!loadingSlip) {
      return res.status(404).json({ message: 'Loading slip not found' });
    }

    res.json({ message: 'Loading slip deleted successfully' });
  } catch (error) {
    console.error('Delete loading slip error:', error);
    res.status(500).json({ message: 'Failed to delete loading slip', error: error.message });
  }
});

export default router;
