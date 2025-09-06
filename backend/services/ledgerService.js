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

    // Calculate net amount after deductions
    const netAmount = memo.freight - (memo.commission || 0) - (memo.mamool || 0);
    
    // Main freight entry (net amount after commission and mamool)
    await createLedgerEntry({
      referenceId: memo._id,
      type: 'memo',
      vehicleNo: loadingSlip.vehicle_no,
      credit: netAmount,
      debit: 0,
      description: `Freight after deductions`,
      date: memo.date,
      memoNumber: memo.memo_number
    });

    // Separate detention entry if applicable
    if (memo.detention && memo.detention > 0) {
      await createLedgerEntry({
        referenceId: memo._id,
        type: 'memo',
        vehicleNo: loadingSlip.vehicle_no,
        credit: memo.detention,
        debit: 0,
        description: `Detention charges`,
        date: memo.date,
        memoNumber: memo.memo_number
      });
    }

    // Separate extra charges entry if applicable
    if (memo.extra && memo.extra > 0) {
      await createLedgerEntry({
        referenceId: memo._id,
        type: 'memo',
        vehicleNo: loadingSlip.vehicle_no,
        credit: memo.extra,
        debit: 0,
        description: `Extra charges`,
        date: memo.date,
        memoNumber: memo.memo_number
      });
    }

    console.log('✅ Own vehicle memo processed:', {
      memo: memo.memo_number,
      vehicle: loadingSlip.vehicle_no,
      netAmount,
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
