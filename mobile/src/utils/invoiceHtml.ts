/**
 * Web jaisa bill/invoice HTML — Aaradhya Fashion (Tax Invoice) aur AF Creation dono ke liye.
 */

import { numberToWords } from './numberToWords';

const AF_COMPANY = {
  shopName: 'AARADHYA FASHION',
  sellerPhones: '8000984453, 9725251414',
  sellerAddress: 'Shop No. O-27, Bombay Market, Godown-BB-02 Bombay Market, Surat',
  gstin: '24ABGFA3972Q1ZY',
  pan: 'ABGFA3972Q',
  udyamNo: 'UDYAM-GJ-22-0179605',
  bankName: 'TMB BANK',
  bankAccountNo: '11915031087556',
  ifscCode: 'TMBL0000119',
  hsn: '540752',
};

const AFC_COMPANY = {
  shopName: 'AF CREATION',
  sellerPhones: '8000984453, 9725251414',
  sellerAddress: 'Shop No. O-27, Bombay Market, Godown-BB-02 Bombay Market, Surat',
  bankName: 'TMB BANK',
  bankAccountNo: '11915031087556',
  ifscCode: 'TMBL0000119',
};

export type BillForHtml = {
  bill_type: 'aaradhya_fashion' | 'af_creation';
  party_name: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  bill_date: string;
  invoice_number: number | null;
  id: number;
};

export type BillItemForHtml = {
  product?: { design_number?: string; color_description?: string; selling_price?: number };
  design_number?: string;
  color_description?: string;
  quantity: number;
  selling_price?: number;
};

function formatBillNumber(bill: BillForHtml): string {
  if (bill.invoice_number != null) {
    return bill.bill_type === 'aaradhya_fashion' ? `AF-${bill.invoice_number}` : `AFC-${bill.invoice_number}`;
  }
  return `BILL-${bill.id}`;
}

function getFormattedBillNo(bill: BillForHtml): string {
  const num = bill.invoice_number != null
    ? (bill.bill_type === 'aaradhya_fashion' ? String(bill.invoice_number) : String(bill.invoice_number))
    : String(bill.id);
  return `${num}/FM`;
}

