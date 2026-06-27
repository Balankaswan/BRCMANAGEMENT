import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { COMPANY_LOGO_BASE64 } from '../assets/logo';
import type { Memo, LoadingSlip } from '../types';

const fmt = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const generateMemoPDFNew = async (
  memo: Memo,
  loadingSlip: LoadingSlip,
  bankingEntries?: any[],
  cashbookEntries?: any[]
): Promise<void> => {
  // ── Advance calculations ─────────────────────────────────────────
  const bankAdv = (bankingEntries ?? [])
    .filter(e => (e.category === 'memo_advance' || e.category === 'memo_payment') && e.reference_id === memo.memo_number)
    .reduce((s, e) => s + e.amount, 0);
  const cashAdv = (cashbookEntries ?? [])
    .filter(e => (e.category === 'memo_advance' || e.category === 'memo_payment') && e.reference_id === memo.memo_number)
    .reduce((s, e) => s + e.amount, 0);
  const fuelAdv = (memo.advance_payments ?? [])
    .filter(a => a.id?.startsWith('fuel-'))
    .reduce((s, a) => s + (a.amount ?? 0), 0);
  const totalAdv = bankAdv + cashAdv + fuelAdv;
  const netPayable = memo.net_amount - totalAdv;

  const bankAdvPmts = (bankingEntries ?? [])
    .filter(e => (e.category === 'memo_advance' || e.category === 'memo_payment') && e.reference_id === memo.memo_number)
    .map(e => ({ ...e, src: 'BANK' }));
  const cashAdvPmts = (cashbookEntries ?? [])
    .filter(e => (e.category === 'memo_advance' || e.category === 'memo_payment') && e.reference_id === memo.memo_number)
    .map(e => ({ ...e, src: 'CASH' }));
  const fuelPmts = (memo.advance_payments ?? [])
    .filter(a => a.id?.startsWith('fuel-'))
    .map(a => ({ date: a.date, amount: a.amount, src: 'FUEL' }));
  const allPmts = [...bankAdvPmts, ...cashAdvPmts, ...fuelPmts]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // ── Financial rows ───────────────────────────────────────────────
  const rows: [string, number][] = [
    ['Freight Amount', memo.freight],
    ['Add: Detention', memo.detention ?? 0],
    ['Add: Extra Weight', memo.extra ?? 0],
    ['Add: RTO', memo.rto ?? 0],
    ['Less: Commission', memo.commission ?? 0],
    ['Less: Mamool', memo.mamool ?? 0],
    ['Less: Advance Paid', totalAdv],
  ];

  // ── Build HTML ───────────────────────────────────────────────────
  const html = `
<div id="memo-pdf-root" style="
  width:794px;
  min-height:1123px;
  background:#fff;
  font-family:'Helvetica Neue',Arial,sans-serif;
  color:#1a1a2e;
  padding:28px 32px 24px;
  box-sizing:border-box;
">
  <!-- HEADER -->
  <div style="display:flex;align-items:flex-start;border:2px solid #1a3a6b;border-radius:4px;padding:14px 18px;margin-bottom:18px;gap:16px;">
    <img src="${COMPANY_LOGO_BASE64}" style="width:68px;height:68px;object-fit:contain;flex-shrink:0;" />
    <div style="flex:1;">
      <div style="font-size:22px;font-weight:900;color:#1a3a6b;letter-spacing:1px;">BHAVISHYA ROAD CARRIERS</div>
      <div style="font-size:9px;color:#444;margin-top:2px;">Specialist in Heavy ODC, Hydraulic, Low Bed Trailer, Flat Bed Trailer Transport &amp; Commission Agent</div>
      <div style="font-size:9.5px;font-weight:700;color:#1a3a6b;margin-top:2px;">FLEET OWNERS, TRANSPORT CONTRACTORS &amp; COMMISSION AGENTS</div>
      <div style="font-size:8.5px;color:#555;margin-top:3px;">📍 404, Parijaat Business Center, Nr. SP Ring Road, Aslali, Ahmedabad - 382405</div>
      <div style="display:flex;gap:24px;margin-top:5px;font-size:8.5px;color:#333;">
        <span>📞 9824026578, 9824900776</span>
        <span>📍 Ahmedabad</span>
        <span>PAN NO: BNDPK7173D</span>
      </div>
    </div>
  </div>

  <!-- MEMO TITLE -->
  <div style="text-align:center;margin-bottom:16px;">
    <span style="font-size:9px;color:#1a3a6b;letter-spacing:3px;">─────</span>
    <span style="font-size:22px;font-weight:900;color:#1a3a6b;margin:0 12px;letter-spacing:4px;">MEMO</span>
    <span style="font-size:9px;color:#1a3a6b;letter-spacing:3px;">─────</span>
  </div>

  <!-- INFO CARDS -->
  <div style="display:flex;gap:10px;margin-bottom:18px;">
    ${[
      ['📄', 'Memo No.', memo.memo_number],
      ['📅', 'Date', fmtDate(memo.date)],
      ['🚛', 'Vehicle No.', loadingSlip.vehicle_no],
      ['👤', 'Supplier', memo.supplier],
    ].map(([icon, label, val]) => `
    <div style="flex:1;border:1.5px solid #d0d8e8;border-radius:8px;padding:10px 14px;">
      <div style="font-size:18px;margin-bottom:4px;">${icon}</div>
      <div style="font-size:8px;color:#7a8aa0;font-weight:600;">${label}</div>
      <div style="font-size:11px;font-weight:800;color:#1a3a6b;margin-top:2px;">${val}</div>
    </div>`).join('')}
  </div>

  <!-- TRANSPORT DETAILS -->
  <div style="margin-bottom:14px;">
    <div style="font-size:11px;font-weight:900;color:#1a3a6b;border-bottom:2.5px solid #1a73e8;padding-bottom:4px;margin-bottom:8px;letter-spacing:0.5px;">TRANSPORT DETAILS</div>
    <div style="border:1.5px solid #d0d8e8;border-radius:6px;overflow:hidden;">
      <div style="display:flex;border-bottom:1px solid #d0d8e8;">
        <div style="flex:1;padding:10px 14px;border-right:1px solid #d0d8e8;">
          <div style="font-size:8px;font-weight:700;color:#1a73e8;margin-bottom:4px;">From:</div>
          <div style="font-size:12px;font-weight:800;color:#1a1a2e;">${loadingSlip.from_location}</div>
        </div>
        <div style="flex:1;padding:10px 14px;">
          <div style="font-size:8px;font-weight:700;color:#1a73e8;margin-bottom:4px;">To:</div>
          <div style="font-size:12px;font-weight:800;color:#1a1a2e;">${loadingSlip.to_location}</div>
        </div>
      </div>
      <div style="display:flex;">
        <div style="flex:1;padding:10px 14px;border-right:1px solid #d0d8e8;">
          <div style="font-size:8px;font-weight:700;color:#1a73e8;margin-bottom:4px;">Material:</div>
          <div style="font-size:12px;font-weight:800;color:#1a1a2e;">${loadingSlip.material || 'MACHINERY'}</div>
        </div>
        <div style="flex:1;padding:10px 14px;">
          <div style="font-size:8px;font-weight:700;color:#1a73e8;margin-bottom:4px;">Weight:</div>
          <div style="font-size:12px;font-weight:800;color:#1a1a2e;">${loadingSlip.weight} MT</div>
        </div>
      </div>
    </div>
  </div>

  <!-- FINANCIAL BREAKDOWN -->
  <div style="margin-bottom:14px;">
    <div style="font-size:11px;font-weight:900;color:#1a3a6b;border-bottom:2.5px solid #1a73e8;padding-bottom:4px;margin-bottom:8px;letter-spacing:0.5px;">FINANCIAL BREAKDOWN</div>
    <table style="width:100%;border-collapse:collapse;font-size:10px;">
      <thead>
        <tr style="background:#1a3a6b;color:#fff;">
          <th style="padding:9px 14px;text-align:left;font-size:9.5px;letter-spacing:0.5px;">DESCRIPTION</th>
          <th style="padding:9px 14px;text-align:right;font-size:9.5px;letter-spacing:0.5px;">AMOUNT (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(([label, amt]) => `
        <tr style="border-bottom:1px solid #e8edf5;">
          <td style="padding:8px 14px;color:#2d3748;">${label}</td>
          <td style="padding:8px 14px;text-align:right;color:#2d3748;">${fmt(amt)}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr style="background:#1a3a6b;color:#fff;">
          <td style="padding:10px 14px;font-weight:900;font-size:11px;letter-spacing:0.5px;">NET AMOUNT PAYABLE</td>
          <td style="padding:10px 14px;text-align:right;font-weight:900;font-size:13px;">₹ ${fmt(netPayable)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- ADVANCE + NOTES -->
  <div style="display:flex;gap:14px;margin-bottom:20px;">
    <div style="flex:1;">
      <div style="font-size:11px;font-weight:900;color:#1a3a6b;border-bottom:2.5px solid #1a73e8;padding-bottom:4px;margin-bottom:8px;">ADVANCE DETAILS</div>
      ${allPmts.length === 0
        ? `<div style="font-size:9px;color:#888;display:flex;align-items:center;gap:6px;"><span style="font-size:14px;">ℹ️</span> No advance payments recorded.</div>`
        : allPmts.map(p => `<div style="font-size:9px;color:#444;margin-bottom:4px;">• ${fmtDate(p.date)} — ₹${fmt(p.amount)} (${p.src})</div>`).join('')
      }
    </div>
    <div style="flex:1;">
      <div style="font-size:11px;font-weight:900;color:#1a3a6b;border-bottom:2.5px solid #1a73e8;padding-bottom:4px;margin-bottom:8px;">NOTES</div>
      <div style="font-size:9px;color:#444;display:flex;align-items:flex-start;gap:6px;">
        <span style="font-size:14px;">📄</span>
        <span>${memo.narration || '—'}</span>
      </div>
    </div>
  </div>

  <!-- SIGNATURE -->
  <div style="text-align:right;margin-bottom:10px;padding-right:20px;">
    <div style="font-size:22px;margin-bottom:4px;">✒️</div>
    <div style="border-top:2px solid #1a3a6b;display:inline-block;padding-top:6px;min-width:180px;text-align:center;">
      <div style="font-size:9.5px;font-weight:800;color:#1a3a6b;letter-spacing:0.5px;">AUTHORISED SIGNATORY</div>
      <div style="font-size:8.5px;color:#555;margin-top:2px;">FOR BHAVISHYA ROAD CARRIERS</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="border-top:1px dashed #b0bcd0;padding-top:8px;text-align:center;">
    <div style="font-size:7.5px;color:#999;font-style:italic;margin-bottom:4px;">This is a computer-generated document and does not require a physical signature.</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
      <span style="display:inline-block;width:40px;height:1px;background:#1a3a6b;"></span>
      <span style="font-size:8px;font-weight:700;color:#1a3a6b;letter-spacing:1px;">GENERATED FROM BHAVISHYA ROAD CARRIER SYSTEM</span>
      <span style="display:inline-block;width:40px;height:1px;background:#1a3a6b;"></span>
    </div>
  </div>
</div>`;

  // ── Render HTML → Canvas → PDF ───────────────────────────────────
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const el = container.querySelector('#memo-pdf-root') as HTMLElement;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pW = pdf.internal.pageSize.getWidth();
    const pH = pdf.internal.pageSize.getHeight();
    const ratio = canvas.height / canvas.width;
    const imgH = pW * ratio;

    if (imgH <= pH) {
      pdf.addImage(imgData, 'PNG', 0, 0, pW, imgH);
    } else {
      // Multi-page support
      let srcY = 0;
      const srcPageH = Math.floor((canvas.width * pH) / pW);
      while (srcY < canvas.height) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = Math.min(srcPageH, canvas.height - srcY);
        const ctx = tempCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, -srcY);
        pdf.addImage(tempCanvas.toDataURL('image/png'), 'PNG', 0, 0, pW, pH);
        srcY += srcPageH;
        if (srcY < canvas.height) pdf.addPage();
      }
    }

    const filename = `Memo_${memo.memo_number}_${memo.supplier.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
};
