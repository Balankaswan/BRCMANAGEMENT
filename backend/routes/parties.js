import express from 'express';
import Party from '../models/Party.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all parties
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { contact: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }

    const parties = await Party.find(filter)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Party.countDocuments(filter);

    res.json({
      parties,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get parties error:', error);
    res.status(500).json({ message: 'Failed to fetch parties', error: error.message });
  }
});

// Get party by ID
router.get('/:id', async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }

    res.json(party);
  } catch (error) {
    console.error('Get party error:', error);
    res.status(500).json({ message: 'Failed to fetch party', error: error.message });
  }
});

// Create new party
router.post('/', async (req, res) => {
  try {
    const party = new Party(req.body);
    await party.save();

    res.status(201).json({
      message: 'Party created successfully',
      party
    });
  } catch (error) {
    console.error('Create party error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Party with this name already exists' });
    }
    res.status(500).json({ message: 'Failed to create party', error: error.message });
  }
});

// Update party
router.put('/:id', async (req, res) => {
  try {
    const party = await Party.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }

    res.json({
      message: 'Party updated successfully',
      party
    });
  } catch (error) {
    console.error('Update party error:', error);
    res.status(500).json({ message: 'Failed to update party', error: error.message });
  }
});

// Delete party
router.delete('/:id', async (req, res) => {
  try {
    const party = await Party.findByIdAndDelete(req.params.id);

    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }

    res.json({ message: 'Party deleted successfully' });
  } catch (error) {
    console.error('Delete party error:', error);
    res.status(500).json({ message: 'Failed to delete party', error: error.message });
  }
});

export default router;
