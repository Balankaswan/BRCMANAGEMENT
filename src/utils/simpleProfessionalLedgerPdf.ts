import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Test function to verify libraries are working
export const testLibraries = () => {
  try {
    console.log('🧪 Testing jsPDF...');
    const testDoc = new jsPDF();
    console.log('✅ jsPDF working:', typeof testDoc);
    
    console.log('🧪 Testing XLSX...');
    const testWB = XLSX.utils.book_new();
    console.log('✅ XLSX working:', typeof testWB);
    
    console.log('🧪 Testing number formatting...');
    const testCurrency = `₹${(12345).toLocaleString('en-IN')}`;
    console.log('✅ Number formatting working:', testCurrency);
    
    return true;
  } catch (error) {
    console.error('❌ Library test failed:', error);
    return false;
  }
};

interface LedgerEntry {
  date: string;
  billNo?: string;
  memoNo?: string;
  tripDetails: string;
  credit: number;
  debitPayment: number;
  debitAdvance: number;
  runningBalance: number;
  remarks?: string;
}

interface LedgerTotals {
  credit: number;
  debitPayment: number;
  debitAdvance: number;
  balance?: number;
}

interface LedgerOptions {
  type: 'PARTY' | 'SUPPLIER';
  name: string;
  entries: LedgerEntry[];
  totals: LedgerTotals;
  currentBalance: number;
  dateRange?: {
    from?: string;
    to?: string;
  };
  logoBase64?: string;
}

