import LoadingSlip from '../models/LoadingSlip.js';
import Memo from '../models/Memo.js';
import Bill from '../models/Bill.js';

/**
 * Generate next loading slip number
 * Format: LS-1, LS-2, LS-3, etc.
 * Handles both old format (5888) and new format (LS-5889)
 */
export const generateLoadingSlipNumber = async () => {
  try {
    // Find all loading slips and extract numbers
    const allSlips = await LoadingSlip.find({}, { slip_number: 1 })
      .sort({ createdAt: -1 });

    if (!allSlips || allSlips.length === 0) {
      return 'LS-1';
    }

    let maxNumber = 0;

    // Extract numbers from all slip numbers
    allSlips.forEach(slip => {
      const slipNumber = slip.slip_number;
      console.log('Processing slip number:', slipNumber);
      
      // Handle new format: LS-123
      const newFormatMatch = slipNumber.match(/^LS-(\d+)$/);
      if (newFormatMatch) {
        const num = parseInt(newFormatMatch[1]);
        console.log('Found new format number:', num);
        if (num > maxNumber) maxNumber = num;
        return;
      }
      
      // Handle old format: just numbers like 5888
      const oldFormatMatch = slipNumber.match(/^(\d+)$/);
      if (oldFormatMatch) {
        const num = parseInt(oldFormatMatch[1]);
        console.log('Found old format number:', num);
        if (num > maxNumber) maxNumber = num;
        return;
      }
      
      console.log('No match for slip number:', slipNumber);
    });

    console.log('Max number found:', maxNumber);

    const nextNumber = maxNumber + 1;
    return `LS-${nextNumber}`;
  } catch (error) {
    console.error('Error generating loading slip number:', error);
    return 'LS-1';
  }
};

/**
 * Generate next memo number
 * Format: MM-1, MM-2, MM-3, etc.
 */
export const generateMemoNumber = async () => {
  try {
    // Find the latest memo by memo_number
    const latestMemo = await Memo.findOne()
      .sort({ memo_number: -1 })
      .select('memo_number');

    if (!latestMemo) {
      return 'MM-1';
    }

    // Extract number from memo_number (e.g., "MM-5" -> 5)
    const match = latestMemo.memo_number.match(/MM-(\d+)/);
    if (!match) {
      return 'MM-1';
    }

    const lastNumber = parseInt(match[1]);
    const nextNumber = lastNumber + 1;
    
    return `MM-${nextNumber}`;
  } catch (error) {
    console.error('Error generating memo number:', error);
    return 'MM-1';
  }
};

/**
 * Generate next bill number
 * Format: BL-1, BL-2, BL-3, etc.
 */
export const generateBillNumber = async () => {
  try {
    // Find the latest bill by bill_number
    const latestBill = await Bill.findOne()
      .sort({ bill_number: -1 })
      .select('bill_number');

    if (!latestBill) {
      return 'BL-1';
    }

    // Extract number from bill_number (e.g., "BL-5" -> 5)
    const match = latestBill.bill_number.match(/BL-(\d+)/);
    if (!match) {
      return 'BL-1';
    }

    const lastNumber = parseInt(match[1]);
    const nextNumber = lastNumber + 1;
    
    return `BL-${nextNumber}`;
  } catch (error) {
    console.error('Error generating bill number:', error);
    return 'BL-1';
  }
};

/**
 * Get next available numbers for all document types
 */
export const getNextNumbers = async () => {
  try {
    const [nextSlipNumber, nextMemoNumber, nextBillNumber] = await Promise.all([
      generateLoadingSlipNumber(),
      generateMemoNumber(),
      generateBillNumber()
    ]);

    return {
      nextSlipNumber,
      nextMemoNumber,
      nextBillNumber
    };
  } catch (error) {
    console.error('Error getting next numbers:', error);
    return {
      nextSlipNumber: 'LS-1',
      nextMemoNumber: 'MM-1',
      nextBillNumber: 'BL-1'
    };
  }
};
