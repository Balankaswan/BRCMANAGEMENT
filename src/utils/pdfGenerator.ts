import jsPDF from 'jspdf';
import { COMPANY_LOGO_BASE64 } from '../assets/logo';
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
export const generateMemoPDF = async (memo: Memo, loadingSlip: LoadingSlip, bankingEntries?: any[]): Promise<void> => {
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

  // Document title with blue background - matching the image style
  pdf.setFillColor(52, 144, 220); // Exact blue color from image
  pdf.rect(10, 50, pageWidth - 20, 12, 'F');
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('MEMO', pageWidth / 2, 58, { align: 'center' });
  pdf.setTextColor(0, 0, 0);

  // Document details box - matching image layout
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.setTextColor(0, 0, 0);
  pdf.rect(10, 67, pageWidth - 20, 15);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Memo No: ${memo.memo_number}`, 15, 72);
  pdf.text(`Date: ${formatDate(memo.date)}`, pageWidth - 15, 72, { align: 'right' });
  pdf.text(`Supplier: ${memo.supplier}`, 15, 78);
  pdf.text(`Vehicle No: ${loadingSlip.vehicle_no}`, pageWidth - 15, 78, { align: 'right' });

  // Transport Details Section with blue background - matching image
  pdf.setFillColor(52, 144, 220);
  pdf.rect(10, 87, pageWidth - 20, 8, 'F');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('TRANSPORT DETAILS', 15, 93);
  pdf.setTextColor(0, 0, 0);

  // Transport details table - matching image layout
  pdf.setLineWidth(0.5);
  const transportY = 100;

  // From/To section with proper borders
  pdf.rect(10, transportY, (pageWidth - 20) / 2, 12);
  pdf.rect(10 + (pageWidth - 20) / 2, transportY, (pageWidth - 20) / 2, 12);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FROM:', 15, transportY + 4);
  pdf.text('TO:', 15 + (pageWidth - 20) / 2, transportY + 4);

  pdf.setFont('helvetica', 'normal');
  pdf.text(loadingSlip.from_location, 15, transportY + 8);
  pdf.text(loadingSlip.to_location, 15 + (pageWidth - 20) / 2, transportY + 8);

  // Material and weight section
  pdf.rect(10, transportY + 12, (pageWidth - 20) / 2, 10);
  pdf.rect(10 + (pageWidth - 20) / 2, transportY + 12, (pageWidth - 20) / 2, 10);

  pdf.setFont('helvetica', 'bold');
  pdf.text('MATERIAL:', 15, transportY + 17);
  pdf.text('WEIGHT:', 15 + (pageWidth - 20) / 2, transportY + 17);

  pdf.setFont('helvetica', 'normal');
  pdf.text(loadingSlip.material || 'MACHINERY', 15, transportY + 21);
  pdf.text(`${loadingSlip.weight} MT`, 15 + (pageWidth - 20) / 2, transportY + 21);

  // Financial Breakdown Section with blue background - matching image
  pdf.setFillColor(52, 144, 220);
  pdf.rect(10, 127, pageWidth - 20, 8, 'F');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('FINANCIAL BREAKDOWN', 15, 133);
  pdf.setTextColor(0, 0, 0);

  const financialY = 140;
  pdf.setLineWidth(0.5);

  // Calculate total advances from banking entries (actual advances paid)
  const totalAdvances = bankingEntries 
    ? bankingEntries.filter(e => (e.category === 'memo_advance' || e.category === 'memo_payment') && e.reference_id === memo.memo_number)
        .reduce((sum, e) => sum + e.amount, 0)
    : memo.advance_payments?.reduce((sum, adv) => sum + adv.amount, 0) || 0;

  // Financial table - matching image style with proper borders
  const financialRows = [
    ['Freight Amount:', formatCurrency(memo.freight)],
    ['Add: Detention:', formatCurrency(memo.detention || 0)],
    ['Add: Extra Weight:', formatCurrency(memo.extra || 0)],
    ['Add: RTO:', formatCurrency(memo.rto || 0)],
    ['Less: Commission:', formatCurrency(memo.commission || 0)],
    ['Less: Mamool:', formatCurrency(memo.mamool || 0)],
    ['Less: Advance Paid:', formatCurrency(totalAdvances)]
  ];

  financialRows.forEach((row, index) => {
    const rowY = financialY + (index * 7);
    pdf.rect(10, rowY, pageWidth - 20, 7);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(row[0], 15, rowY + 5);
    pdf.text(row[1], pageWidth - 15, rowY + 5, { align: 'right' });
  });

  // Net Amount Payable with blue background - matching image
  const netAmountY = financialY + (financialRows.length * 7);
  pdf.setFillColor(52, 144, 220);
  pdf.rect(10, netAmountY, pageWidth - 20, 8, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('NET AMOUNT PAYABLE:', 15, netAmountY + 5);
  const actualNetAmount = memo.net_amount - totalAdvances;
  pdf.text(formatCurrency(actualNetAmount), pageWidth - 15, netAmountY + 5, { align: 'right' });
  pdf.setTextColor(0, 0, 0);

  // Advance Details Section with blue background
  const advanceY = netAmountY + 15;
  pdf.setFillColor(25, 118, 210);
  pdf.rect(10, advanceY - 5, pageWidth - 20, 8, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('ADVANCE DETAILS', 15, advanceY);
  pdf.setTextColor(0, 0, 0);
  
  let currentAdvanceY = advanceY;
  
  // Get actual advance payments from banking entries
  const actualAdvancePayments = bankingEntries 
    ? bankingEntries.filter(e => 
        (e.category === 'memo_advance' || e.category === 'memo_payment') && 
        e.reference_id === memo.memo_number
      )
    : [];
  
  if (actualAdvancePayments && actualAdvancePayments.length > 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    actualAdvancePayments.forEach((payment, index) => {
      currentAdvanceY += 6;
      const paymentMode = payment.mode || (payment.category === 'memo_advance' ? 'CASH' : 'BANK');
      pdf.text(`${index + 1}. Date: ${formatDate(payment.date)} - Amount: ${formatCurrency(payment.amount)} - Mode: ${paymentMode.toUpperCase()}`, 15, currentAdvanceY);
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

// Generate Loading Slip PDF - Exact format matching the professional template
export const generateLoadingSlipPDF = async (loadingSlip: LoadingSlip): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Main border around entire document
  pdf.setLineWidth(1.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(10, 10, pageWidth - 20, pageHeight - 30);

  // Add logo with exact positioning as in image
  try {
    const logoPng = await ensurePngDataUrl(COMPANY_LOGO_BASE64);
    pdf.addImage(logoPng, 'PNG', 15, 15, 30, 30); // Larger logo on left
  } catch (error) {
    console.warn('Could not add logo to PDF:', error);
  }

  // Company Header - Exact layout matching image
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(52, 144, 220); // Exact blue color from image
  pdf.text(COMPANY_INFO.name, pageWidth / 2, 25, { align: 'center' });

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(COMPANY_INFO.address, pageWidth / 2, 32, { align: 'center' });
  pdf.text(COMPANY_INFO.address2, pageWidth / 2, 37, { align: 'center' });
  pdf.text(COMPANY_INFO.location, pageWidth / 2, 42, { align: 'center' });

  // Contact details in header - exact positioning
  pdf.setFontSize(8);
  pdf.text(COMPANY_INFO.phone, 15, 52);
  pdf.text(COMPANY_INFO.tagline, pageWidth / 2, 52, { align: 'center' });
  pdf.text(COMPANY_INFO.pan, pageWidth - 15, 52, { align: 'right' });

  // LOADING SLIP title with blue background - exact match
  pdf.setFillColor(52, 144, 220);
  pdf.rect(10, 60, pageWidth - 20, 12, 'F');
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('LOADING SLIP', pageWidth / 2, 69, { align: 'center' });

  // Loading slip details box - exact layout
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.setTextColor(0, 0, 0);
  pdf.rect(10, 77, pageWidth - 20, 15);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Loading Slip No: ${loadingSlip.slip_number}`, 15, 83);
  pdf.text(`Date: ${formatDate(loadingSlip.date)}`, pageWidth - 15, 83, { align: 'right' });
  pdf.text(`Vehicle No: ${loadingSlip.vehicle_no}`, 15, 88);
  pdf.text(`Weight: ${loadingSlip.weight} MT`, pageWidth - 15, 88, { align: 'right' });

  // Party section with blue background - exact match
  pdf.setFillColor(52, 144, 220);
  pdf.rect(10, 97, pageWidth - 20, 10, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(`Party: ${loadingSlip.party}`, pageWidth / 2, 104, { align: 'center' });

  // From/To section with proper table layout - exact match
  const transportY = 112;
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.setTextColor(0, 0, 0);
  
  // Draw table borders
  pdf.rect(10, transportY, (pageWidth - 20) / 2, 15);
  pdf.rect(10 + (pageWidth - 20) / 2, transportY, (pageWidth - 20) / 2, 15);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FROM:', 15, transportY + 6);
  pdf.text('TO:', 15 + (pageWidth - 20) / 2, transportY + 6);

  pdf.setFont('helvetica', 'normal');
  pdf.text(loadingSlip.from_location, 15, transportY + 11);
  pdf.text(loadingSlip.to_location, 15 + (pageWidth - 20) / 2, transportY + 11);

  // Material and Dimensions section - exact match
  const materialY = transportY + 15;
  pdf.rect(10, materialY, (pageWidth - 20) / 2, 12);
  pdf.rect(10 + (pageWidth - 20) / 2, materialY, (pageWidth - 20) / 2, 12);

  pdf.setFont('helvetica', 'bold');
  pdf.text('MATERIAL:', 15, materialY + 5);
  pdf.text('DIMENSIONS:', 15 + (pageWidth - 20) / 2, materialY + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.text(loadingSlip.material || 'MACHINERY', 15, materialY + 9);
  pdf.text(loadingSlip.dimension || 'JUMBO/LZ', 15 + (pageWidth - 20) / 2, materialY + 9);

  // FINANCIAL DETAILS section with blue background - exact match
  const financialY = materialY + 17;
  pdf.setFillColor(52, 144, 220);
  pdf.rect(10, financialY, pageWidth - 20, 10, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('FINANCIAL DETAILS', pageWidth / 2, financialY + 7, { align: 'center' });

  // Financial table - exact layout matching image
  const financeTableY = financialY + 15;
  const rowHeight = 7;
  
  // Calculate balance using correct formula: BALANCE = FREIGHT - ADVANCE + RTO
  const calculatedBalance = (loadingSlip.freight || 0) - (loadingSlip.advance || 0) + (loadingSlip.rto || 0);
  
  const financialData = [
    ['Freight Amount:', formatCurrency(loadingSlip.freight)],
    ['Advance Amount:', formatCurrency(loadingSlip.advance)],
    ['RTO Amount:', formatCurrency(loadingSlip.rto)],
    ['Balance Amount:', formatCurrency(calculatedBalance)]
  ];

  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  
  financialData.forEach((row, index) => {
    const rowY = financeTableY + (index * rowHeight);
    
    // Draw full width row
    pdf.setLineWidth(0.5);
    pdf.rect(10, rowY, pageWidth - 20, rowHeight);
    
    // Add text
    pdf.setFont('helvetica', 'normal');
    pdf.text(row[0], 15, rowY + 5);
    pdf.text(row[1], pageWidth - 15, rowY + 5, { align: 'right' });
  });

  // BANK DETAILS section with blue background - exact match
  const bankY = financeTableY + (financialData.length * rowHeight) + 10;
  pdf.setFillColor(52, 144, 220);
  pdf.rect(10, bankY, pageWidth - 20, 10, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('BANK DETAILS', pageWidth / 2, bankY + 7, { align: 'center' });

  // Bank details - exact layout
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  
  const bankDetailsY = bankY + 15;
  pdf.text('Beneficiary Name:', 15, bankDetailsY);
  pdf.setFont('helvetica', 'normal');
  pdf.text('BHAVISHYA ROAD CARRIERS', 80, bankDetailsY);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Account No:', 15, bankDetailsY + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.text('231005501207', 80, bankDetailsY + 6);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('IFSC Code:', 15, bankDetailsY + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('ICIC0002310', 80, bankDetailsY + 12);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Branch:', 15, bankDetailsY + 18);
  pdf.setFont('helvetica', 'normal');
  pdf.text('GHODASAR, AHMEDABAD', 80, bankDetailsY + 18);

  // Terms and Conditions - exact positioning
  const termsY = bankDetailsY + 30;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TERMS & CONDITIONS:', 15, termsY);

  pdf.setFont('helvetica', 'normal');
  const terms = [
    '• We are not responsible for accident, leakage & breakage during transit',
    '• Loading/Unloading charges extra as applicable',
    '• Payment to be made within 15 days of delivery',
    '• Subject: AHMEDABAD JURISDICTION',
    '• One day halting charges Rs.4000'
  ];

  terms.forEach((term, index) => {
    pdf.text(term, 15, termsY + 5 + (index * 4));
  });

  // Signature section - only authorized signatory
  const signatureY = Math.min(termsY + 25, pageHeight - 50); // Ensure enough space from bottom
  pdf.setLineWidth(0.5);
  
  // Single signature line for authorized signatory only
  pdf.line(pageWidth - 85, signatureY, pageWidth - 15, signatureY);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('AUTHORISED SIGNATORY', pageWidth - 50, signatureY + 5, { align: 'center' });
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('FOR BHAVISHYA ROAD CARRIERS', pageWidth - 50, signatureY + 10, { align: 'center' });

  // Footer - positioned to avoid collision with signature
  const footerY = Math.max(signatureY + 20, pageHeight - 25);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('GENERATED FROM BHAVISHYA ROAD CARRIER SYSTEM', pageWidth / 2, footerY, { align: 'center' });

  // Save the PDF
  const filename = `LoadingSlip_${loadingSlip.slip_number}_${loadingSlip.party.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  pdf.save(filename);
};

// Generate Professional Bill PDF - Exact format matching user's requirement
export const generateBillPDF = async (bill: Bill, loadingSlip: LoadingSlip) => {
  const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;

  // Header with date and bill number
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${new Date(bill.date).toLocaleDateString('en-GB')}, ${new Date(bill.date).toLocaleTimeString('en-GB', { hour12: false })}`, margin, 15);
  pdf.text(`Bill - ${bill.bill_number}`, pageWidth - margin, 15, { align: 'right' });

  // Company header box
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(margin, 25, pageWidth - (2 * margin), 45);

  // Logo
  try {
    const logoPng = await ensurePngDataUrl(COMPANY_LOGO_BASE64);
    pdf.addImage(logoPng, 'PNG', margin + 5, 30, 20, 20);
  } catch (error) {
    console.warn('Could not add logo to PDF:', error);
  }

  // Company name and details
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 102, 204);
  pdf.text('BHAVISHYA ROAD CARRIERS', pageWidth / 2, 35, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Specialist in Heavy ODC, Hydraulic, Low Bed Trailer, Flat Bed Trailer Transport & Commission Agent', pageWidth / 2, 42, { align: 'center' });
  pdf.text('FLEET OWNERS, TRANSPORT CONTRACTORS & COMMISSION AGENTS', pageWidth / 2, 47, { align: 'center' });
  pdf.text('404, Parijaat Business Center, Nr. SP Ring Road, Aslali, Ahmedabad - 382405', pageWidth / 2, 52, { align: 'center' });
  pdf.text('(SUBJECT TO AHMEDABAD JURISDICTION)', pageWidth / 2, 57, { align: 'center' });

  // MOB and PAN section
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`MOB:9824026576, 9824900776`, margin, 65);
  pdf.text(`PAN NO: BNDPK7173D`, pageWidth - margin, 65, { align: 'right' });

  // Party details
  pdf.text(`M/S: ${bill.party.toUpperCase()}`, margin, 75);
  pdf.text(`BILL NO: ${bill.bill_number}`, pageWidth - margin, 75, { align: 'right' });
  pdf.text(`BILL DATE: ${new Date(bill.date).toLocaleDateString('en-GB')}`, pageWidth - margin, 82, { align: 'right' });

  // Table setup
  const tableY = 95;
  const rowHeight = 12;
  const colWidths = [15, 23, 24, 24, 22, 13, 22, 22, 22, 20, 22, 20]; // Total = 257mm
  let colX = [margin];
  for (let i = 1; i < colWidths.length; i++) {
    colX[i] = colX[i-1] + colWidths[i-1];
  }

  const headers = ['CN NO', 'LOADING DT', 'FROM', 'TO', 'TRAILOR NO', 'WT', 'FREIGHT', 'RTO', 'DETENTION', 'EXTRA','ADVANCE', 'BALANCE'];

  // Draw table header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, tableY, pageWidth - (2 * margin), rowHeight, 'F');
  pdf.setLineWidth(0.3);
  pdf.rect(margin, tableY, pageWidth - (2 * margin), rowHeight);

  // Header text
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  headers.forEach((header, index) => {
    if (index < colX.length) {
      pdf.text(header, colX[index] + 2, tableY + 8);
      // Vertical lines
      if (index > 0) {
        pdf.line(colX[index], tableY, colX[index], tableY + rowHeight);
      }
    }
  });

  // Table data row
  const dataY = tableY + rowHeight;
  pdf.rect(margin, dataY, pageWidth - (2 * margin), rowHeight);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  
  // Data from loading slip and bill
  const totalAdvance = bill.advance_payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const detention = bill.detention || 0;
  const extra = bill.extra || 0;  
  const rto = bill.rto || 0;
  // BALANCE = TOTAL FREIGHT - ADVANCE - MAMOOL - PENALTIES - TDS (excluding party commission cut from display)
  const totalFreight = bill.totalFreight || (bill.bill_amount + detention + extra + rto);
  const balance = totalFreight - totalAdvance - (bill.mamool || 0) - (bill.penalties || 0) - (bill.tds || 0);
  
  const rowData = [
    loadingSlip.slip_number || bill.bill_number,
    new Date(loadingSlip.date || bill.date).toLocaleDateString('en-GB'),
    (loadingSlip.from_location || 'N/A').substring(0, 8),
    (loadingSlip.to_location || 'N/A').substring(0, 8),
    loadingSlip.vehicle_no || 'N/A',
    `${loadingSlip.weight || 0}MT`,
    formatCurrency(totalFreight).replace('Rs. ', ''),
    formatCurrency(rto).replace('Rs. ', ''),
    formatCurrency(detention).replace('Rs. ', ''),
    formatCurrency(extra).replace('Rs. ', ''),
    formatCurrency(totalAdvance).replace('Rs. ', ''),
    formatCurrency(balance).replace('Rs. ', '')
  ];

  rowData.forEach((data, index) => {
    if (index < colX.length) {
      pdf.text(data, colX[index] + 2, dataY + 8);
      // Vertical lines
      if (index > 0) {
        pdf.line(colX[index], dataY, colX[index], dataY + rowHeight);
      }
    }
  });

  // Total row
  const totalY = dataY + rowHeight;
  pdf.rect(margin, totalY, pageWidth - (2 * margin), rowHeight);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL', margin + 5, totalY + 8);
  pdf.text(formatCurrency(totalFreight).replace('Rs. ', ''), colX[6] + 2, totalY + 8);
  pdf.text(formatCurrency(totalAdvance).replace('Rs. ', ''), colX[10] + 2, totalY + 8);
  pdf.text(formatCurrency(balance).replace('Rs. ', ''), colX[11] + 2, totalY + 8);

  // Vertical lines for total row
  colX.forEach((x, index) => {
    if (index > 0) {
      pdf.line(x, totalY, x, totalY + rowHeight);
    }
  });

  // Advance Details Section (if any advances exist)
  let advanceY = totalY + 15;
  if (bill.advance_payments && bill.advance_payments.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('ADVANCE DETAILS:', margin, advanceY);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    bill.advance_payments.forEach((payment, index) => {
      advanceY += 8;
      pdf.text(`${index + 1}. Date: ${new Date(payment.date).toLocaleDateString('en-GB')} - Amount: ${formatCurrency(payment.amount)} - Mode: ${payment.mode?.toUpperCase() || 'CASH'}`, margin, advanceY);
    });
    advanceY += 10;
  }

  // Combined Bank Details and Signature section (full width)
  const bankY = advanceY > 0 ? advanceY + 5 : totalY + 20;
  const boxHeight = 35;
  pdf.rect(margin, bankY, pageWidth - (2 * margin), boxHeight);
  
  // No divider line - remove the vertical separator

  // Left side - Bank Details
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('BANK DETAILS', margin + 5, bankY + 6);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('BENEFICIARY NAME: BHAVISHYA ROAD CARRIERS', margin + 5, bankY + 12);
  pdf.text('ACCOUNT NO: 231005501207', margin + 5, bankY + 18);
  pdf.text('IFSC CODE: ICIC0002310', margin + 5, bankY + 24);
  pdf.text('BRANCH NAME: GHODASAR, AHMEDABAD', margin + 5, bankY + 30);

  // Right side - Signature
  const sigX = pageWidth - 80;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('FOR, BHAVISHYA ROAD CARRIERS', sigX, bankY + 20);
  pdf.text('AUTHORISED SIGNATORY', sigX, bankY + 30);

  // Add POD image if available
  if (bill.pod_image) {
    // Add second page with full POD image
    pdf.addPage();
    
    // Header for POD page
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 102, 204);
    pdf.text('PROOF OF DELIVERY (POD)', pageWidth / 2, 30, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Bill No: ${bill.bill_number}`, margin, 45);
    pdf.text(`Party: ${bill.party}`, margin, 55);
    pdf.text(`Vehicle: ${loadingSlip.vehicle_no}`, margin, 65);
    pdf.text(`Route: ${loadingSlip.from_location} → ${loadingSlip.to_location}`, margin, 75);
    
    // Full size POD image
    try {
      const podFullWidth = pageWidth - (2 * margin);
      const podFullHeight = pageHeight - 120;
      pdf.addImage(bill.pod_image, 'JPEG', margin, 85, podFullWidth, podFullHeight);
    } catch (error) {
      console.warn('Could not add POD image to second page:', error);
      pdf.setFontSize(10);
      pdf.text('POD image could not be displayed', pageWidth / 2, pageHeight / 2, { align: 'center' });
    }
  }

  // Footer
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(128, 128, 128);
  pdf.text('GENERATED BY BHAVISHYA ROAD CARRIERS SYSTEM', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF
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

// Generate Party Commission Ledger PDF
export const generatePartyCommissionLedgerPDF = async (entries: any[], summary: any, filters: any, selectedParty?: any): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Add logo
  try {
    const logoPng = await ensurePngDataUrl(COMPANY_LOGO_BASE64);
    pdf.addImage(logoPng, 'PNG', 15, 8, 25, 25);
  } catch (error) {
    console.warn('Could not add logo to PDF:', error);
  }

  // Company Header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(25, 118, 210);
  pdf.text(COMPANY_INFO.name, pageWidth / 2, 15, { align: 'center' });

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(COMPANY_INFO.address, pageWidth / 2, 21, { align: 'center' });
  pdf.text(COMPANY_INFO.location, pageWidth / 2, 25, { align: 'center' });

  // Header border
  pdf.setLineWidth(1);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(10, 5, pageWidth - 20, 25);

  // Document title
  pdf.setFillColor(52, 144, 220);
  pdf.rect(10, 35, pageWidth - 20, 12, 'F');
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  const title = selectedParty ? `PARTY COMMISSION LEDGER - ${selectedParty.party_name.toUpperCase()}` : 'PARTY COMMISSION LEDGER';
  pdf.text(title, pageWidth / 2, 43, { align: 'center' });
  pdf.setTextColor(0, 0, 0);

  // Date range and filters
  let currentY = 52;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  if (filters.date_from || filters.date_to) {
    const dateRange = `Period: ${filters.date_from ? formatDate(filters.date_from) : 'Start'} to ${filters.date_to ? formatDate(filters.date_to) : 'End'}`;
    pdf.text(dateRange, 15, currentY);
    currentY += 5;
  }
  if (filters.bill_number) {
    pdf.text(`Bill Filter: ${filters.bill_number}`, 15, currentY);
    currentY += 5;
  }

  // Summary section
  currentY += 5;
  pdf.setFillColor(240, 240, 240);
  pdf.rect(10, currentY, pageWidth - 20, 20, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SUMMARY', 15, currentY + 6);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Total Credits: ${formatCurrency(summary.totalCredits)}`, 15, currentY + 12);
  pdf.text(`Total Debits: ${formatCurrency(summary.totalDebits)}`, 15, currentY + 16);
  pdf.text(`Outstanding Balance: ${formatCurrency(summary.balance)}`, pageWidth - 15, currentY + 12, { align: 'right' });
  pdf.text(`Total Entries: ${summary.totalEntries}`, pageWidth - 15, currentY + 16, { align: 'right' });

  // Table header
  currentY += 25;
  const tableHeaders = ['Date', 'Bill No/Ref', 'Narration', 'Credit', 'Debit', 'Balance'];
  const colWidths = [25, 30, 70, 25, 25, 25];
  let colX = [15];
  for (let i = 1; i < colWidths.length; i++) {
    colX[i] = colX[i-1] + colWidths[i-1];
  }

  pdf.setFillColor(52, 144, 220);
  pdf.rect(10, currentY, pageWidth - 20, 8, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  
  tableHeaders.forEach((header, index) => {
    const align = index >= 3 ? 'right' : 'left';
    const x = align === 'right' ? colX[index] + colWidths[index] - 2 : colX[index] + 2;
    pdf.text(header, x, currentY + 5, { align });
  });

  // Table data
  currentY += 8;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);

  entries.forEach((entry, index) => {
    if (currentY > pageHeight - 30) {
      pdf.addPage();
      currentY = 20;
    }

    const rowData = [
      new Date(entry.date).toLocaleDateString('en-GB'),
      entry.bill_number || entry.reference_id || '',
      entry.narration.length > 35 ? entry.narration.substring(0, 32) + '...' : entry.narration,
      entry.entry_type === 'credit' ? formatCurrency(entry.amount) : '-',
      entry.entry_type === 'debit' ? formatCurrency(entry.amount) : '-',
      formatCurrency(entry.running_balance)
    ];

    // Alternate row colors
    if (index % 2 === 0) {
      pdf.setFillColor(248, 248, 248);
      pdf.rect(10, currentY, pageWidth - 20, 6, 'F');
    }

    rowData.forEach((data, colIndex) => {
      const align = colIndex >= 3 ? 'right' : 'left';
      const x = align === 'right' ? colX[colIndex] + colWidths[colIndex] - 2 : colX[colIndex] + 2;
      pdf.text(data, x, currentY + 4, { align });
    });

    currentY += 6;
  });

  // Footer
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('GENERATED FROM BHAVISHYA ROAD CARRIER SYSTEM', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF
  const partyName = selectedParty ? selectedParty.party_name.replace(/[^a-zA-Z0-9]/g, '_') : 'All_Parties';
  const filename = `Party_Commission_Ledger_${partyName}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};
