import jsPDF from 'jspdf';
import { LOGO_CONFIG, COMPANY_LOGO_BASE64 } from '../assets/logo';
import type { LoadingSlip, Memo, Bill } from '../types';

// Helper: ensure PNG data URL for jsPDF.addImage
const ensurePngDataUrl = async (dataUrl: string): Promise<string> => {
  try {
    if (dataUrl.startsWith('data:image/png')) return dataUrl;
    // Convert other formats (e.g., SVG/JPEG) to PNG via canvas
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = dataUrl;
    // Default canvas size based on image natural size; fallback if 0
    const w = (img as any).naturalWidth || 256;
    const h = (img as any).naturalHeight || 256;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl; // fallback
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return dataUrl; // fallback, jsPDF may still try
  }
};

// Company details - you can modify these
export const COMPANY_INFO = {
  name: 'BHAVISHYA ROAD CARRIERS',
  address: 'Specialist in Heavy ODC, Hydraulic, Low Bed Trailer, Flat Bed Trailer Transport & Commission Agent',
  address2: 'FLEET OWNERS, TRANSPORT CONTRACTORS & COMMISSION AGENTS',
  address3: 'MEMBER OF ALL INDIA MOTOR TRANSPORT CONGRESS',
  phone: 'MOB: 9824026578, 9824900776',
  pan: 'PAN NO: BNDPK7173D',
  location: '404, Parijaat Business Center, Nr. SP Ring Road, Aslali, Ahmedabad - 382405',
  tagline: 'DIRECT TO AHMEDABAD JURISDICTION'
};

