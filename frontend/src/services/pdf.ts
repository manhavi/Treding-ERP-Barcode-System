import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { convertBillDataToInvoiceData } from '../utils/invoiceConverter';
import { generateInvoiceHTML } from '../utils/invoiceHtmlGenerator';
import { convertBillDataToAFCreationInvoiceData } from '../utils/afCreationConverter';
import { generateAFCreationInvoiceHTML } from '../utils/afCreationHtmlGenerator';

export interface BillItem {
  design_number: string;
  color_description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface BillData {
  billNumber: string;
  billType: 'aaradhya_fashion' | 'af_creation';
  partyName: string;
  date: string;
  items: BillItem[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
}

// Helper function to generate PDF content
function generatePDFContent(doc: jsPDF, data: BillData): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = margin;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.billType === 'aaradhya_fashion' ? 'Aaradhya Fashion' : 'AF Creation', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Lehenga Choli Business', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Bill details
  doc.setFontSize(10);
  doc.text(`Bill No: ${data.billNumber}`, margin, yPos);
  doc.text(`Date: ${data.date}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 8;
  doc.text(`Party Name: ${data.partyName}`, margin, yPos);
  yPos += 15;

  // Items table header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Design', margin, yPos);
  doc.text('Color', margin + 50, yPos);
  doc.text('Qty', margin + 100, yPos);
  doc.text('Price', margin + 120, yPos);
  doc.text('Total', pageWidth - margin, yPos, { align: 'right' });
  yPos += 8;

  // Items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  data.items.forEach((item) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(item.design_number, margin, yPos);
    doc.text(item.color_description.substring(0, 15), margin + 50, yPos);
    doc.text(item.quantity.toString(), margin + 100, yPos);
    doc.text(`₹${item.price.toFixed(2)}`, margin + 120, yPos);
    doc.text(`₹${item.total.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;
  });

  yPos += 5;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Totals
  doc.setFont('helvetica', 'bold');
  doc.text(`Subtotal: ₹${data.subtotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 8;

  if (data.billType === 'aaradhya_fashion' && data.gstAmount > 0) {
    doc.text(`GST (5%): ₹${data.gstAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;
  }

  doc.setFontSize(12);
  doc.text(`Total: ₹${data.totalAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });

  // Footer
  yPos = doc.internal.pageSize.getHeight() - 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });
}

export function generateBillPDF(data: BillData): string {
  const doc = new jsPDF();
  generatePDFContent(doc, data);
  const pdfString = doc.output('datauristring');
  return pdfString;
}

export function downloadBillPDF(data: BillData, filename: string): void {
  const doc = new jsPDF();
  generatePDFContent(doc, data);
  doc.save(filename);
}

// New functions for Tax Invoice using HTML template
export async function generateTaxInvoicePDF(
  data: BillData,
  additionalInfo?: {
    buyerAddress?: string;
    buyerGstin?: string;
    placeOfSupply?: string;
    transport?: string;
    station?: string;
    agent?: string;
  }
): Promise<string> {
  // Use appropriate template based on bill type
  let htmlContent: string;
  
  if (data.billType === 'aaradhya_fashion') {
    const invoiceData = convertBillDataToInvoiceData(data, additionalInfo);
    htmlContent = generateInvoiceHTML(invoiceData);
  } else {
    // AF Creation - without GST
    const afCreationData = convertBillDataToAFCreationInvoiceData(data, additionalInfo);
    htmlContent = generateAFCreationInvoiceHTML(afCreationData);
  }
  
  // Create a temporary iframe to render HTML (height set after content loads so 1 page = 1 sheet when few items)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
  iframe.style.height = 'auto'; // will be set to content height after load
  iframe.style.minHeight = '100px';
  document.body.appendChild(iframe);

  // Check if we're in browser environment
  if (typeof document === 'undefined' || !document.body) {
    console.warn('PDF generation: Not in browser environment, falling back to simple PDF');
    return generateBillPDF(data);
  }

  return new Promise((resolve, reject) => {
    // Timeout after 15 seconds
    const timeout = setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      reject(new Error('PDF generation timeout - took too long'));
    }, 15000);

    const cleanup = () => {
      clearTimeout(timeout);
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    };

    iframe.onload = async () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error('Could not access iframe document');
        }

        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        // Wait for content to render
        await new Promise(resolve => setTimeout(resolve, 800));

        // Use actual content height so short invoices use 1 A4 page only; more items = more pages as needed
        const bodyEl = iframeDoc.body;
        const contentHeightPx = Math.max(100, bodyEl.scrollHeight);
        iframe.style.height = contentHeightPx + 'px';
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(bodyEl, {
          scale: 1.5,
          useCORS: true,
          logging: false,
          width: 794, // A4 width in px at 96 DPI
          height: contentHeightPx, // actual content height, not full A4
          allowTaint: true,
          imageTimeout: 0,
        });

        // Convert canvas to PDF: one page if content fits, else multiple A4 pages
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let pageIndex = 0;

        pdf.addImage(imgData, 'JPEG', 0, -pageIndex * pageHeight, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        pageIndex++;

        while (heightLeft > 0) {
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, -pageIndex * pageHeight, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          pageIndex++;
        }

        const pdfString = pdf.output('datauristring');
        cleanup();
        resolve(pdfString);
      } catch (error: any) {
        cleanup();
        console.error('PDF generation error:', error);
        reject(new Error(`PDF generation failed: ${error.message || 'Unknown error'}`));
      }
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error('Failed to load iframe'));
    };

    // Trigger load
    try {
      iframe.src = 'about:blank';
      // Fallback: if onload doesn't fire, try after timeout
      setTimeout(() => {
        if (iframe.contentDocument) {
          iframe.onload?.(new Event('load') as any);
        }
      }, 1000);
    } catch (error: any) {
      cleanup();
      reject(new Error(`Failed to create iframe: ${error.message}`));
    }
  });
}

export async function downloadTaxInvoicePDF(
  data: BillData,
  filename: string,
  additionalInfo?: {
    buyerAddress?: string;
    buyerGstin?: string;
    placeOfSupply?: string;
    transport?: string;
    station?: string;
    agent?: string;
  }
): Promise<void> {
  // Use appropriate template based on bill type
  let htmlContent: string;
  
  if (data.billType === 'aaradhya_fashion') {
    const invoiceData = convertBillDataToInvoiceData(data, additionalInfo);
    htmlContent = generateInvoiceHTML(invoiceData);
  } else {
    // AF Creation - without GST
    const afCreationData = convertBillDataToAFCreationInvoiceData(data, additionalInfo);
    htmlContent = generateAFCreationInvoiceHTML(afCreationData);
  }
  
  // Create a temporary iframe to render HTML (height set after content loads)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
  iframe.style.height = 'auto';
  iframe.style.minHeight = '100px';
  document.body.appendChild(iframe);

  return new Promise((resolve, reject) => {
    iframe.onload = async () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error('Could not access iframe document');
        }

        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        await new Promise(resolve => setTimeout(resolve, 800));

        const bodyEl = iframeDoc.body;
        const contentHeightPx = Math.max(100, bodyEl.scrollHeight);
        iframe.style.height = contentHeightPx + 'px';
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(bodyEl, {
          scale: 1.5,
          useCORS: true,
          logging: false,
          width: 794,
          height: contentHeightPx,
          allowTaint: true,
          imageTimeout: 0,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let pageIndex = 0;

        pdf.addImage(imgData, 'JPEG', 0, -pageIndex * pageHeight, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        pageIndex++;

        while (heightLeft > 0) {
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, -pageIndex * pageHeight, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          pageIndex++;
        }

        pdf.save(filename);
        document.body.removeChild(iframe);
        resolve();
      } catch (error) {
        document.body.removeChild(iframe);
        reject(error);
      }
    };

    iframe.onerror = () => {
      document.body.removeChild(iframe);
      reject(new Error('Failed to load iframe'));
    };

    // Trigger load
    iframe.src = 'about:blank';
  });
}
