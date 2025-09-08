import express from 'express';
import FuelWallet from '../models/FuelWallet.js';
import FuelTransaction from '../models/FuelTransaction.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Disable authentication for all routes temporarily for debugging
router.use((req, res, next) => {
  console.log(`Fuel route: ${req.method} ${req.path}`);
  next(); // Skip authentication completely
});

// Get all fuel wallets
router.get('/wallets', async (req, res) => {
  try {
    const wallets = await FuelWallet.find().sort({ name: 1 });
    res.json({ wallets });
  } catch (error) {
    console.error('Get fuel wallets error:', error);
    res.status(500).json({ message: 'Failed to fetch fuel wallets', error: error.message });
  }
});

// Create new fuel wallet
router.post('/wallets', async (req, res) => {
  try {
    const wallet = new FuelWallet(req.body);
    await wallet.save();

    res.status(201).json({
      message: 'Fuel wallet created successfully',
      wallet
    });
  } catch (error) {
    console.error('Create fuel wallet error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Fuel wallet with this name already exists' });
    }
    res.status(500).json({ message: 'Failed to create fuel wallet', error: error.message });
  }
});

// Update fuel wallet
router.put('/wallets/:id', async (req, res) => {
  try {
    const wallet = await FuelWallet.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!wallet) {
      return res.status(404).json({ message: 'Fuel wallet not found' });
    }

    res.json({
      message: 'Fuel wallet updated successfully',
      wallet
    });
  } catch (error) {
    console.error('Update fuel wallet error:', error);
    res.status(500).json({ message: 'Failed to update fuel wallet', error: error.message });
  }
});

// Get all fuel transactions
router.get('/transactions', async (req, res) => {
  try {
    const { wallet_name, vehicle_no, type, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (wallet_name) filter.wallet_name = wallet_name;
    if (vehicle_no) filter.vehicle_no = new RegExp(vehicle_no, 'i');
    if (type) filter.type = type;

    const transactions = await FuelTransaction.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await FuelTransaction.countDocuments(filter);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get fuel transactions error:', error);
    res.status(500).json({ message: 'Failed to fetch fuel transactions', error: error.message });
  }
});

// Create fuel transaction (credit wallet or allocate fuel)
router.post('/transactions', async (req, res) => {
  try {
    const transaction = new FuelTransaction(req.body);
    await transaction.save();

    // Update or create wallet balance
    let wallet = await FuelWallet.findOne({ name: transaction.wallet_name });
    if (!wallet && transaction.type === 'wallet_credit') {
      // Create new wallet if it doesn't exist and this is a credit transaction
      wallet = new FuelWallet({
        name: transaction.wallet_name,
        balance: 0
      });
    }
    
    if (wallet) {
      if (transaction.type === 'wallet_credit') {
        wallet.balance += transaction.amount;
      } else if (transaction.type === 'fuel_allocation') {
        wallet.balance -= transaction.amount;
      }
      await wallet.save();
      console.log(`✅ Updated wallet ${wallet.name} balance: ${wallet.balance}`);
    }

    res.status(201).json({
      message: 'Fuel transaction created successfully',
      transaction
    });
  } catch (error) {
    console.error('Create fuel transaction error:', error);
    res.status(500).json({ message: 'Failed to create fuel transaction', error: error.message });
  }
});

// Allocate fuel to vehicle
router.post('/allocate', async (req, res) => {
  try {
    const { 
      vehicle_no, 
      wallet_name, 
      amount, 
      date, 
      narration, 
      fuel_quantity, 
      rate_per_liter, 
      odometer_reading,
      fuel_type,
      allocated_by 
    } = req.body;

    // Check wallet balance
    const wallet = await FuelWallet.findOne({ name: wallet_name });
    if (!wallet) {
      return res.status(404).json({ message: 'Fuel wallet not found' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    // Create fuel transaction record
    const fuelTransaction = new FuelTransaction({
      type: 'debit',
      wallet_name,
      amount,
      date: new Date(date),
      vehicle_no,
      narration,
      fuel_quantity,
      rate_per_liter,
      odometer_reading,
      fuel_type: fuel_type || 'Diesel',
      allocated_by: allocated_by || 'System'
    });

    await fuelTransaction.save();

    // Update wallet balance
    wallet.balance -= amount;
    await wallet.save();

    // Create corresponding ledger entry for vehicle fuel expense
    if (vehicle_no) {
      const LedgerEntry = (await import('../models/LedgerEntry.js')).default;
      
      const vehicleFuelExpenseEntry = new LedgerEntry({
        referenceId: fuelTransaction._id,
        reference_id: fuelTransaction._id.toString(),
        ledger_type: 'vehicle_expense',
        reference_name: `Vehicle ${vehicle_no} - Fuel Expense`,
        source_type: 'fuel',
        type: 'expense',
        date: date,
        description: narration || `Fuel expense for vehicle ${vehicle_no} from ${wallet_name}`,
        debit: amount,
        credit: 0,
        balance: 0,
        vehicle_no: vehicle_no,
      });
      
      await vehicleFuelExpenseEntry.save();
      console.log('✅ Created vehicle ledger entry for fuel expense:', vehicleFuelExpenseEntry._id);
    }

    res.status(201).json({
      message: 'Fuel allocated successfully',
      transaction: fuelTransaction,
      wallet
    });
  } catch (error) {
    console.error('Allocate fuel error:', error);
    res.status(500).json({ message: 'Failed to allocate fuel', error: error.message });
  }
});

export default router;
