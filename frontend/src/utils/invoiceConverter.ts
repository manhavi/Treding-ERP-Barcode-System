import { BillData, BillItem } from '../services/pdf';
import { InvoiceData, InvoiceItem } from '../components/TaxInvoiceTemplate';
import { numberToWords } from './numberToWords';

// Default company information for Aaradhya Fashion
const DEFAULT_COMPANY_INFO = {
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

export function convertBillDataToInvoiceData(
  billData: BillData,
  additionalInfo?: {
    buyerAddress?: string;
    buyerGstin?: string;
    placeOfSupply?: string;
    transport?: string;
    station?: string;
    agent?: string;
    caseNo?: string;
    weight?: number;
    freight?: number;
    orderNo?: string;
  }
): InvoiceData {
  // Calculate totals
  const totalPcs = billData.items.reduce((sum, item) => sum + item.quantity, 0);
  // Assuming average meter per piece (you may need to adjust this based on actual data)
  const avgMtrPerPiece = 6.3; // This is approximate, adjust based on your data
  const totalMtr = totalPcs * avgMtrPerPiece;

  // Calculate GST (CGST and SGST for intra-state, IGST for inter-state)
  // For now, assuming intra-state (Gujarat) - CGST and SGST
  const gstRate = billData.billType === 'aaradhya_fashion' ? 0.05 : 0;
  const cgstRate = gstRate / 2; // 2.5% each for CGST and SGST
  const sgstRate = gstRate / 2;
  const cgstAmount = billData.subtotal * cgstRate;
  const sgstAmount = billData.subtotal * sgstRate;

  // Convert items to invoice format
  const invoiceItems: InvoiceItem[] = billData.items.map((item, index) => {
    const mtr = item.quantity * avgMtrPerPiece;
    // Format particulars as "D.NO.XXXX" format
    const designNumber = item.design_number.replace(/^D\.?NO\.?/i, '').trim();
    const particulars = `D.NO.${designNumber}${item.color_description ? ' - ' + item.color_description : ''}`;
    
    return {
      sr: index + 1,
      particulars: particulars,
      hsnCode: DEFAULT_COMPANY_INFO.hsn,
      pcs: item.quantity,
      mtr: mtr,
      rate: item.price,
      discPercent: 0,
      amount: item.total,
      igstPercent: 0, // Intra-state, so IGST is 0
      cgstPercent: cgstRate * 100,
      sgstPercent: sgstRate * 100,
    };
  });

  // Format bill number (AF-1001, AFC-11001, INV-xxx, BILL-xxx)
  const billNo = billData.billNumber.replace(/^(AF-|AFC-|INV-|BILL-)/i, '');
  const formattedBillNo = `${billNo}/FM`;

  return {
    // Seller Details
    shopName: DEFAULT_COMPANY_INFO.shopName,
    sellerPhones: DEFAULT_COMPANY_INFO.sellerPhones,
    sellerAddress: DEFAULT_COMPANY_INFO.sellerAddress,
    gstin: DEFAULT_COMPANY_INFO.gstin,
    pan: DEFAULT_COMPANY_INFO.pan,
    udyamNo: DEFAULT_COMPANY_INFO.udyamNo,

    // Buyer Details
    buyerName: billData.partyName,
    buyerAddress: additionalInfo?.buyerAddress || '',
    buyerGstin: additionalInfo?.buyerGstin || '',
    placeOfSupply: additionalInfo?.placeOfSupply || '24-Gujarat',

    // Invoice Details
    billNo: formattedBillNo,
    date: billData.date,
    challan: formattedBillNo,
    orderNo: additionalInfo?.orderNo || '',

    // Transport Details
    transport: additionalInfo?.transport || 'DIAMOND TRANSPORT',
    station: additionalInfo?.station || '',
    lrDate: billData.date,
    caseNo: additionalInfo?.caseNo || '',
    weight: additionalInfo?.weight || 0,
    freight: additionalInfo?.freight || 0,
    agent: additionalInfo?.agent || 'DIRECT',

    // Items
    items: invoiceItems,

    // Bank Details
    bankName: DEFAULT_COMPANY_INFO.bankName,
    bankAccountNo: DEFAULT_COMPANY_INFO.bankAccountNo,
    ifscCode: DEFAULT_COMPANY_INFO.ifscCode,

    // Totals
    totalPcs,
    totalMtr,
    subtotal: billData.subtotal,
    cgstAmount,
    sgstAmount,
    grandTotal: billData.totalAmount,
    amountInWords: numberToWords(Math.round(billData.totalAmount)),
  };
}