// Utility function to format currency
export const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Utility function to format date
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Generate Memo PDF - Portrait Format for single page fit
export const generateMemoPDF = async (memo: Memo, loadingSlip: LoadingSlip): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4'); // Portrait orientation for better fit
  const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm in portrait
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm in portrait

  // Add logo with proper positioning to avoid collision
  try {
    const logoPng = await ensurePngDataUrl(COMPANY_LOGO_BASE64);
    pdf.addImage(logoPng, 'PNG', 15, 8, 25, 25); // Positioned on left side
  } catch (error) {
    console.warn('Could not add logo to PDF:', error);
  }

  // Company Header - Professional Layout with blue accent
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(25, 118, 210); // Professional blue color
  pdf.text(COMPANY_INFO.name, pageWidth / 2, 15, { align: 'center' });

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(COMPANY_INFO.address, pageWidth / 2, 21, { align: 'center' });
  pdf.text(COMPANY_INFO.address2, pageWidth / 2, 25, { align: 'center' });
  pdf.text(COMPANY_INFO.location, pageWidth / 2, 29, { align: 'center' });

  // Contact details in header
  pdf.setFontSize(7);
  pdf.text(COMPANY_INFO.phone, 15, 37);
  pdf.text(COMPANY_INFO.pan, pageWidth - 15, 37, { align: 'right' });
  pdf.text(COMPANY_INFO.tagline, pageWidth / 2, 41, { align: 'center' });

  // Header border - black color
  pdf.setLineWidth(1);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(10, 5, pageWidth - 20, 40);

  // Document title - simple without background
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('BROKER MEMO', pageWidth / 2, 55, { align: 'center' });

  // Document details box - more compact
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.setTextColor(0, 0, 0);
  pdf.rect(10, 65, pageWidth - 20, 15);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Memo No: ${memo.memo_number}`, 15, 70);
  pdf.text(`Date: ${formatDate(memo.date)}`, pageWidth - 15, 70, { align: 'right' });
  pdf.text(`Supplier: ${memo.supplier}`, 15, 76);
  pdf.text(`Vehicle No: ${loadingSlip.vehicle_no}`, pageWidth - 15, 76, { align: 'right' });

  // Transport Details Section - simple heading
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('TRANSPORT DETAILS', 15, 85);

  // Transport details table - more compact
  pdf.setLineWidth(0.3);
  const transportY = 95;

  // From/To section - reduced height
  pdf.rect(10, transportY, (pageWidth - 20) / 2, 12);
  pdf.rect(10 + (pageWidth - 20) / 2, transportY, (pageWidth - 20) / 2, 12);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FROM:', 15, transportY + 4);
  pdf.text('TO:', 15 + (pageWidth - 20) / 2, transportY + 4);

  pdf.setFont('helvetica', 'normal');
  pdf.text(loadingSlip.from_location, 15, transportY + 8);
  pdf.text(loadingSlip.to_location, 15 + (pageWidth - 20) / 2, transportY + 8);

  // Material and weight - reduced height
  pdf.rect(10, transportY + 12, (pageWidth - 20) / 2, 10);
  pdf.rect(10 + (pageWidth - 20) / 2, transportY + 12, (pageWidth - 20) / 2, 10);

  pdf.setFont('helvetica', 'bold');
  pdf.text('MATERIAL:', 15, transportY + 17);
  pdf.text('WEIGHT:', 15 + (pageWidth - 20) / 2, transportY + 17);

  pdf.setFont('helvetica', 'normal');
  pdf.text('MACHINERY', 15, transportY + 21);
  pdf.text(`${loadingSlip.weight} MT`, 15 + (pageWidth - 20) / 2, transportY + 21);

  // Financial Breakdown Section - simple heading
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('FINANCIAL BREAKDOWN', 15, 120);

  const financialY = 130;
  pdf.setLineWidth(0.3);

  // Calculate total advances
  const totalAdvances = memo.advance_payments?.reduce((sum, adv) => sum + adv.amount, 0) || 0;

  // Financial table - more compact rows
  const financialRows = [
    ['Freight Amount:', formatCurrency(memo.freight)],
    ['Add: Detention:', formatCurrency(memo.detention)],
    ['Add: Extra Weight:', formatCurrency(memo.extra)],
    ['Add: RTO:', formatCurrency(memo.rto)],
    ['Less: Commission:', `(${formatCurrency(memo.commission)})`],
    ['Less: Mamool:', `(${formatCurrency(memo.mamool)})`],
    ['Less: Advance Paid:', `(${formatCurrency(totalAdvances)})`]
  ];

  financialRows.forEach((row, index) => {
    const rowY = financialY + (index * 6); // Reduced row height
    pdf.rect(10, rowY, pageWidth - 20, 6);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(row[0], 15, rowY + 4);
    pdf.text(row[1], pageWidth - 15, rowY + 4, { align: 'right' });
  });

  // Net Amount - simple without background
  const netAmountY = financialY + (financialRows.length * 6);
  pdf.rect(10, netAmountY, pageWidth - 20, 8);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('BALANCE AMOUNT:', 15, netAmountY + 5);
  pdf.text(formatCurrency(memo.net_amount), pageWidth - 15, netAmountY + 5, { align: 'right' });

  // Advance Details Section
  const advanceY = netAmountY + 15;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ADVANCE DETAILS', 15, advanceY);
  
  if (memo.advance_payments && memo.advance_payments.length > 0) {
    memo.advance_payments.forEach((advance, index) => {
      const rowY = advanceY + 5 + (index * 5);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${index + 1}. ${formatDate(advance.date)} - ${formatCurrency(advance.amount)}`, 15, rowY);
      if (advance.description) {
        pdf.text(advance.description, 120, rowY);
      }
    });
  } else {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('No advance payments recorded', 15, advanceY + 5);
  }

  // Signature section - portrait layout
  const signatureY = advanceY + 25;
  pdf.setTextColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(20, signatureY, 90, signatureY);
  pdf.line(pageWidth - 90, signatureY, pageWidth - 20, signatureY);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('SUPPLIER SIGNATURE', 55, signatureY + 5, { align: 'center' });
  pdf.text('AUTHORISED SIGNATORY', pageWidth - 55, signatureY + 5, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.text(`FOR ${COMPANY_INFO.name}`, pageWidth - 55, signatureY + 10, { align: 'center' });

  // Footer with system info
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('GENERATED FROM BHAVISHYA ROAD CARRIER SYSTEM', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF with specified filename format
  const filename = `Memo_${memo.memo_number}_${memo.supplier.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  pdf.save(filename);
};

// Generate Loading Slip PDF - Professional Template with proper logo positioning
export const generateLoadingSlipPDF = async (loadingSlip: LoadingSlip): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Add logo with proper positioning to avoid collision
  try {
    const logoPng = await ensurePngDataUrl(COMPANY_LOGO_BASE64);
    pdf.addImage(logoPng, 'PNG', 15, 8, 25, 25); // Positioned on left side
  } catch (error) {
    console.warn('Could not add logo to PDF:', error);
  }

  // Company Header - Professional Layout with blue accent
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(25, 118, 210); // Professional blue color
  pdf.text(COMPANY_INFO.name, pageWidth / 2, 15, { align: 'center' });

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(COMPANY_INFO.address, pageWidth / 2, 21, { align: 'center' });
  pdf.text(COMPANY_INFO.address2, pageWidth / 2, 25, { align: 'center' });
  pdf.text(COMPANY_INFO.location, pageWidth / 2, 29, { align: 'center' });

  // Contact details in header
  pdf.setFontSize(7);
  pdf.text(COMPANY_INFO.phone, 15, 37);
  pdf.text(COMPANY_INFO.pan, pageWidth - 15, 37, { align: 'right' });
  pdf.text(COMPANY_INFO.tagline, pageWidth / 2, 41, { align: 'center' });

  // Header border - black color
  pdf.setLineWidth(1);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(10, 5, pageWidth - 20, 40);

  // Document title with blue background
  pdf.setFillColor(25, 118, 210);
  pdf.rect(10, 50, pageWidth - 20, 10, 'F');
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('LOADING SLIP', pageWidth / 2, 57, { align: 'center' });

  // Document details box
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.setTextColor(0, 0, 0);
  pdf.rect(10, 65, pageWidth - 20, 15);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Loading Slip No: ${loadingSlip.slip_number}`, 15, 70);
  pdf.text(`Date: ${formatDate(loadingSlip.date)}`, pageWidth - 15, 70, { align: 'right' });
  pdf.text(`Vehicle No: ${loadingSlip.vehicle_no}`, 15, 76);
  pdf.text(`Weight: ${loadingSlip.weight} MT`, pageWidth - 15, 76, { align: 'right' });

  // Party Details Section - increased size and intense blue background
  pdf.setFillColor(25, 118, 210);
  pdf.rect(10, 85, pageWidth - 20, 8, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(`Party: ${loadingSlip.party}`, 15, 91);
  pdf.setTextColor(0, 0, 0);

  // Transport details table
  pdf.setLineWidth(0.3);
  const transportY = 103;

  // From/To section
  pdf.rect(10, transportY, (pageWidth - 20) / 2, 15);
  pdf.rect(10 + (pageWidth - 20) / 2, transportY, (pageWidth - 20) / 2, 15);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FROM:', 15, transportY + 5);
  pdf.text('TO:', 15 + (pageWidth - 20) / 2, transportY + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.text(loadingSlip.from_location, 15, transportY + 10);
  pdf.text(loadingSlip.to_location, 15 + (pageWidth - 20) / 2, transportY + 10);

  // Material and dimensions
  pdf.rect(10, transportY + 15, (pageWidth - 20) / 2, 12);
  pdf.rect(10 + (pageWidth - 20) / 2, transportY + 15, (pageWidth - 20) / 2, 12);

  pdf.setFont('helvetica', 'bold');
  pdf.text('MATERIAL:', 15, transportY + 22);
  pdf.text('DIMENSIONS:', 15 + (pageWidth - 20) / 2, transportY + 22);

  pdf.setFont('helvetica', 'normal');
  pdf.text('MACHINERY', 15, transportY + 27);
  pdf.text(loadingSlip.dimension || 'As per requirement', 15 + (pageWidth - 20) / 2, transportY + 27);

  // Financial Details Section - intense blue background
  pdf.setFillColor(25, 118, 210);
  pdf.rect(10, 135, pageWidth - 20, 8, 'F');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('FINANCIAL DETAILS', 15, 140);
  pdf.setTextColor(0, 0, 0);

  const financialY = 148;
  pdf.setLineWidth(0.3);

  // Financial table
  const financialRows = [
    ['Freight Amount:', formatCurrency(loadingSlip.freight)],
    ['Advance Amount:', formatCurrency(loadingSlip.advance)],
  ];

  if (loadingSlip.rto > 0) {
    financialRows.push(['RTO Amount:', formatCurrency(loadingSlip.rto)]);
  }

  financialRows.push(['Balance Amount:', formatCurrency(loadingSlip.total_freight - loadingSlip.advance)]);

  financialRows.forEach((row, index) => {
    const rowY = financialY + (index * 10);
    pdf.rect(10, rowY, pageWidth - 20, 10);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(row[0], 15, rowY + 6);
    pdf.text(row[1], pageWidth - 15, rowY + 6, { align: 'right' });
  });

  // Bank Details Section - intense blue background
  pdf.setFillColor(25, 118, 210);
  pdf.rect(10, 185, pageWidth - 20, 8, 'F');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('BANK DETAILS', 15, 190);
  pdf.setTextColor(0, 0, 0);

  const bankY = 198;
  const bankDetails = [
    ['Beneficiary Name:', COMPANY_INFO.name],
    ['Account No:', '231005501207'],
    ['IFSC Code:', 'ICIC0002310'],
    ['Branch:', 'GHODASAR, AHMEDABAD']
  ];

  bankDetails.forEach((detail, index) => {
    const rowY = bankY + (index * 8);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(detail[0], 15, rowY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(detail[1], 70, rowY);
  });

  // Terms and Conditions
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TERMS & CONDITIONS:', 15, 250);

  pdf.setFont('helvetica', 'normal');
  const terms = [
    '• We are not responsible for accident, leakage & breakage during transit',
    '• Loading/Unloading charges extra as applicable',
    '• Payment to be made within 15 days of delivery',
    '• Subject to Ahmedabad jurisdiction only',
    '• One day halting charges Rs.4000'
  ];

  terms.forEach((term, index) => {
    pdf.text(term, 15, 256 + (index * 4));
  });

  // Signature section
  pdf.setLineWidth(0.5);
  pdf.line(15, pageHeight - 35, 80, pageHeight - 35);
  pdf.line(pageWidth - 80, pageHeight - 35, pageWidth - 15, pageHeight - 35);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('CONSIGNOR SIGNATURE', 47, pageHeight - 30, { align: 'center' });
  pdf.text('AUTHORISED SIGNATORY', pageWidth - 47, pageHeight - 30, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.text(`FOR ${COMPANY_INFO.name}`, pageWidth - 47, pageHeight - 25, { align: 'center' });

  // Footer with system info
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('GENERATED FROM BHAVISHYA ROAD CARRIER SYSTEM', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF with specified filename format
  const filename = `LoadingSlip_${loadingSlip.slip_number}_${loadingSlip.party.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  pdf.save(filename);
};

// Generate Professional Bill PDF
export const generateBillPDF = async (bill: Bill, loadingSlip: LoadingSlip) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 15;
  const usableWidth = pageWidth - (2 * margin);

  // Header border
  pdf.setLineWidth(1);
  pdf.rect(margin, 10, usableWidth, 45);

  // Add logo if available
  if (COMPANY_LOGO_BASE64) {
    try {
      const logoDataUrl = await ensurePngDataUrl(COMPANY_LOGO_BASE64);
      pdf.addImage(logoDataUrl, 'PNG', margin + 5, 15, 25, 25);
    } catch (error) {
      console.warn('Logo could not be added to PDF:', error);
    }
  }

  // Company name and details
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 100, 0);
  pdf.text(COMPANY_INFO.name, pageWidth / 2, 25, { align: 'center' });

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(COMPANY_INFO.address, pageWidth / 2, 32, { align: 'center' });
  pdf.text(COMPANY_INFO.location, pageWidth / 2, 37, { align: 'center' });
  pdf.text(COMPANY_INFO.tagline, pageWidth / 2, 42, { align: 'center' });

  // Contact details in header
  pdf.setFontSize(8);
  pdf.text(COMPANY_INFO.phone, margin + 5, 50);
  pdf.text(COMPANY_INFO.pan, pageWidth - margin - 5, 50, { align: 'right' });

  // Bill details box
  pdf.setLineWidth(0.5);
  pdf.rect(pageWidth - 60, 15, 45, 25);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BILL NO.', pageWidth - 55, 22);
  pdf.text(bill.bill_number, pageWidth - 55, 28);
  pdf.text('BILL DATE:', pageWidth - 55, 34);
  pdf.text(formatDate(bill.date), pageWidth - 55, 40);

  // Party details
  let currentY = 65;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('M/S:', margin, currentY);
  pdf.text(bill.party.toUpperCase(), margin + 15, currentY);

  // Main table
  currentY += 15;
  const tableHeaders = [
    'SR NO', 'LOADING DATE', 'FROM', 'TO', 'VEHICLE NO',
    'WEIGHT', 'FREIGHT', 'RTO CHALLAN', 'DETENTION', 'EXTRA WEIGHT', 'ADVANCE', 'BALANCE'
  ];

  const colWidths = [15, 25, 30, 30, 25, 20, 25, 20, 20, 20, 25, 25];
  const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const startX = margin + (usableWidth - tableWidth) / 2;

  // Table header
  pdf.setFillColor(70, 130, 180);
  pdf.rect(startX, currentY, tableWidth, 10, 'F');
  pdf.setLineWidth(0.3);
  pdf.rect(startX, currentY, tableWidth, 10);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);

  let xPos = startX + 2;
  tableHeaders.forEach((header, index) => {
    pdf.text(header, xPos, currentY + 7);
    if (index < tableHeaders.length - 1) {
      pdf.line(xPos + colWidths[index] - 2, currentY, xPos + colWidths[index] - 2, currentY + 10);
    }
    xPos += colWidths[index];
  });

  // Table data rows
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  currentY += 10;
  
  const advance = Number(loadingSlip.advance) || 0;
  const freight = Number(loadingSlip.freight) || Number(bill.bill_amount) || 0;
  const balanceAmt = Math.max(freight - advance, 0);
  
  const rowData = [
    '1',
    formatDate(loadingSlip.date),
    loadingSlip.from_location || 'N/A',
    loadingSlip.to_location || 'N/A',
    loadingSlip.vehicle_no || 'N/A',
    `${loadingSlip.weight || 0}MT`,
    formatCurrency(freight).replace('Rs. ', ''),
    (loadingSlip.rto || 0).toString(),
    '0.00',
    '0.00',
    formatCurrency(advance).replace('Rs. ', ''),
    formatCurrency(balanceAmt).replace('Rs. ', '')
  ];

  // Draw 4 rows (1 with data, 3 empty)
  for (let row = 0; row < 4; row++) {
    const rowY = currentY + (row * 12);
    pdf.rect(startX, rowY, tableWidth, 12);
    
    // Draw vertical lines
    let lineX = startX;
    colWidths.forEach((width, index) => {
      if (index < colWidths.length - 1) {
        lineX += width;
        pdf.line(lineX, rowY, lineX, rowY + 12);
      }
    });
    
    // Add data for first row only
    if (row === 0) {
      let dataX = startX + 2;
      rowData.forEach((data, index) => {
        pdf.text(data, dataX, rowY + 8);
        dataX += colWidths[index];
      });
    }
  }

  // Total section
  currentY += 60;
  pdf.setLineWidth(0.5);
  pdf.rect(startX, currentY, tableWidth, 15);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL', startX + 5, currentY + 10);
  
  // Deductions on right side
  const deductionsX = startX + tableWidth - 80;
  pdf.setFontSize(10);
  pdf.text('Less: TDS', deductionsX, currentY + 5);
  pdf.text(formatCurrency(bill.tds || 0), deductionsX + 40, currentY + 5, { align: 'right' });
  pdf.text('Less: Mamool', deductionsX, currentY + 10);
  pdf.text(formatCurrency(bill.mamool || 0), deductionsX + 40, currentY + 10, { align: 'right' });
  
  // Net amount
  pdf.setFont('helvetica', 'bold');
  pdf.text('NET AMOUNT:', deductionsX, currentY + 15);
  pdf.text(formatCurrency(bill.net_amount), deductionsX + 40, currentY + 15, { align: 'right' });

  // Bank details section
  currentY += 20;
  pdf.setLineWidth(0.5);
  pdf.rect(margin, currentY, usableWidth, 50);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BANK DETAILS', margin + 5, currentY + 10);
  pdf.text('FOR: BHAVISHYA ROAD CARRIERS', pageWidth - margin - 5, currentY + 10, { align: 'right' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('BENEFICIARY NAME: BHAVISHYA ROAD CARRIERS', margin + 5, currentY + 20);
  pdf.text('ACCOUNT NO: 23109501207', margin + 5, currentY + 27);
  pdf.text('IFSC CODE: ICIC0002310', margin + 5, currentY + 34);
  pdf.text('BRANCH: CHANDKHEDA, AHMEDABAD', margin + 5, currentY + 41);
  
  // Signature section
  pdf.setFont('helvetica', 'bold');
  pdf.text('AUTHORIZED SIGNATORY', pageWidth - margin - 5, currentY + 45, { align: 'right' });

  // Footer with system info
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('GENERATED FROM BHAVISHYA ROAD CARRIER SYSTEM', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF with specified filename format
  const filename = `Bill_${bill.bill_number}_${bill.party.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  pdf.save(filename);
};

// Generate PDF from HTML element (alternative method)
export const generatePDFFromHTML = async (elementId: string, filename: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }
  
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true
  });
  
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210;
  const pageHeight = 295;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  
  let position = 0;
  
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  
  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  
  pdf.save(filename);
};
