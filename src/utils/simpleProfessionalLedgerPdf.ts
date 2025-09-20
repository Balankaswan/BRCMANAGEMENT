import jsPDF from 'jspdf';
import { formatCurrency } from './numberGenerator';

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
  dateRange?: {
    from?: string;
    to?: string;
  };
  currentBalance: number;
  logoBase64?: string;
}

export const generateProfessionalLedgerPDF = async (options: LedgerOptions) => {
  try {
    // Create a new PDF document
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better table fit
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 60;
    let currentPage = 1;
    
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
      doc.text(`Balance: ${formatCurrency(Math.abs(options.currentBalance))}`, pageWidth - 20, 45, { align: 'right' });
      
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
    };
    
    drawTableHeader();
    
    // Table Body
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    options.entries.forEach((entry, index) => {
      // Check if we need a new page (more conservative spacing)
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentPage++;
        currentY = 60;
        addHeader();
        drawTableHeader();
      }
      
      // Alternating row colors
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(10, currentY - 2, pageWidth - 20, 8, 'F');
      }
      
      // Draw row data - improved positioning and sizing
      doc.text(new Date(entry.date).toLocaleDateString('en-IN'), 15, currentY + 3);
      doc.text((entry.billNo || entry.memoNo || '-').substring(0, 15), 40, currentY + 3);
      
      // Trip details - smaller font but longer to show vehicle numbers
      doc.setFontSize(8);
      const tripDetails = (entry.tripDetails || '-');
      const maxTripLength = 40; // Increased to show full vehicle numbers
      const displayTrip = tripDetails.length > maxTripLength ? 
        tripDetails.substring(0, maxTripLength - 3) + '...' : 
        tripDetails;
      doc.text(displayTrip, 70, currentY + 3);
      
      // Reset font size for financial columns
      doc.setFontSize(9);
      
      // Financial columns with proper currency formatting
      doc.text(entry.credit > 0 ? formatCurrency(entry.credit) : '-', 145, currentY + 3, { align: 'right' });
      doc.text(entry.debitPayment > 0 ? formatCurrency(entry.debitPayment) : '-', 175, currentY + 3, { align: 'right' });
      doc.text(entry.debitAdvance > 0 ? formatCurrency(entry.debitAdvance) : '-', 205, currentY + 3, { align: 'right' });
      doc.text(formatCurrency(Math.abs(entry.runningBalance)), 235, currentY + 3, { align: 'right' });
      
      // Remarks - with more space from balance column
      const remarks = (entry.remarks || '-');
      const maxRemarksLength = 20; // Reduced to fit better
      const displayRemarks = remarks.length > maxRemarksLength ? 
        remarks.substring(0, maxRemarksLength - 3) + '...' : 
        remarks;
      doc.text(displayRemarks, 245, currentY + 3);
      
      currentY += 8;
    });
    
    // Totals Row
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentPage++;
      currentY = 60;
      addHeader();
      drawTableHeader();
    }
    
    doc.setFillColor(240, 240, 240);
    doc.rect(10, currentY - 2, pageWidth - 20, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTALS', 15, currentY + 4);
    doc.text(formatCurrency(options.totals.credit), 145, currentY + 4, { align: 'right' });
    doc.text(formatCurrency(options.totals.debitPayment), 175, currentY + 4, { align: 'right' });
    doc.text(formatCurrency(options.totals.debitAdvance), 205, currentY + 4, { align: 'right' });
    doc.text(formatCurrency(Math.abs(options.currentBalance)), 235, currentY + 4, { align: 'right' });
    
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
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Export to Excel function
export const exportLedgerToExcel = async (options: LedgerOptions) => {
  try {
    const XLSX = (await import('xlsx')).default;
    
    // Prepare data for Excel
    const worksheetData = [
      ['BHAVISHYA ROAD CARRIERS'],
      [`${options.type} LEDGER`],
      [`${options.type === 'PARTY' ? 'Party' : 'Supplier'}: ${options.name}`],
      [`Balance: ${formatCurrency(Math.abs(options.currentBalance))}`],
      [],
      ['Date', options.type === 'PARTY' ? 'Bill No' : 'Memo No', 'Trip Details', 'Credit', 'Debit-Payment', 'Debit-Advance', 'Balance', 'Remarks']
    ];
    
    // Add entries
    options.entries.forEach(entry => {
      worksheetData.push([
        new Date(entry.date).toLocaleDateString('en-IN'),
        entry.billNo || entry.memoNo || '-',
        entry.tripDetails || '-',
        entry.credit ? formatCurrency(entry.credit) : '-',
        entry.debitPayment ? formatCurrency(entry.debitPayment) : '-',
        entry.debitAdvance ? formatCurrency(entry.debitAdvance) : '-',
        formatCurrency(Math.abs(entry.runningBalance)),
        entry.remarks || '-'
      ]);
    });
    
    // Add totals
    worksheetData.push([
      'TOTALS',
      '',
      '',
      formatCurrency(options.totals.credit),
      formatCurrency(options.totals.debitPayment),
      formatCurrency(options.totals.debitAdvance),
      formatCurrency(Math.abs(options.currentBalance)),
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
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};
