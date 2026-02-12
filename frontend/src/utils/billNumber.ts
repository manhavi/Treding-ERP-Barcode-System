/**
 * Bill number format:
 * - Aaradhya Fashion: AF-1001, AF-1002, ...
 * - AF Creation: AFC-11001, AFC-11002, ...
 */

export type BillType = 'aaradhya_fashion' | 'af_creation';

export function formatBillNumber(bill: {
  bill_type: BillType;
  invoice_number: number | null;
  id: number;
}): string {
  if (bill.invoice_number != null) {
    return bill.bill_type === 'aaradhya_fashion'
      ? `AF-${bill.invoice_number}`
      : `AFC-${bill.invoice_number}`;
  }
  return `BILL-${bill.id}`;
}

/** Extract numeric part from bill number string (AF-1001, AFC-11001, INV-1001, BILL-1) for PDF/display */
export function billNumberToDisplayPart(billNumber: string): string {
  return billNumber.replace(/^(AF-|AFC-|INV-|BILL-)/i, '');
}