/** Aaradhya Fashion — web jaisa Tax Invoice HTML (GST, HSN, CGST/SGST) */
export function generateTaxInvoiceHTML(bill: BillForHtml, items: BillItemForHtml[], dateStr: string): string {
  const billNo = getFormattedBillNo(bill);
  const totalPcs = items.reduce((s, i) => s + i.quantity, 0);
  const cgstAmount = bill.gst_amount / 2;
  const sgstAmount = bill.gst_amount / 2;
  const amountInWords = numberToWords(Math.round(bill.total_amount));

  const rows = items.map((item, idx) => {
    const design = (item.product?.design_number || item.design_number || '').replace(/^D\.?NO\.?/i, '').trim();
    const color = item.product?.color_description || item.color_description || '';
    const particulars = `D.NO.${design}${color ? ' - ' + color : ''}`;
    const price = item.product?.selling_price ?? item.selling_price ?? 0;
    const total = price * item.quantity;
    return `<tr>
      <td class="col-sr">${idx + 1}</td>
      <td class="col-particulars">${particulars}</td>
      <td class="col-hsn">${AF_COMPANY.hsn}</td>
      <td class="col-pcs">${item.quantity}</td>
      <td class="col-rate">₹${price.toFixed(2)}</td>
      <td class="col-disc">0.00</td>
      <td class="col-amount">₹${total.toFixed(2)}</td>
      <td class="col-igst">0.00</td>
      <td class="col-cgst">2.50</td>
      <td class="col-sgst">2.50</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:11px;background:white;}
.invoice-wrapper{width:210mm;height:auto;min-height:0;padding:8mm 10mm;margin:0 auto;border:2px solid #000;}
.invoice-header{text-align:center;margin-bottom:6px;padding-bottom:6px;border-bottom:2px solid #000;}
.ganeshaya{font-size:10px;color:#333;font-style:italic;}
.company-name{font-size:20px;font-weight:bold;text-align:center;margin:8px 0 10px;text-decoration:underline;}
.seller-details-header{text-align:center;margin-bottom:10px;padding:6px 0;border-bottom:1px solid #000;font-size:8.5px;}
.details-grid-container{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0;}
.buyer-section,.invoice-details-section,.transport-section{padding:6px;border:2px solid #000;background:#fafafa;}
.section-title{font-size:9px;font-weight:bold;margin-bottom:5px;border-bottom:1px solid #000;}
.detail-row{display:flex;margin-bottom:2px;font-size:8px;}
.detail-label{font-weight:bold;min-width:70px;margin-right:6px;}
.items-section{margin:10px 0;padding:8px;border:2px solid #000;background:#fafafa;}
.items-table{width:100%;border-collapse:collapse;font-size:8.5px;border:2px solid #000;}
.items-table th,.items-table td{border:1px solid #000;padding:6px 4px;}
.items-table thead{background:#2c3e50;color:white;}
.col-sr{width:4%;}.col-particulars{width:28%;text-align:left!important;padding-left:8px!important;}
.col-hsn{width:10%;}.col-pcs{width:6%;}.col-rate{width:11%;text-align:right!important;}
.col-disc{width:7%;}.col-amount{width:12%;text-align:right!important;}
.col-igst,.col-cgst,.col-sgst{width:7%;}
.bank-totals-section{display:grid;grid-template-columns:1fr 1.2fr;gap:18px;margin-top:16px;}
.bank-details,.totals-section{padding:12px;border:2px solid #000;background:#fafafa;}
.total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:9.5px;border-bottom:1px solid #ddd;}
.total-row.grand-total{border-top:3px solid #000;border-bottom:3px solid #000;padding:10px 0;font-weight:bold;font-size:13px;background:#f0f0f0;}
.amount-in-words{margin-top:12px;padding:10px;border:2px solid #000;font-size:10px;text-align:center;font-weight:600;}
.signatory-section{text-align:right;margin-top:30px;}
.signatory-label{margin-top:50px;border-top:2px solid #000;padding-top:8px;display:inline-block;min-width:180px;text-align:center;font-weight:600;}
</style></head><body>
<div class="invoice-wrapper">
  <div class="invoice-header"><div class="ganeshaya">!! Shree Ganeshaya Namah !!</div></div>
  <div class="company-name">${AF_COMPANY.shopName}</div>
  <div class="seller-details-header">
    <div>${AF_COMPANY.sellerPhones}</div>
    <div>${AF_COMPANY.sellerAddress}</div>
    <div>GSTIN: ${AF_COMPANY.gstin} | PAN: ${AF_COMPANY.pan} | Udyam (MSME) No.: ${AF_COMPANY.udyamNo}</div>
  </div>
  <div class="details-grid-container">
    <div class="buyer-section">
      <div class="section-title">Buyer Details (Kharidne Wala)</div>
      <div class="detail-row"><span class="detail-label">Name:</span><span>${bill.party_name}</span></div>
      <div class="detail-row"><span class="detail-label">Address:</span><span></span></div>
      <div class="detail-row"><span class="detail-label">GSTIN:</span><span></span></div>
      <div class="detail-row"><span class="detail-label">Place of Supply:</span><span>24-Gujarat</span></div>
    </div>
    <div class="invoice-details-section">
      <div class="section-title">Invoice Details (Bill Ki Jankari)</div>
      <div class="detail-row"><span class="detail-label">Bill No.:</span><span>${billNo}</span></div>
      <div class="detail-row"><span class="detail-label">Date:</span><span>${dateStr}</span></div>
      <div class="detail-row"><span class="detail-label">Challan:</span><span>${billNo}</span></div>
    </div>
    <div class="transport-section" style="grid-column:1/3;">
      <div class="section-title">Transport Details</div>
      <div class="detail-row"><span class="detail-label">Transport:</span><span>DIAMOND TRANSPORT</span></div>
      <div class="detail-row"><span class="detail-label">Station:</span><span></span></div>
      <div class="detail-row"><span class="detail-label">Agent:</span><span>DIRECT</span></div>
    </div>
  </div>
  <div class="items-section">
    <div class="section-title">Item Details (Samaan Ki List)</div>
    <table class="items-table">
      <thead><tr>
        <th class="col-sr">SR</th><th class="col-particulars">PARTICULARS</th><th class="col-hsn">HSN CODE</th>
        <th class="col-pcs">PCS</th><th class="col-rate">RATE</th><th class="col-disc">DISC %</th>
        <th class="col-amount">AMOUNT</th><th class="col-igst">IGST %</th><th class="col-cgst">CGST %</th><th class="col-sgst">SGST %</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="bank-totals-section">
    <div class="bank-details">
      <div class="section-title">Bank Details & Terms & Conditions</div>
      <div class="detail-row"><span class="detail-label">Bank Name:</span><span>${AF_COMPANY.bankName}</span></div>
      <div class="detail-row"><span class="detail-label">A/C No.:</span><span>${AF_COMPANY.bankAccountNo}</span></div>
      <div class="detail-row"><span class="detail-label">IFSC Code:</span><span>${AF_COMPANY.ifscCode}</span></div>
      <ol style="margin:10px 0 0 22px;font-size:8.5px;">
        <li>Subject to Surat Jurisdiction.</li>
        <li>Goods have been sold & despatched at the entire risk of the purchaser.</li>
        <li>Complaints regarding this invoice must be informed in writing within 48 hours.</li>
      </ol>
    </div>
    <div class="totals-section">
      <div class="section-title">Totals & Tax Calculation</div>
      <div class="total-row"><span class="total-label">Total PCS:</span><span>${totalPcs}</span></div>
      <div class="total-row"><span class="total-label">Sub Total (Taxable Value):</span><span>₹${bill.subtotal.toFixed(2)}</span></div>
      <div class="total-row"><span class="total-label">CGST @ 2.50%:</span><span>₹${cgstAmount.toFixed(2)}</span></div>
      <div class="total-row"><span class="total-label">SGST @ 2.50%:</span><span>₹${sgstAmount.toFixed(2)}</span></div>
      <div class="total-row grand-total"><span class="total-label">Grand Total:</span><span>₹${bill.total_amount.toFixed(2)}</span></div>
      <div class="amount-in-words"><strong>In Words:</strong> ${amountInWords}</div>
    </div>
  </div>
  <div class="signatory-section">
    <div style="font-size:12px;font-weight:bold;margin-bottom:8px;">For ${AF_COMPANY.shopName}</div>
    <div class="signatory-label">(Auth. Signatory)</div>
  </div>
</div></body></html>`;
}

/** AF Creation — web jaisa bill HTML (bina GST columns) */
export function generateAFCreationInvoiceHTML(bill: BillForHtml, items: BillItemForHtml[], dateStr: string): string {
  const billNo = getFormattedBillNo(bill);
  const totalPcs = items.reduce((s, i) => s + i.quantity, 0);
  const amountInWords = numberToWords(Math.round(bill.total_amount));

  const rows = items.map((item, idx) => {
    const design = (item.product?.design_number || item.design_number || '').replace(/^D\.?NO\.?/i, '').trim();
    const color = item.product?.color_description || item.color_description || '';
    const particulars = `D.NO.${design}${color ? ' - ' + color : ''}`;
    const price = item.product?.selling_price ?? item.selling_price ?? 0;
    const total = price * item.quantity;
    return `<tr>
      <td class="col-sr">${idx + 1}</td>
      <td class="col-particulars">${particulars}</td>
      <td class="col-pcs">${item.quantity}</td>
      <td class="col-rate">₹${price.toFixed(2)}</td>
      <td class="col-disc">0.00</td>
      <td class="col-amount">₹${total.toFixed(2)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:11px;background:white;}
.invoice-wrapper{width:210mm;height:auto;min-height:0;padding:8mm 10mm;margin:0 auto;border:2px solid #000;}
.invoice-header{text-align:center;margin-bottom:6px;padding-bottom:6px;border-bottom:2px solid #000;}
.ganeshaya{font-size:10px;color:#333;font-style:italic;}
.company-name{font-size:20px;font-weight:bold;text-align:center;margin:8px 0 10px;text-decoration:underline;}
.seller-details-header{text-align:center;margin-bottom:10px;padding:6px 0;border-bottom:1px solid #000;font-size:8.5px;}
.details-grid-container{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0;}
.buyer-section,.invoice-details-section,.transport-section{padding:6px;border:2px solid #000;background:#fafafa;}
.section-title{font-size:9px;font-weight:bold;margin-bottom:5px;border-bottom:1px solid #000;}
.detail-row{display:flex;margin-bottom:2px;font-size:8px;}
.detail-label{font-weight:bold;min-width:70px;margin-right:6px;}
.items-section{margin:10px 0;padding:8px;border:2px solid #000;background:#fafafa;}
.items-table{width:100%;border-collapse:collapse;font-size:8.5px;border:2px solid #000;}
.items-table th,.items-table td{border:1px solid #000;padding:6px 4px;}
.items-table thead{background:#2c3e50;color:white;}
.col-sr{width:5%;}.col-particulars{width:40%;text-align:left!important;padding-left:8px!important;}
.col-pcs{width:8%;}.col-rate{width:15%;text-align:right!important;}
.col-disc{width:10%;}.col-amount{width:22%;text-align:right!important;}
.bank-totals-section{display:grid;grid-template-columns:1fr 1.2fr;gap:15px;margin-top:10px;}
.bank-details,.totals-section{padding:10px;border:2px solid #000;background:#fafafa;}
.total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:9.5px;border-bottom:1px solid #ddd;}
.total-row.grand-total{border-top:3px solid #000;border-bottom:3px solid #000;padding:8px 0;font-weight:bold;font-size:12px;background:#f0f0f0;}
.amount-in-words{margin-top:10px;padding:8px;border:2px solid #000;font-size:9.5px;text-align:center;font-weight:600;}
.signatory-section{margin-top:12px;padding:10px;text-align:right;border-top:2px solid #000;}
.signatory-label{font-size:9px;font-style:italic;}
</style></head><body>
<div class="invoice-wrapper">
  <div class="invoice-header"><div class="ganeshaya">!! Shree Ganeshaya Namah !!</div></div>
  <div class="company-name">${AFC_COMPANY.shopName}</div>
  <div class="seller-details-header">
    <div>${AFC_COMPANY.sellerPhones}</div>
    <div>${AFC_COMPANY.sellerAddress}</div>
  </div>
  <div class="details-grid-container">
    <div class="buyer-section">
      <div class="section-title">Buyer Details (Kharidne Wala)</div>
      <div class="detail-row"><span class="detail-label">Name:</span><span>${bill.party_name}</span></div>
      <div class="detail-row"><span class="detail-label">Address:</span><span></span></div>
    </div>
    <div class="invoice-details-section">
      <div class="section-title">Invoice Details (Bill Ki Jankari)</div>
      <div class="detail-row"><span class="detail-label">Bill No.:</span><span>${billNo}</span></div>
      <div class="detail-row"><span class="detail-label">Date:</span><span>${dateStr}</span></div>
      <div class="detail-row"><span class="detail-label">Challan:</span><span>${billNo}</span></div>
    </div>
    <div class="transport-section" style="grid-column:1/3;">
      <div class="section-title">Transport Details</div>
      <div class="detail-row"><span class="detail-label">Transport:</span><span>DIAMOND TRANSPORT</span></div>
      <div class="detail-row"><span class="detail-label">Station:</span><span></span></div>
      <div class="detail-row"><span class="detail-label">Agent:</span><span>DIRECT</span></div>
    </div>
  </div>
  <div class="items-section">
    <div class="section-title">Item Details (Samaan Ki List)</div>
    <table class="items-table">
      <thead><tr>
        <th class="col-sr">SR</th><th class="col-particulars">PARTICULARS</th><th class="col-pcs">PCS</th>
        <th class="col-rate">RATE</th><th class="col-disc">DISC %</th><th class="col-amount">AMOUNT</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="bank-totals-section">
    <div class="bank-details">
      <div class="section-title">Bank Details & Terms & Conditions</div>
      <div class="detail-row"><span class="detail-label">Bank Name:</span><span>${AFC_COMPANY.bankName}</span></div>
      <div class="detail-row"><span class="detail-label">A/C No.:</span><span>${AFC_COMPANY.bankAccountNo}</span></div>
      <div class="detail-row"><span class="detail-label">IFSC Code:</span><span>${AFC_COMPANY.ifscCode}</span></div>
      <ol style="margin:8px 0 0 20px;font-size:8.5px;">
        <li>Subject to Surat Jurisdiction.</li>
        <li>Goods have been sold & despatched at the entire risk of the purchaser.</li>
        <li>Complaints regarding this invoice must be informed in writing within 48 hours.</li>
      </ol>
    </div>
    <div class="totals-section">
      <div class="section-title">Totals & Calculation</div>
      <div class="total-row"><span class="total-label">Total PCS:</span><span>${totalPcs}</span></div>
      <div class="total-row"><span class="total-label">Sub Total:</span><span>₹${bill.subtotal.toFixed(2)}</span></div>
      <div class="total-row grand-total"><span class="total-label">Grand Total:</span><span>₹${bill.total_amount.toFixed(2)}</span></div>
      <div class="amount-in-words"><strong>In Words:</strong> ${amountInWords}</div>
    </div>
  </div>
  <div class="signatory-section">
    <div style="font-size:10px;font-weight:bold;margin-bottom:4px;">For ${AFC_COMPANY.shopName}</div>
    <div class="signatory-label">(Auth. Signatory)</div>
  </div>
</div></body></html>`;
}
