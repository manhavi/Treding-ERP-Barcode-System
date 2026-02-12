import JsBarcode from 'jsbarcode';

/** TSC printer ke liye label size (mm). Physical product label pe chipkane ke liye. */
export interface TSCLabelOptions {
  widthMm?: number;
  heightMm?: number;
  /** Barcode height in mm (scan ke liye sahi size) */
  barcodeHeightMm?: number;
  /** Show design number & colour text below barcode */
  showText?: boolean;
}

const DEFAULT_TSC_LABEL: Required<TSCLabelOptions> = {
  widthMm: 40,
  heightMm: 25,
  barcodeHeightMm: 12,
  showText: true,
};

export function generateBarcode(designNumber: string): string {
  return designNumber.replace(/\s+/g, '').toUpperCase();
}

export function createBarcodeSVG(barcode: string, elementId: string): void {
  const element = document.getElementById(elementId);
  if (element) {
    JsBarcode(element, barcode, {
      format: 'CODE128',
      width: 2,
      height: 50,
      displayValue: true,
      fontSize: 14,
    });
  }
}

/** Single barcode – TSC label size (40x25mm default), scan-friendly CODE128 */
export function printBarcodeLabelTSC(
  barcode: string,
  designNumber: string,
  color: string,
  options: TSCLabelOptions = {}
): void {
  const opts = { ...DEFAULT_TSC_LABEL, ...options };
  const w = opts.widthMm;
  const h = opts.heightMm;
  const bh = opts.barcodeHeightMm;
  // ~11.8 px per mm at 96dpi screen; for print 300dpi we use mm in CSS so printer uses actual mm
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const escapedBarcode = barcode.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Barcode - ${designNumber}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          @page { size: ${w}mm ${h}mm; margin: 0; }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          .label {
            width: ${w}mm;
            height: ${h}mm;
            box-sizing: border-box;
            padding: 1mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-after: always;
          }
          .label:last-child { page-break-after: auto; }
          .label svg { max-width: 100%; height: ${bh}mm; }
          .label-text { font-size: 2.2mm; text-align: center; margin-top: 0.5mm; line-height: 1.2; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .label { page-break-after: always; }
            .label:last-child { page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <svg id="bc"></svg>
          ${opts.showText ? `<div class="label-text">${designNumber} | ${color}</div>` : ''}
        </div>
        <script>
          JsBarcode('#bc', '${escapedBarcode}', {
            format: 'CODE128',
            width: 1.2,
            height: 48,
            displayValue: false,
            margin: 0,
          });
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
}

/** Multiple barcodes – ek hi print run me sab labels (har label alag page pe, TSC ke liye) */
export function printMultipleBarcodeLabelsTSC(
  items: Array<{ barcode: string; designNumber: string; color: string }>,
  options: TSCLabelOptions = {}
): void {
  if (items.length === 0) return;
  const opts = { ...DEFAULT_TSC_LABEL, ...options };
  const w = opts.widthMm;
  const h = opts.heightMm;
  const bh = opts.barcodeHeightMm;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const labelDivs = items
    .map(
      (item, i) => {
        const esc = (x: string) => x.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `
        <div class="label" data-idx="${i}">
          <svg id="bc-${i}"></svg>
          ${opts.showText ? `<div class="label-text">${item.designNumber} | ${item.color}</div>` : ''}
        </div>`;
      }
    )
    .join('');

  const scriptParts = items
    .map(
      (item, i) =>
        `JsBarcode('#bc-${i}', '${item.barcode.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', {
          format: 'CODE128',
          width: 1.2,
          height: 48,
          displayValue: false,
          margin: 0,
        });`
    )
    .join('\n');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Barcode Labels (${items.length})</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          @page { size: ${w}mm ${h}mm; margin: 0; }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          .label {
            width: ${w}mm;
            height: ${h}mm;
            box-sizing: border-box;
            padding: 1mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-after: always;
          }
          .label:last-child { page-break-after: auto; }
          .label svg { max-width: 100%; height: ${bh}mm; }
          .label-text { font-size: 2.2mm; text-align: center; margin-top: 0.5mm; line-height: 1.2; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .label { page-break-after: always; }
            .label:last-child { page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        ${labelDivs}
        <script>
          ${scriptParts}
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printBarcode(barcode: string, designNumber: string, color: string): void {
  printBarcodeLabelTSC(barcode, designNumber, color, DEFAULT_TSC_LABEL);
}
