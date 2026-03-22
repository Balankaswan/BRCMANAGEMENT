import jsPDF from 'jspdf';
import { COMPANY_LOGO_BASE64 } from '../assets/logo';
import type { LoadingSlip, Memo, Bill } from '../types';

// Signature base64 - Add your actual signature image here
const SIGNATURE_BASE64: string = ''; // Empty until you add your actual signature base64

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

// Utility function to format currency for PDFs
export const formatCurrencyForPDF = (amount: number): string => {
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
export const generateMemoPDF = async (memo: Memo, loadingSlip: LoadingSlip, bankingEntries?: any[], cashbookEntries?: any[]): Promise<void> => {
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

  // Calculate total advances from banking and cashbook entries (actual advances paid)
  const bankingAdvances = bankingEntries
    ? bankingEntries.filter(e => (e.category === 'memo_advance' || e.category === 'memo_payment') && e.reference_id === memo.memo_number)
      .reduce((sum, e) => sum + e.amount, 0)
    : 0;

  const cashbookAdvances = cashbookEntries
    ? cashbookEntries.filter(e => (e.category === 'memo_advance' || e.category === 'memo_payment') && e.reference_id === memo.memo_number)
      .reduce((sum, e) => sum + e.amount, 0)
    : 0;

  const totalAdvances = bankingAdvances + cashbookAdvances + (memo.advance_payments?.reduce((sum, adv) => sum + adv.amount, 0) || 0);

  // Financial table - matching image style with proper borders
  const financialRows = [
    ['Freight Amount:', formatCurrencyForPDF(memo.freight)],
    ['Add: Detention:', formatCurrencyForPDF(memo.detention || 0)],
    ['Add: Extra Weight:', formatCurrencyForPDF(memo.extra || 0)],
    ['Add: RTO:', formatCurrencyForPDF(memo.rto || 0)],
    ['Less: Commission:', formatCurrencyForPDF(memo.commission || 0)],
    ['Less: Mamool:', formatCurrencyForPDF(memo.mamool || 0)],
    ['Less: Advance Paid:', formatCurrencyForPDF(totalAdvances)]
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
  pdf.text(formatCurrencyForPDF(actualNetAmount), pageWidth - 15, netAmountY + 5, { align: 'right' });
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

  // Get actual advance payments from both banking and cashbook entries
  const bankingAdvancePayments = bankingEntries
    ? bankingEntries.filter(e =>
      (e.category === 'memo_advance' || e.category === 'memo_payment') &&
      e.reference_id === memo.memo_number
    ).map(e => ({ ...e, source: 'BANK' }))
    : [];

  const cashbookAdvancePayments = cashbookEntries
    ? cashbookEntries.filter(e =>
      (e.category === 'memo_advance' || e.category === 'memo_payment') &&
      e.reference_id === memo.memo_number
    ).map(e => ({ ...e, source: 'CASH' }))
    : [];

  const memoAdvancePayments = memo.advance_payments?.map(a => ({
    ...a,
    source: a.description || 'FUEL'
  })) || [];

  const allAdvancePayments = [...bankingAdvancePayments, ...cashbookAdvancePayments, ...memoAdvancePayments]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Display advance payments if any exist
  if (allAdvancePayments.length > 0) {
    pdf.setFontSize(8);
    allAdvancePayments.forEach((payment, index) => {
      currentAdvanceY += 6;
      const paymentMode = payment.source || payment.mode || 'CASH';
      pdf.text(`${index + 1}. Date: ${formatDate(payment.date)} - Amount: ${formatCurrencyForPDF(payment.amount)} - Mode: ${paymentMode.toUpperCase()}`, 15, currentAdvanceY);
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

  // LOADING SLIP title with blue background and white text
  pdf.setFillColor(52, 144, 220); // Blue background
  pdf.rect(10, 60, pageWidth - 20, 12, 'F');
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(10, 60, pageWidth - 20, 12); // Add border
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255); // White text
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

  // M/S section with darker gray background - left aligned
  pdf.setFillColor(200, 200, 200); // Darker gray
  pdf.rect(10, 97, pageWidth - 20, 10, 'F');
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(10, 97, pageWidth - 20, 10); // Add border
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal'); // Unbold
  pdf.setTextColor(0, 0, 0);
  pdf.text(`M/S: ${loadingSlip.party}`, 15, 104);

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

  // FINANCIAL DETAILS section with darker gray background - left aligned
  const financialY = materialY + 17;
  pdf.setFillColor(200, 200, 200); // Darker gray
  pdf.rect(10, financialY, pageWidth - 20, 10, 'F');
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(10, financialY, pageWidth - 20, 10); // Add border
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal'); // Unbold
  pdf.setTextColor(0, 0, 0);
  pdf.text('FINANCIAL DETAILS', 15, financialY + 7);

  // Financial table - exact layout matching image
  const financeTableY = financialY + 15;
  const rowHeight = 7;

  // Calculate balance using correct formula: BALANCE = FREIGHT - ADVANCE + RTO
  const calculatedBalance = (loadingSlip.freight || 0) - (loadingSlip.advance || 0) + (loadingSlip.rto || 0);

  const financialData = [
    ['Freight Amount:', formatCurrencyForPDF(loadingSlip.freight)],
    ['Advance Amount:', formatCurrencyForPDF(loadingSlip.advance)],
    ['RTO Amount:', formatCurrencyForPDF(loadingSlip.rto)],
    ['Balance Amount:', formatCurrencyForPDF(calculatedBalance)]
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

  // BANK DETAILS section with darker gray background - left aligned
  const bankY = financeTableY + (financialData.length * rowHeight) + 10;
  pdf.setFillColor(200, 200, 200); // Darker gray
  pdf.rect(10, bankY, pageWidth - 20, 10, 'F');
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(10, bankY, pageWidth - 20, 10); // Add border
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal'); // Unbold
  pdf.setTextColor(0, 0, 0);
  pdf.text('BANK DETAILS', 15, bankY + 7);

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

// Generate Professional Bill PDF - Redesigned for visual clarity and professionalism
export const generateBillPDF = async (bill: Bill, loadingSlip: LoadingSlip, bankingEntries?: any[], cashbookEntries?: any[]) => {
  const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
  const pageWidth = pdf.internal.pageSize.getWidth();   // ~297mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // ~210mm
  const margin = 12;
  const contentWidth = pageWidth - (2 * margin);

  // ─────────────────────────────────────────────
  // TOP: Date / time above the header (top-left)
  // ─────────────────────────────────────────────
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  const billDateTime = new Date(bill.date);
  pdf.text(
    `${billDateTime.toLocaleDateString('en-GB')}, ${billDateTime.toLocaleTimeString('en-GB', { hour12: false })}`,
    margin, 9
  );

  // ─────────────────────────────────────────────
  // HEADER: Logo | Company centre | Bill meta right
  // Single thin outer border only
  // ─────────────────────────────────────────────
  const headerY = 12;
  const headerH = 40;
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(180, 180, 180);
  pdf.rect(margin, headerY, contentWidth, headerH);

  // Logo (left)
  try {
    const logoPng = await ensurePngDataUrl(COMPANY_LOGO_BASE64);
    pdf.addImage(logoPng, 'PNG', margin + 7, headerY + 4, 26, 26);
  } catch (error) {
    console.warn('Could not add logo to PDF:', error);
  }

  // Company name — centred
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 70, 160);
  pdf.text('BHAVISHYA ROAD CARRIERS', pageWidth / 2, headerY + 13, { align: 'center' });

  // Tagline line
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  pdf.text('Fleet Owners  •  Transport Contractors  •  Commission Agents', pageWidth / 2, headerY + 20, { align: 'center' });
  pdf.text('404, Parijaat Business Center, Nr. SP Ring Road, Aslali, Ahmedabad - 382405', pageWidth / 2, headerY + 26, { align: 'center' });

  // Thin divider below company lines
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(180, 180, 180);
  pdf.line(margin + 1, headerY + 30, margin + contentWidth - 1, headerY + 30);

  // MOB left  |  Jurisdiction centre  (NO PAN here — PAN is in the meta box only)
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(40, 40, 40);
  pdf.text('MOB: 9824026576, 9824900776', margin + 5, headerY + 36);
  pdf.text('SUBJECT TO AHMEDABAD JURISDICTION', pageWidth / 2, headerY + 36, { align: 'center' });
  pdf.text('PAN NO: BNDPK7173D', pageWidth - margin - 5, headerY + 36, { align: 'right' });

  // Right meta box — Bill No / Bill Date (thin bordered grid)
  const metaBoxX = pageWidth - margin - 62;
  const metaBoxW = 60;
  const metaBoxY = headerY + 2;
  const metaRowH = 12;
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(180, 180, 180);
  // Outer rect for 2 rows
  pdf.rect(metaBoxX, metaBoxY, metaBoxW, metaRowH * 2);
  // Divider between rows
  pdf.line(metaBoxX, metaBoxY + metaRowH, metaBoxX + metaBoxW, metaBoxY + metaRowH);
  // Label / value divider (vertical)
  const metaDivX = metaBoxX + 22;
  pdf.line(metaDivX, metaBoxY, metaDivX, metaBoxY + metaRowH * 2);

  const metaRows = [
    ['Bill No', bill.bill_number],
    ['Bill Date', new Date(bill.date).toLocaleDateString('en-GB')],
  ];
  metaRows.forEach(([label, value], i) => {
    const ry = metaBoxY + i * metaRowH + 8;
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    pdf.text(label, metaBoxX + 2, ry);
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(value, metaBoxX + metaBoxW - 2, ry, { align: 'right' });
  });

  // ─────────────────────────────────────────────
  // BILL TO — plain text, no border box
  // ─────────────────────────────────────────────
  const billToY = headerY + headerH + 6;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Bill To:', margin, billToY);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`M/s ${bill.party.toUpperCase()}`, margin, billToY + 6);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  pdf.text('Address:', margin, billToY + 12);

  // Thin separator line below bill-to block
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(180, 180, 180);
  pdf.line(margin, billToY + 16, margin + contentWidth, billToY + 16);

  // ─────────────────────────────────────────────
  // MAIN BILL TABLE  (all 0.5pt lines — no heavy borders)
  // ─────────────────────────────────────────────
  const tableY = billToY + 20;
  const rowHeight = 10;

  const columns: Array<{ header: string; width: number; align: 'left' | 'center' | 'right' }> = [
    { header: 'CN NO', width: 16, align: 'left' },
    { header: 'LOADING DT', width: 22, align: 'center' },
    { header: 'FROM', width: 23, align: 'left' },
    { header: 'TO', width: 23, align: 'left' },
    { header: 'TRAILOR NO', width: 22, align: 'left' },
    { header: 'WT', width: 13, align: 'center' },
    { header: 'FREIGHT', width: 25, align: 'right' },
    { header: 'RTO', width: 19, align: 'right' },
    { header: 'DETENTION', width: 22, align: 'right' },
    { header: 'EXTRA', width: 19, align: 'right' },
    { header: 'ADVANCE', width: 25, align: 'right' },
    { header: 'BALANCE', width: 24, align: 'right' },
  ];

  const colX: number[] = [margin];
  for (let i = 1; i < columns.length; i++) {
    colX[i] = colX[i - 1] + columns[i - 1].width;
  }
  const tableWidth = columns.reduce((s, c) => s + c.width, 0);

  // Helper — draw cell text with proper alignment
  const drawCell = (text: string, x: number, y: number, w: number, align: 'left' | 'center' | 'right', padV = 6.5) => {
    let tx: number;
    if (align === 'right') tx = x + w - 2;
    else if (align === 'center') tx = x + w / 2;
    else tx = x + 2;
    pdf.text(text, tx, y + padV, { align });
  };

  // Helper — vertical grid lines (thin grey)
  const drawVerticals = (y: number, h: number) => {
    pdf.setLineWidth(0.2);
    pdf.setDrawColor(180, 180, 180);
    columns.forEach((_, i) => { if (i > 0) pdf.line(colX[i], y, colX[i], y + h); });
  };

  // Helper — draw full-width row border (thin light grey)
  const drawRowRect = (y: number, h: number) => {
    pdf.setLineWidth(0.3);
    pdf.setDrawColor(180, 180, 180);
    pdf.rect(margin, y, tableWidth, h);
  };

  // ── Header row — subtle grey fill ──
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, tableY, tableWidth, rowHeight, 'F');
  drawRowRect(tableY, rowHeight);
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  columns.forEach((col, i) => drawCell(col.header, colX[i], tableY, col.width, col.align));
  drawVerticals(tableY, rowHeight);

  // ── Financial calculations ──
  const bankingAdvances = bankingEntries
    ? bankingEntries.filter(e => (e.category === 'bill_advance' || e.category === 'bill_payment') && e.reference_id === bill.bill_number)
      .reduce((sum, e) => sum + e.amount, 0)
    : 0;
  const cashbookAdvances = cashbookEntries
    ? cashbookEntries.filter(e => (e.category === 'bill_advance' || e.category === 'bill_payment') && e.reference_id === bill.bill_number)
      .reduce((sum, e) => sum + e.amount, 0)
    : 0;
  const totalAdvance = bankingAdvances + cashbookAdvances;
  const detention = bill.detention || 0;
  const extra = bill.extra || 0;
  const rto = bill.rto || 0;
  const originalFreight = bill.bill_amount || 0;
  const totalFreight = originalFreight + detention + extra + rto;
  const balance = totalFreight - totalAdvance - (bill.mamool || 0) - (bill.penalties || 0) - (bill.tds || 0);

  const fmt = (v: number) => v === 0 ? '-' : v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const rowValues = [
    loadingSlip.slip_number || bill.bill_number,
    new Date(loadingSlip.date || bill.date).toLocaleDateString('en-GB'),
    (loadingSlip.from_location || 'N/A').substring(0, 9),
    (loadingSlip.to_location || 'N/A').substring(0, 9),
    loadingSlip.vehicle_no || 'N/A',
    `${loadingSlip.weight || 0} MT`,
    fmt(originalFreight),
    fmt(rto),
    fmt(detention),
    fmt(extra),
    fmt(totalAdvance),
    fmt(balance),
  ];

  // ── Data row ──
  const dataY = tableY + rowHeight;
  drawRowRect(dataY, rowHeight);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  columns.forEach((col, i) => drawCell(rowValues[i], colX[i], dataY, col.width, col.align));
  drawVerticals(dataY, rowHeight);

  // ── Total row — no fill, just bold text ──
  const totalRowY = dataY + rowHeight;
  drawRowRect(totalRowY, rowHeight);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('TOTAL', colX[0] + 2, totalRowY + 6.5);
  drawCell(fmt(originalFreight), colX[6], totalRowY, columns[6].width, 'right');
  drawCell(fmt(totalAdvance), colX[10], totalRowY, columns[10].width, 'right');
  drawCell(fmt(balance), colX[11], totalRowY, columns[11].width, 'right');
  drawVerticals(totalRowY, rowHeight);

  // ─────────────────────────────────────────────
  // ADVANCE DETAILS (left box) + SUMMARY (right box)
  // ─────────────────────────────────────────────
  const bankingAdvancePayments = bankingEntries
    ? bankingEntries.filter(e =>
      (e.category === 'bill_advance' || e.category === 'bill_payment') &&
      e.reference_id === bill.bill_number
    ).map(e => ({ ...e, source: 'BANK' }))
    : [];
  const cashbookAdvancePayments = cashbookEntries
    ? cashbookEntries.filter(e =>
      (e.category === 'bill_advance' || e.category === 'bill_payment') &&
      e.reference_id === bill.bill_number
    ).map(e => ({ ...e, source: 'CASH' }))
    : [];
  const allAdvancePayments = [...bankingAdvancePayments, ...cashbookAdvancePayments];

  const midSectionY = totalRowY + rowHeight + 4;
  const summaryBoxW = 80;                            // right summary panel width
  const advBoxW = tableWidth - summaryBoxW - 4;  // left advance panel width
  const midSectionH = Math.max(24, 10 + allAdvancePayments.length * 5 + 4);

  // Left — Advance details box (light grey border)
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(180, 180, 180);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(margin, midSectionY, advBoxW, midSectionH, 'FD');

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('ADVANCE DETAILS', margin + 3, midSectionY + 6);

  if (allAdvancePayments.length > 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(40, 40, 40);
    allAdvancePayments.forEach((payment, index) => {
      const py = midSectionY + 6 + (index + 1) * 5;
      const paymentDate = new Date(payment.date).toLocaleDateString('en-GB');
      const paymentAmount = formatCurrencyForPDF(payment.amount);
      const paymentMode = payment.source === 'BANK' ? 'Bank Transfer' : 'Cash';
      pdf.text(`• ${paymentDate}  –  ${paymentAmount}  –  ${paymentMode}`, margin + 4, py);
    });
  }

  // Right — Financial summary box (each row filled with light grey)
  const summaryX = margin + advBoxW + 4;
  const sumRowH = midSectionH / 3;
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(180, 180, 180);
  pdf.rect(summaryX, midSectionY, summaryBoxW, midSectionH);
  pdf.line(summaryX, midSectionY + sumRowH, summaryX + summaryBoxW, midSectionY + sumRowH);
  pdf.line(summaryX, midSectionY + sumRowH * 2, summaryX + summaryBoxW, midSectionY + sumRowH * 2);

  const summaryRows = [
    ['TOTAL FREIGHT', formatCurrencyForPDF(totalFreight)],
    ['TOTAL ADVANCE', formatCurrencyForPDF(totalAdvance)],
    ['BALANCE PAYABLE', formatCurrencyForPDF(balance)],
  ];
  summaryRows.forEach(([label, value], i) => {
    // Fill each summary row with same subtle grey
    pdf.setFillColor(240, 240, 240);
    pdf.rect(summaryX, midSectionY + i * sumRowH, summaryBoxW, sumRowH, 'F');
    const ry = midSectionY + i * sumRowH + sumRowH / 2 + 2;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 30, 30);
    pdf.text(label, summaryX + 3, ry);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(value, summaryX + summaryBoxW - 3, ry, { align: 'right' });
  });
  // Re-draw outer border and dividers on top of fills
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(180, 180, 180);
  pdf.rect(summaryX, midSectionY, summaryBoxW, midSectionH);
  pdf.line(summaryX, midSectionY + sumRowH, summaryX + summaryBoxW, midSectionY + sumRowH);
  pdf.line(summaryX, midSectionY + sumRowH * 2, summaryX + summaryBoxW, midSectionY + sumRowH * 2);

  // ─────────────────────────────────────────────
  // BANK DETAILS & SIGNATURE — two-column, thin border
  // ─────────────────────────────────────────────
  const bankY = midSectionY + midSectionH + 4;
  const bankBoxH = 34;
  const halfW = tableWidth / 2;

  pdf.setLineWidth(0.3);
  pdf.setDrawColor(180, 180, 180);
  pdf.rect(margin, bankY, tableWidth, bankBoxH);

  // Thin vertical divider
  pdf.setLineWidth(0.2);
  pdf.setDrawColor(180, 180, 180);
  pdf.line(margin + halfW, bankY, margin + halfW, bankY + bankBoxH);

  // Left — Bank details
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 30, 100);
  pdf.text('BANK DETAILS', margin + 4, bankY + 7);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(20, 20, 20);
  pdf.text('BENEFICIARY NAME: BHAVISHYA ROAD CARRIERS', margin + 4, bankY + 14);
  pdf.text('ACCOUNT NO: 231005501207', margin + 4, bankY + 20);
  pdf.text('IFSC CODE: ICIC0002310', margin + 4, bankY + 26);
  pdf.text('BRANCH NAME: GHODASAR, AHMEDABAD', margin + 4, bankY + 32);

  // Right — Signature block
  const rightColX = margin + halfW;
  const rightCentre = rightColX + halfW / 2;
  const rightEdge = margin + tableWidth - 5;

  // Signature image (if provided)
  if (SIGNATURE_BASE64 && SIGNATURE_BASE64.trim() !== '') {
    try {
      const signaturePng = await ensurePngDataUrl(SIGNATURE_BASE64);
      pdf.addImage(signaturePng, 'PNG', rightColX + 10, bankY + 6, 38, 14);
    } catch (error) {
      console.warn('Could not add signature to PDF:', error);
    }
  }

  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('FOR,  BHAVISHYA ROAD CARRIERS', rightCentre, bankY + 10, { align: 'center' });

  // Signature line — only spans the RIGHT column (not full width)
  const sigLineLeft = rightColX + 10;
  const sigLineRight = rightEdge;
  pdf.setLineWidth(0.4);
  pdf.setDrawColor(80, 80, 80);
  pdf.line(sigLineLeft, bankY + 27, sigLineRight, bankY + 27);

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  pdf.text('Authorised Signatory', rightCentre, bankY + 32, { align: 'center' });

  // ─────────────────────────────────────────────
  // FOOTER — minimal, light grey centred
  // ─────────────────────────────────────────────
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(160, 160, 160);
  pdf.text('GENERATED BY BHAVISHYA ROAD CARRIERS SYSTEM', pageWidth / 2, pageHeight - 5, { align: 'center' });

  // Save
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
  pdf.text(`Total Credits: ${formatCurrencyForPDF(summary.totalCredits)}`, 15, currentY + 12);
  pdf.text(`Total Debits: ${formatCurrencyForPDF(summary.totalDebits)}`, 15, currentY + 16);
  pdf.text(`Outstanding Balance: ${formatCurrencyForPDF(summary.balance)}`, pageWidth - 15, currentY + 12, { align: 'right' });
  pdf.text(`Total Entries: ${summary.totalEntries}`, pageWidth - 15, currentY + 16, { align: 'right' });

  // Table header
  currentY += 25;
  const tableHeaders = ['Date', 'Bill No/Ref', 'Narration', 'Credit', 'Debit', 'Balance'];
  const colWidths = [25, 30, 70, 25, 25, 25];
  let colX = [15];
  for (let i = 1; i < colWidths.length; i++) {
    colX[i] = colX[i - 1] + colWidths[i - 1];
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
      entry.entry_type === 'credit' ? formatCurrencyForPDF(entry.amount) : '-',
      entry.entry_type === 'debit' ? formatCurrencyForPDF(entry.amount) : '-',
      formatCurrencyForPDF(entry.running_balance)
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
