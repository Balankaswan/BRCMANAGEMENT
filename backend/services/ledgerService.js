import LedgerEntry from '../models/LedgerEntry.js';
import Vehicle from '../models/Vehicle.js';
import LoadingSlip from '../models/LoadingSlip.js';

/**
 * Create ledger entry with running balance calculation
 */
export const createLedgerEntry = async ({ referenceId, type, vehicleNo, partyId, supplierId, debit = 0, credit = 0, description, date, memoNumber }) => {
  try {
    // Get last entry for this vehicle to calculate running balance
    let previousBalance = 0;
    if (vehicleNo) {
      const lastEntry = await LedgerEntry.findOne({ vehicleNo }).sort({ date: -1, createdAt: -1 });
      previousBalance = lastEntry ? lastEntry.balance : 0;
    }

    // Calculate running balance: previousBalance + credit - debit
    const runningBalance = previousBalance + credit - debit;

    const entry = new LedgerEntry({
      referenceId,
      type,
      vehicleNo,
      partyId,
      supplierId,
      description,
      debit,
      credit,
      balance: runningBalance,
      date: date || new Date(),
      memoNumber
    });

    await entry.save();
    console.log(`✅ Created ${type} ledger entry:`, {
      vehicle: vehicleNo,
      credit,
      debit,
      previousBalance,
      newBalance: runningBalance
    });
    
    return entry;
  } catch (error) {
    console.error('Failed to create ledger entry:', error);
    throw error;
  }
};

/**
 * Handle Own Vehicle Memo - creates vehicle ledger entry only
 */
export const handleOwnVehicleMemo = async (memo) => {
  try {
    const loadingSlip = await LoadingSlip.findById(memo.loading_slip_id);
    if (!loadingSlip) {
      throw new Error('Loading slip not found');
    }

    // Create single consolidated entry for the memo (total amount)
    const totalAmount = memo.freight + (memo.detention || 0) + (memo.extra || 0) - (memo.commission || 0) - (memo.mamool || 0);
    
    if (totalAmount > 0) {
      // Check if ledger entry already exists for this memo to prevent duplicates
      const LedgerEntry = (await import('../models/LedgerEntry.js')).default;
      const existingEntry = await LedgerEntry.findOne({
        reference_id: memo._id.toString(),
        source_type: 'memo',
        ledger_type: 'vehicle_expense'
      });
      
      if (!existingEntry) {
        await LedgerEntry.create({
          referenceId: loadingSlip.vehicle_no,
          reference_id: memo._id.toString(),
          ledger_type: 'vehicle_expense',
          reference_name: `Vehicle ${loadingSlip.vehicle_no} - Memo Credit`,
          source_type: 'memo',
          type: 'payment',
          date: memo.date,
          description: `Memo ${memo.memo_number} - Total: ₹${totalAmount} (Freight: ₹${memo.freight}, Detention: ₹${memo.detention || 0}, Extra: ₹${memo.extra || 0}, Commission: -₹${memo.commission || 0}, Mamool: -₹${memo.mamool || 0})`,
          debit: 0,
          credit: totalAmount,
          vehicle_no: loadingSlip.vehicle_no,
          created_at: new Date()
        });
        console.log(`✅ Created vehicle ledger entry for memo ${memo.memo_number}: ₹${totalAmount}`);
      } else {
        console.log(`⚠️ Ledger entry already exists for memo ${memo.memo_number}, skipping duplicate`);
      }
    }

    console.log('✅ Own vehicle memo processed:', {
      memo: memo.memo_number,
      vehicle: loadingSlip.vehicle_no,
      totalAmount,
      detention: memo.detention || 0,
      extra: memo.extra || 0
    });

  } catch (error) {
    console.error('Failed to handle own vehicle memo:', error);
    throw error;
  }
};

/**
 * Handle Market Vehicle Memo - creates supplier ledger entry only
 */
export const handleMarketVehicleMemo = async (memo) => {
  try {
    const netAmount = memo.freight - (memo.commission || 0) - (memo.mamool || 0) + (memo.detention || 0) + (memo.extra || 0);
    
    // Credit Supplier Ledger
    await createLedgerEntry({
      referenceId: memo._id,
      type: 'memo',
      supplierId: memo.supplier_id,
      credit: netAmount,
      debit: 0,
      description: `Market vehicle memo ${memo.memo_number} - Amount payable`,
      date: memo.date
    });

    console.log('✅ Market vehicle memo processed:', {
      memo: memo.memo_number,
      supplier: memo.supplier,
      credit: netAmount
    });

  } catch (error) {
    console.error('Failed to handle market vehicle memo:', error);
    throw error;
  }
};

/**
 * Main memo ledger creation function
 */
export const createMemoLedgerEntries = async (memo) => {
  try {
    const loadingSlip = await LoadingSlip.findById(memo.loading_slip_id);
    if (!loadingSlip) {
      throw new Error('Loading slip not found');
    }

    // Check if vehicle is own or market
    const vehicle = await Vehicle.findOne({ vehicle_no: loadingSlip.vehicle_no });
    const isOwnVehicle = vehicle?.ownership_type === 'own';

    console.log('🚛 Processing memo ledger:', {
      memo: memo.memo_number,
      vehicle: loadingSlip.vehicle_no,
      ownership: vehicle?.ownership_type,
      isOwn: isOwnVehicle
    });

    if (isOwnVehicle) {
      await handleOwnVehicleMemo(memo);
    } else {
      await handleMarketVehicleMemo(memo);
    }

  } catch (error) {
    console.error('Failed to create memo ledger entries:', error);
    throw error;
  }
};
