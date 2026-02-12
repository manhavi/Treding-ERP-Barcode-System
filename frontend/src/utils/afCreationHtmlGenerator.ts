import { AFCreationInvoiceData } from '../components/AFCreationInvoiceTemplate';

export function generateAFCreationInvoiceHTML(data: AFCreationInvoiceData): string {
  const itemsRows = data.items
    .map(
      (item) => `
    <tr>
      <td class="col-sr">${item.sr}</td>
      <td class="col-particulars">${item.particulars}</td>
      <td class="col-pcs">${item.pcs}</td>
      <td class="col-rate">₹${item.rate.toFixed(2)}</td>
      <td class="col-disc">${item.discPercent.toFixed(2)}</td>
      <td class="col-amount">₹${item.amount.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', 'Roboto', sans-serif;
      font-size: 11px;
      line-height: 1.4;
      background: white;
    }
    
    .invoice-wrapper {
      width: 210mm;
      height: auto;
      min-height: 0;
      background: white;
      padding: 8mm 10mm;
      margin: 0 auto;
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 10px;
      line-height: 1.4;
      border: 2px solid #000;
      display: flex;
      flex-direction: column;
    }
    
    .top-section {
      display: flex;
      flex-direction: column;
      margin-bottom: 8px;
    }
    
    .invoice-header {
      text-align: center;
      margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 2px solid #000;
    }
    
    .ganeshaya {
      font-size: 10px;
      margin-bottom: 4px;
      font-weight: normal;
      color: #333;
      font-style: italic;
    }
    
    .company-name {
      font-size: 20px;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      margin: 8px 0 10px 0;
      letter-spacing: 1.5px;
      color: #000;
      text-decoration: underline;
      text-decoration-thickness: 2px;
    }
    
    .seller-details-header {
      text-align: center;
      margin-bottom: 10px;
      padding: 6px 0;
      border-bottom: 1px solid #000;
    }
    
    .seller-info-line {
      font-size: 8.5px;
      margin-bottom: 3px;
      color: #000;
      font-weight: 500;
      line-height: 1.4;
    }
    
    .seller-info-line:last-child {
      margin-bottom: 0;
      font-size: 8px;
    }
    
    .details-grid-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 6px;
      flex: 1;
      min-height: 0;
    }
    
    .buyer-section {
      grid-column: 1;
      grid-row: 1;
    }
    
    .invoice-details-section {
      grid-column: 2;
      grid-row: 1;
    }
    
    .transport-section {
      grid-column: 1 / 3;
      grid-row: 2;
    }
    
    .buyer-section,
    .invoice-details-section,
    .transport-section {
      padding: 6px;
      border: 2px solid #000;
      border-radius: 0;
      background: #fafafa;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: visible;
    }
    
    .section-title {
      font-size: 9px;
      font-weight: bold;
      margin-bottom: 6px;
      color: #000;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      letter-spacing: 0.3px;
    }
    
    .details-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2px;
      flex: 1;
      overflow: visible;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2px;
      padding: 1px 0;
      font-size: 8.5px;
    }
    
    .detail-label {
      font-weight: 600;
      color: #000;
      margin-right: 6px;
      min-width: 60px;
      flex-shrink: 0;
    }
    
    .detail-value {
      color: #000;
      text-align: left;
      flex: 1;
      word-wrap: break-word;
    }
    
    .bottom-section {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    
    .items-section,
    .bank-totals-section {
      margin-bottom: 10px;
      padding: 8px;
      border: 2px solid #000;
      border-radius: 0;
      background: #fafafa;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .items-section {
      margin-top: 8px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 8.5px;
    }
    
    .items-table thead {
      background: #2c3e50;
      color: white;
    }
    
    .items-table th {
      padding: 6px 4px;
      text-align: center;
      font-weight: bold;
      border: 1px solid #000;
      font-size: 8px;
      text-transform: uppercase;
    }
    
    .items-table td {
      padding: 5px 4px;
      text-align: center;
      border: 1px solid #000;
      background: white;
    }
    
    .items-table tbody tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    .col-sr { width: 5%; font-weight: bold; }
    .col-particulars { width: 40%; text-align: left !important; padding-left: 8px !important; font-weight: 500; }
    .col-pcs { width: 8%; font-weight: bold; }
    .col-rate { width: 15%; text-align: right !important; padding-right: 6px !important; font-weight: 600; font-family: 'Courier New', monospace; }
    .col-disc { width: 10%; }
    .col-amount { width: 22%; text-align: right !important; padding-right: 6px !important; font-weight: bold; font-size: 9px; color: #000; font-family: 'Courier New', monospace; }
    
    .bank-totals-section {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 15px;
      margin-top: 10px;
    }
    
    .bank-details,
    .totals-section {
      padding: 10px;
      border: 2px solid #000;
      border-radius: 0;
      background: #fafafa;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .bank-terms-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .bank-subsection,
    .terms-subsection {
      flex: 1;
    }
    
    .subsection-title {
      font-size: 9px;
      font-weight: bold;
      margin-bottom: 6px;
      color: #000;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      letter-spacing: 0.3px;
    }
    
    .totals-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 9.5px;
      border-bottom: 1px solid #ddd;
      align-items: center;
    }
    
    .total-row:last-of-type:not(.grand-total) {
      border-bottom: 2px solid #000;
    }
    
    .total-row.grand-total {
      border-top: 3px solid #000;
      border-bottom: 3px solid #000;
      padding: 8px 0;
      font-weight: bold;
      font-size: 12px;
      margin-top: 6px;
      background: #f0f0f0;
      padding-left: 6px;
      padding-right: 6px;
    }
    
    .total-label {
      font-weight: bold;
      color: #000;
      text-transform: uppercase;
      font-size: 9px;
    }
    
    .total-value {
      font-weight: bold;
      color: #000;
      font-size: 10px;
      font-family: 'Courier New', monospace;
    }
    
    .total-row.grand-total .total-value {
      font-size: 13px;
    }
    
    .amount-in-words {
      margin-top: 10px;
      padding: 8px;
      background: linear-gradient(to bottom, #fff, #f5f5f5);
      border: 2px solid #000;
      font-size: 9.5px;
      font-style: italic;
      text-align: center;
      font-weight: 600;
      border-radius: 3px;
    }
    
    .amount-in-words strong {
      font-style: normal;
      text-transform: uppercase;
      font-size: 8.5px;
      margin-right: 4px;
    }
    
    .terms-list {
      margin: 8px 0 0 20px;
      padding: 0;
      font-size: 8.5px;
      line-height: 1.6;
    }
    
    .terms-list li {
      margin-bottom: 4px;
      color: #000;
      font-weight: 500;
    }
    
    .signatory-section {
      margin-top: 12px;
      padding: 10px;
      text-align: right;
      border-top: 2px solid #000;
    }
    
    .signatory-text {
      font-size: 10px;
      font-weight: bold;
      margin-bottom: 4px;
      color: #000;
    }
    
    .signatory-label {
      font-size: 9px;
      color: #000;
      font-style: italic;
    }
    
    @media print {
      @page {
        size: A4;
        margin: 0;
        padding: 0;
      }
      
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        width: 210mm !important;
        height: auto !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .invoice-wrapper {
        margin: 0 !important;
        padding: 8mm 10mm !important;
        border: 2px solid #000 !important;
        box-shadow: none !important;
        page-break-after: auto;
        page-break-before: auto;
        width: 210mm !important;
        min-height: 0 !important;
        height: auto !important;
        display: flex !important;
        flex-direction: column !important;
      }
      
      .top-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: flex !important;
        flex-direction: column !important;
        visibility: visible !important;
        opacity: 1 !important;
        height: auto !important;
        max-height: none !important;
      }
      
      .details-grid-container {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        grid-template-rows: 1fr 1fr !important;
        gap: 6px !important;
        visibility: visible !important;
        opacity: 1 !important;
        height: auto !important;
        min-height: 0 !important;
      }
      
      .buyer-section,
      .invoice-details-section,
      .transport-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: flex !important;
        flex-direction: column !important;
        visibility: visible !important;
        opacity: 1 !important;
        padding: 6px !important;
        border: 2px solid #000 !important;
        background: #fafafa !important;
        overflow: visible !important;
        height: auto !important;
        min-height: auto !important;
        max-height: none !important;
      }
      
      .items-table thead {
        display: table-header-group;
      }
      
      .items-table tbody tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      .bank-totals-section {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      .signatory-section {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div class="top-section">
      <div class="invoice-header">
        <div class="ganeshaya">!! Shree Ganeshaya Namah !!</div>
      </div>

      <div class="company-name">${data.shopName}</div>

      <div class="seller-details-header">
        <div class="seller-info-line">${data.sellerPhones}</div>
        <div class="seller-info-line">${data.sellerAddress}</div>
      </div>

      <div class="details-grid-container">
        <div class="buyer-section">
      <div class="section-title">Buyer Details (Kharidne Wala)</div>
      <div class="details-grid">
        <div class="detail-row">
          <span class="detail-label">Name:</span>
          <span class="detail-value">${data.buyerName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Address:</span>
          <span class="detail-value">${data.buyerAddress || ''}</span>
        </div>
      </div>
    </div>

    <div class="invoice-details-section">
      <div class="section-title">Invoice Details (Bill Ki Jankari)</div>
      <div class="details-grid">
        <div class="detail-row">
          <span class="detail-label">Bill No.:</span>
          <span class="detail-value">${data.billNo}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${data.date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Challan:</span>
          <span class="detail-value">${data.challan}</span>
        </div>
        ${data.orderNo ? `<div class="detail-row">
          <span class="detail-label">Order No:</span>
          <span class="detail-value">${data.orderNo}</span>
        </div>` : ''}
      </div>
    </div>

    <div class="transport-section">
      <div class="section-title">Transport Details</div>
      <div class="details-grid">
        <div class="detail-row">
          <span class="detail-label">Transport:</span>
          <span class="detail-value">${data.transport}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Station:</span>
          <span class="detail-value">${data.station || ''}</span>
        </div>
        ${data.caseNo ? `<div class="detail-row">
          <span class="detail-label">Case No:</span>
          <span class="detail-value">${data.caseNo}</span>
        </div>` : ''}
        <div class="detail-row">
          <span class="detail-label">Agent:</span>
          <span class="detail-value">${data.agent}</span>
        </div>
      </div>
    </div>
    </div>

    <div class="bottom-section">
      <div class="items-section">
      <div class="section-title">Item Details (Samaan Ki List)</div>
      <table class="items-table">
        <thead>
          <tr>
            <th class="col-sr">SR</th>
            <th class="col-particulars">PARTICULARS</th>
            <th class="col-pcs">PCS</th>
            <th class="col-rate">RATE</th>
            <th class="col-disc">DISC %</th>
            <th class="col-amount">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <div class="bank-totals-section">
      <div class="bank-details">
        <div class="section-title">Bank Details & Terms & Conditions</div>
        <div class="bank-terms-container">
          <div class="bank-subsection">
            <div class="subsection-title">Bank Details</div>
            <div class="details-grid">
              <div class="detail-row">
                <span class="detail-label">Bank Name:</span>
                <span class="detail-value">${data.bankName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">A/C No.:</span>
                <span class="detail-value">${data.bankAccountNo}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">IFSC Code:</span>
                <span class="detail-value">${data.ifscCode}</span>
              </div>
            </div>
          </div>
          <div class="terms-subsection">
            <div class="subsection-title">Terms & Conditions</div>
            <ol class="terms-list">
              <li>Subject to Surat Jurisdiction.</li>
              <li>Goods have been sold & despatched at the entire risk of the purchaser.</li>
              <li>Complaints regarding this invoice must be informed in writing within 48 hours.</li>
            </ol>
          </div>
        </div>
      </div>

      <div class="totals-section">
        <div class="section-title">Totals & Calculation</div>
        <div class="totals-grid">
          <div class="total-row">
            <span class="total-label">Total PCS:</span>
            <span class="total-value">${data.totalPcs}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Sub Total:</span>
            <span class="total-value">₹${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="total-row grand-total">
            <span class="total-label">Grand Total:</span>
            <span class="total-value">₹${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="amount-in-words">
            <strong>In Words:</strong> ${data.amountInWords}
          </div>
        </div>
      </div>
    </div>

    <div class="signatory-section">
      <div class="signatory-text">For ${data.shopName}</div>
        <div class="signatory-label">(Auth. Signatory)</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