export const generateProfessionalLedgerPDF = async (options: LedgerOptions) => {
  try {
    console.log('Starting PDF generation with FIXED FORMATTING...');
    console.log('VERSION: 2025-10-08 13:18 - COLUMN ALIGNMENT FIXED');
    console.log('Options received:', { 
      type: options.type, 
      name: options.name, 
      entriesCount: options.entries.length,
      totals: options.totals,
      currentBalance: options.currentBalance
    });
    // Create a new PDF document
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better table fit
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 60;
    let currentPage = 1;
    
    // Debug page dimensions
    console.log(`📄 PDF Page dimensions: ${pageWidth} x ${pageHeight}`);
    
    // Add header
    const addHeader = () => {
      // Company Name - Bold & Uppercase
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('BHAVISHYA ROAD CARRIERS', pageWidth / 2, 20, { align: 'center' });
      
      // Sub-title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text(`${options.type} LEDGER`, pageWidth / 2, 30, { align: 'center' });
      
      // Party/Supplier Name
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const entityLabel = options.type === 'PARTY' ? 'Party' : 'Supplier';
      doc.text(`${entityLabel}: ${options.name.toUpperCase()}`, 20, 45);
      
      // Balance
      doc.setFontSize(14);
      doc.setTextColor(options.currentBalance >= 0 ? 0 : 255, options.currentBalance >= 0 ? 100 : 0, 0);
      doc.text(`Balance: ${Math.abs(options.currentBalance).toLocaleString('en-IN')}`, pageWidth - 20, 45, { align: 'right' });
      
      // Ledger Period
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (options.dateRange?.from || options.dateRange?.to) {
        const fromDate = options.dateRange.from ? new Date(options.dateRange.from).toLocaleDateString('en-IN') : '01 Apr 2024';
        const toDate = options.dateRange.to ? new Date(options.dateRange.to).toLocaleDateString('en-IN') : '31 Mar 2025';
        doc.text(`Ledger Period: ${fromDate} - ${toDate}`, 20, 52);
      }
      
      // Page number
      doc.setFontSize(9);
      doc.text(`Page ${currentPage}`, pageWidth - 20, 52, { align: 'right' });
      
      // Horizontal line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(10, 55, pageWidth - 10, 55);
    };
    
    // Add first page header
    addHeader();
    
    // Table Headers
    const drawTableHeader = () => {
      console.log(`📋 Drawing table header at currentY: ${currentY}`);
      doc.setFillColor(50, 50, 50);
      doc.rect(10, currentY, pageWidth - 20, 10, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      // Improved column positions with better spacing
      doc.text('Date', 15, currentY + 7);
      doc.text(options.type === 'PARTY' ? 'Bill No' : 'Memo No', 40, currentY + 7);
      doc.text('Trip Details', 70, currentY + 7);
      doc.text('Credit', 145, currentY + 7, { align: 'right' });
      doc.text('Debit-Payment', 175, currentY + 7, { align: 'right' });
      doc.text('Debit-Advance', 205, currentY + 7, { align: 'right' });
      doc.text('Balance', 235, currentY + 7, { align: 'right' });
      doc.text('Remarks', 245, currentY + 7);
      
      currentY += 12;
      console.log(`📋 Table header drawn, currentY updated to: ${currentY}`);
    };
    
    drawTableHeader();
    
    // Table Body
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    options.entries.forEach((entry, index) => {
      // Check if we need a new page (more conservative spacing)
      // Account for row height (8) + margin (50) = need at least 58mm from bottom
      if (currentY > pageHeight - 58) {
        console.log(`📄 Adding new page at entry ${index}, currentY: ${currentY}, pageHeight: ${pageHeight}`);
        doc.addPage();
        currentPage++;
        currentY = 60; // Reset Y position for new page
        addHeader();
        drawTableHeader();
        console.log(`📄 New page ${currentPage} created, currentY reset to: ${currentY}`);
        
        // Reset text styles after page break
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }
      
      // Alternating row colors
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(10, currentY - 2, pageWidth - 20, 8, 'F');
      }
      
      // Draw row data - improved positioning and sizing
      doc.text(new Date(entry.date).toLocaleDateString('en-IN'), 15, currentY + 3);
      doc.text((entry.billNo || entry.memoNo || '-').substring(0, 15), 40, currentY + 3);
      
      // Trip details - smaller font with 2-line support for complete information
      doc.setFontSize(8);
      const tripDetails = (entry.tripDetails || '-');
      const maxTripLineLength = 35; // Characters per line
      
      if (tripDetails.length > maxTripLineLength) {
        // Split into two lines
        const line1 = tripDetails.substring(0, maxTripLineLength);
        const line2 = tripDetails.substring(maxTripLineLength, maxTripLineLength * 2);
        doc.text(line1, 70, currentY + 2);
        doc.text(line2, 70, currentY + 6);
      } else {
        doc.text(tripDetails, 70, currentY + 3);
      }
      
      // Reset font size for financial columns
      doc.setFontSize(9);
      
      // Financial columns WITHOUT currency symbols - just numbers
      const creditText = entry.credit > 0 ? entry.credit.toLocaleString('en-IN') : '-';
      const debitPaymentText = entry.debitPayment > 0 ? entry.debitPayment.toLocaleString('en-IN') : '-';
      const debitAdvanceText = entry.debitAdvance > 0 ? entry.debitAdvance.toLocaleString('en-IN') : '-';
      const balanceText = Math.abs(entry.runningBalance).toLocaleString('en-IN');
      
      // Debug first few entries
      if (index < 3) {
        console.log(`🔍 Entry ${index + 1} formatting:`, {
          credit: entry.credit,
          creditText,
          debitPayment: entry.debitPayment,
          debitPaymentText,
          runningBalance: entry.runningBalance,
          balanceText
        });
      }
      
      doc.text(creditText, 145, currentY + 3, { align: 'right' });
      doc.text(debitPaymentText, 175, currentY + 3, { align: 'right' });
      doc.text(debitAdvanceText, 205, currentY + 3, { align: 'right' });
      doc.text(balanceText, 235, currentY + 3, { align: 'right' });
      
      // Remarks with 2-line support for complete information
      const remarks = (entry.remarks || '-');
      const maxRemarksLineLength = 20; // Characters per line
      
      if (remarks.length > maxRemarksLineLength) {
        // Split into two lines
        const remarkLine1 = remarks.substring(0, maxRemarksLineLength);
        const remarkLine2 = remarks.substring(maxRemarksLineLength, maxRemarksLineLength * 2);
        doc.text(remarkLine1, 245, currentY + 2);
        doc.text(remarkLine2, 245, currentY + 6);
      } else {
        doc.text(remarks, 245, currentY + 3);
      }
      
      currentY += 12; // Increased spacing for 2-line support
      
      // Debug every 10 entries
      if ((index + 1) % 10 === 0) {
        console.log(`📊 Processed ${index + 1} entries, currentY: ${currentY}, page: ${currentPage}`);
      }
    });
    
    console.log(`📊 Finished processing ${options.entries.length} entries, final currentY: ${currentY}, final page: ${currentPage}`);
    
    // Totals Row - ensure enough space for totals and signatures
    if (currentY > pageHeight - 80) {
      console.log(`📄 Adding new page for totals, currentY: ${currentY}, pageHeight: ${pageHeight}`);
      doc.addPage();
      currentPage++;
      currentY = 60;
      addHeader();
      drawTableHeader();
      console.log(`📄 Totals page ${currentPage} created, currentY reset to: ${currentY}`);
      
      // Reset text styles after page break
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
    }
    
    doc.setFillColor(240, 240, 240);
    doc.rect(10, currentY - 2, pageWidth - 20, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTALS', 15, currentY + 4);
    doc.text(options.totals.credit.toLocaleString('en-IN'), 145, currentY + 4, { align: 'right' });
    doc.text(options.totals.debitPayment.toLocaleString('en-IN'), 175, currentY + 4, { align: 'right' });
    doc.text(options.totals.debitAdvance.toLocaleString('en-IN'), 205, currentY + 4, { align: 'right' });
    doc.text(Math.abs(options.currentBalance).toLocaleString('en-IN'), 235, currentY + 4, { align: 'right' });
    
    currentY += 15;
    
    // Digital Signature Section
    if (currentY < pageHeight - 60) {
      doc.setLineWidth(0.1);
      doc.setDrawColor(200, 200, 200);
      
      // Signature boxes
      doc.line(30, currentY + 30, 100, currentY + 30);
      doc.line(pageWidth - 100, currentY + 30, pageWidth - 30, currentY + 30);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Prepared By', 65, currentY + 35, { align: 'center' });
      doc.text('Authorized Signatory', pageWidth - 65, currentY + 35, { align: 'center' });
    }
    
    // System footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text('System Generated Ledger – Bhavishya Road Carriers', pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
    
    // Generate filename
    const entityType = options.type.toLowerCase();
    const entityName = options.name.replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${entityType}_ledger_${entityName}_${date}.pdf`;
    
    // Save the PDF - this will download directly
    doc.save(filename);
    
    return doc;
  } catch (error: any) {
    console.error('❌ PDF Generation Error Details:');
    console.error('Error object:', error);
    console.error('Error message:', error?.message || 'No message available');
    console.error('Error stack:', error?.stack || 'No stack trace available');
    console.error('Error name:', error?.name || 'Unknown error type');
    
    // Throw a more descriptive error
    const errorMessage = error?.message || `PDF generation failed: ${error?.toString() || 'Unknown error'}`;
    throw new Error(`PDF Export Failed: ${errorMessage}`);
  }
};

// Export to Excel function
export const exportLedgerToExcel = async (options: LedgerOptions) => {
  try {
    console.log('🔄 Starting Excel export with static import...');
    
    // Prepare data for Excel
    const worksheetData = [
      ['BHAVISHYA ROAD CARRIERS'],
      [`${options.type} LEDGER`],
      [`${options.type === 'PARTY' ? 'Party' : 'Supplier'}: ${options.name}`],
      [`Balance: ${Math.abs(options.currentBalance).toLocaleString('en-IN')}`],
      [],
      ['Date', options.type === 'PARTY' ? 'Bill No' : 'Memo No', 'Trip Details', 'Credit', 'Debit-Payment', 'Debit-Advance', 'Balance', 'Remarks']
    ];
    
    // Add entries
    options.entries.forEach(entry => {
      worksheetData.push([
        new Date(entry.date).toLocaleDateString('en-IN'),
        entry.billNo || entry.memoNo || '-',
        entry.tripDetails || '-',
        entry.credit ? entry.credit.toLocaleString('en-IN') : '-',
        entry.debitPayment ? entry.debitPayment.toLocaleString('en-IN') : '-',
        entry.debitAdvance ? entry.debitAdvance.toLocaleString('en-IN') : '-',
        Math.abs(entry.runningBalance).toLocaleString('en-IN'),
        entry.remarks || '-'
      ]);
    });
    
    // Add totals
    worksheetData.push([
      'TOTALS',
      '',
      '',
      options.totals.credit.toLocaleString('en-IN'),
      options.totals.debitPayment.toLocaleString('en-IN'),
      options.totals.debitAdvance.toLocaleString('en-IN'),
      Math.abs(options.currentBalance).toLocaleString('en-IN'),
      ''
    ]);
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Date
      { wch: 15 }, // Bill/Memo No
      { wch: 30 }, // Trip Details
      { wch: 15 }, // Credit
      { wch: 15 }, // Debit-Payment
      { wch: 15 }, // Debit-Advance
      { wch: 15 }, // Balance
      { wch: 30 }  // Remarks
    ];
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    
    // Generate filename
    const entityType = options.type.toLowerCase();
    const entityName = options.name.replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${entityType}_ledger_${entityName}_${date}.xlsx`;
    
    // Save the file
    XLSX.writeFile(wb, filename);
  } catch (error: any) {
    console.error('❌ Excel Export Error Details:');
    console.error('Error object:', error);
    console.error('Error message:', error?.message || 'No message available');
    console.error('Error stack:', error?.stack || 'No stack trace available');
    console.error('Error name:', error?.name || 'Unknown error type');
    
    // Throw a more descriptive error
    const errorMessage = error?.message || `Excel export failed: ${error?.toString() || 'Unknown error'}`;
    throw new Error(`Excel Export Failed: ${errorMessage}`);
  }
};
