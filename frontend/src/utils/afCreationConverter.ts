import { BillData } from '../services/pdf';
import { AFCreationInvoiceData, AFCreationInvoiceItem } from '../components/AFCreationInvoiceTemplate';
import { numberToWords } from './numberToWords';

// Default company information for AF Creation
const DEFAULT_AF_CREATION_INFO = {
  shopName: 'AF CREATION',
  sellerPhones: '8000984453, 9725251414',
  sellerAddress: 'Shop No. O-27, Bombay Market, Godown-BB-02 Bombay Market, Surat',
  bankName: 'TMB BANK',
  bankAccountNo: '11915031087556',
  ifscCode: 'TMBL0000119',
};

export function convertBillDataToAFCreationInvoiceData(
  billData: BillData,
  additionalInfo?: {
    buyerAddress?: string;
    transport?: string;
    station?: string;
    agent?: string;
    caseNo?: string;
    orderNo?: string;
  }
): AFCreationInvoiceData {
  // Calculate totals
  const totalPcs = billData.items.reduce((sum, item) => sum + item.quantity, 0);

  // Convert items to invoice format (without GST fields)
  const invoiceItems: AFCreationInvoiceItem[] = billData.items.map((item, index) => {
    // Format particulars as "D.NO.XXXX" format
    const designNumber = item.design_number.replace(/^D\.?NO\.?/i, '').trim();
    const particulars = `D.NO.${designNumber}${item.color_description ? ' - ' + item.color_description : ''}`;
    
    return {
      sr: index + 1,
      particulars: particulars,
      pcs: item.quantity,
      rate: item.price,
      discPercent: 0,
      amount: item.total,
    };
  });

  // Format bill number (AF-1001, AFC-11001, INV-xxx, BILL-xxx)
  const billNo = billData.billNumber.replace(/^(AF-|AFC-|INV-|BILL-)/i, '');
  const formattedBillNo = `${billNo}/FM`;

  return {
    // Seller Details
    shopName: DEFAULT_AF_CREATION_INFO.shopName,
    sellerPhones: DEFAULT_AF_CREATION_INFO.sellerPhones,
    sellerAddress: DEFAULT_AF_CREATION_INFO.sellerAddress,

    // Buyer Details
    buyerName: billData.partyName,
    buyerAddress: additionalInfo?.buyerAddress || '',

    // Invoice Details
    billNo: formattedBillNo,
    date: billData.date,
    challan: formattedBillNo,
    orderNo: additionalInfo?.orderNo || '',

    // Transport Details
    transport: additionalInfo?.transport || 'DIAMOND TRANSPORT',
    station: additionalInfo?.station || '',
    caseNo: additionalInfo?.caseNo || '',
    agent: additionalInfo?.agent || 'DIRECT',

    // Items
    items: invoiceItems,

    // Bank Details
    bankName: DEFAULT_AF_CREATION_INFO.bankName,
    bankAccountNo: DEFAULT_AF_CREATION_INFO.bankAccountNo,
    ifscCode: DEFAULT_AF_CREATION_INFO.ifscCode,

    // Totals (no GST)
    totalPcs,
    subtotal: billData.subtotal,
    grandTotal: billData.totalAmount,
    amountInWords: numberToWords(Math.round(billData.totalAmount)),
  };
}
