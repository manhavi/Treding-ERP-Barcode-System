import React from 'react';
import './AFCreationInvoiceTemplate.css';

export interface AFCreationInvoiceItem {
  sr: number;
  particulars: string;
  pcs: number;
  rate: number;
  discPercent: number;
  amount: number;
}

export interface AFCreationInvoiceData {
  // Seller Details
  shopName: string;
  sellerPhones: string;
  sellerAddress: string;
  
  // Buyer Details
  buyerName: string;
  buyerAddress: string;
  
  // Invoice Details
  billNo: string;
  date: string;
  challan: string;
  orderNo?: string;
  
  // Transport Details
  transport: string;
  station: string;
  caseNo?: string;
  agent: string;
  
  // Items
  items: AFCreationInvoiceItem[];
  
  // Bank Details
  bankName: string;
  bankAccountNo: string;
  ifscCode: string;
  
  // Totals
  totalPcs: number;
  subtotal: number;
  grandTotal: number;
  amountInWords: string;
}

interface AFCreationInvoiceTemplateProps {
  data: AFCreationInvoiceData;
}

const AFCreationInvoiceTemplate: React.FC<AFCreationInvoiceTemplateProps> = ({ data }) => {
  return (
    <div className="invoice-container">
      <div className="invoice-wrapper">
        {/* Top 30% Section - Header and 3 Details Sections */}
        <div className="top-section">
          {/* Header - Shree Ganeshaya Namah */}
          <div className="invoice-header">
            <div className="ganeshaya">!! Shree Ganeshaya Namah !!</div>
          </div>

          {/* Company Name */}
          <div className="company-name">{data.shopName}</div>

          {/* Seller Details in Header */}
          <div className="seller-details-header">
            <div className="seller-info-line">{data.sellerPhones}</div>
            <div className="seller-info-line">{data.sellerAddress}</div>
          </div>

          {/* 3 Details Sections in Grid */}
          <div className="details-grid-container">
            {/* Buyer Details Section */}
            <div className="buyer-section">
              <div className="section-title">Buyer Details (Kharidne Wala)</div>
              <div className="details-grid">
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{data.buyerName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">{data.buyerAddress}</span>
                </div>
              </div>
            </div>

            {/* Invoice Details Section */}
            <div className="invoice-details-section">
              <div className="section-title">Invoice Details (Bill Ki Jankari)</div>
              <div className="details-grid">
                <div className="detail-row">
                  <span className="detail-label">Bill No.:</span>
                  <span className="detail-value">{data.billNo}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{data.date}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Challan:</span>
                  <span className="detail-value">{data.challan}</span>
                </div>
                {data.orderNo && (
                  <div className="detail-row">
                    <span className="detail-label">Order No:</span>
                    <span className="detail-value">{data.orderNo}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Transport Details Section */}
            <div className="transport-section">
              <div className="section-title">Transport Details</div>
              <div className="details-grid">
                <div className="detail-row">
                  <span className="detail-label">Transport:</span>
                  <span className="detail-value">{data.transport}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Station:</span>
                  <span className="detail-value">{data.station}</span>
                </div>
                {data.caseNo && (
                  <div className="detail-row">
                    <span className="detail-label">Case No:</span>
                    <span className="detail-value">{data.caseNo}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Agent:</span>
                  <span className="detail-value">{data.agent}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom 70% Section - Items, Bank, Totals, Terms, Signatory */}
        <div className="bottom-section">
          {/* Items Table */}
          <div className="items-section">
            <div className="section-title">Item Details (Samaan Ki List)</div>
            <table className="items-table">
              <thead>
                <tr>
                  <th className="col-sr">SR</th>
                  <th className="col-particulars">PARTICULARS</th>
                  <th className="col-pcs">PCS</th>
                  <th className="col-rate">RATE</th>
                  <th className="col-disc">DISC %</th>
                  <th className="col-amount">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.sr}>
                    <td className="col-sr">{item.sr}</td>
                    <td className="col-particulars">{item.particulars}</td>
                    <td className="col-pcs">{item.pcs}</td>
                    <td className="col-rate">₹{item.rate.toFixed(2)}</td>
                    <td className="col-disc">{item.discPercent.toFixed(2)}</td>
                    <td className="col-amount">₹{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bank Details & Totals Section */}
          <div className="bank-totals-section">
            <div className="bank-details">
              <div className="section-title">Bank Details & Terms & Conditions</div>
              <div className="bank-terms-container">
                <div className="bank-subsection">
                  <div className="subsection-title">Bank Details</div>
                  <div className="details-grid">
                    <div className="detail-row">
                      <span className="detail-label">Bank Name:</span>
                      <span className="detail-value">{data.bankName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">A/C No.:</span>
                      <span className="detail-value">{data.bankAccountNo}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">IFSC Code:</span>
                      <span className="detail-value">{data.ifscCode}</span>
                    </div>
                  </div>
                </div>
                <div className="terms-subsection">
                  <div className="subsection-title">Terms & Conditions</div>
                  <ol className="terms-list">
                    <li>Subject to Surat Jurisdiction.</li>
                    <li>Goods have been sold & despatched at the entire risk of the purchaser.</li>
                    <li>Complaints regarding this invoice must be informed in writing within 48 hours.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="totals-section">
              <div className="section-title">Totals & Calculation</div>
              <div className="totals-grid">
                <div className="total-row">
                  <span className="total-label">Total PCS:</span>
                  <span className="total-value">{data.totalPcs}</span>
                </div>
                <div className="total-row">
                  <span className="total-label">Sub Total:</span>
                  <span className="total-value">₹{data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="total-row grand-total">
                  <span className="total-label">Grand Total:</span>
                  <span className="total-value">₹{data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="amount-in-words">
                  <strong>In Words:</strong> {data.amountInWords}
                </div>
              </div>
            </div>
          </div>

          {/* Signatory */}
          <div className="signatory-section">
            <div className="signatory-text">For {data.shopName}</div>
            <div className="signatory-label">(Auth. Signatory)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AFCreationInvoiceTemplate;
