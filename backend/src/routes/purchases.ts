import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { PurchaseModel } from '../models/Purchase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { emitPurchaseCreated } from '../utils/websocket';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

router.use(authenticate);

// Export purchases to Excel – only 4 columns: Design Number, Colour, Selling Price, Purchase Price
router.get('/export', async (_req: AuthRequest, res) => {
  try {
    const rows = await PurchaseModel.getExportRows();
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Design Number', 'Colour', 'Selling Price (₹)', 'Purchase Price (₹)'],
      ...rows.map((r) => [
        r.design_number,
        r.color_description,
        r.selling_price,
        r.purchase_price,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=purchases-export.xlsx');
    res.send(buf);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Export failed' });
  }
});

// Import purchases from Excel
router.post('/import', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'No file uploaded. Use form field name: file' });
    }
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheet = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheet];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    if (!data.length) {
      return res.status(400).json({ error: 'Excel file has no data rows' });
    }
    const rawHeaders = Object.keys(data[0] || {});
    const normalize = (s: string) => String(s).toLowerCase().replace(/[\s_/()₹]/g, '');
    const col = (key: string) => rawHeaders.find((h) => normalize(h).includes(normalize(key)) || normalize(h) === normalize(key));
    // Only 4 columns: Design Number, Colour, Selling Price, Purchase Price
    const designCol = col('design number') ?? col('design_number') ?? rawHeaders[0];
    const colorCol = col('colour') ?? col('color') ?? col('description') ?? col('color_description') ?? rawHeaders[1];
    const sellingCol = col('selling price') ?? col('selling_price') ?? rawHeaders[2];
    const purchaseCol = col('purchase price') ?? col('purchase_price') ?? rawHeaders[3];
    const rows = data
      .map((row) => {
        const design_number = row[designCol] != null ? String(row[designCol]).trim() : '';
        if (!design_number) return null;
        return {
          design_number,
          color_description: (row[colorCol] != null ? String(row[colorCol]).trim() : '') || 'N/A',
          selling_price: Number(row[sellingCol]),
          purchase_price: Number(row[purchaseCol]),
          quantity: 0,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);
    const result = await PurchaseModel.importFromRows(rows as any);
    let message = `Import complete: ${result.created} created, ${result.updated} updated`;
    if (result.deleted > 0) {
      message += `, ${result.deleted} removed (inventory synced to file – only ${result.created + result.updated} products now)`;
    }
    res.json({
      message,
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      errors: result.errors,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Import failed' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const purchase = await PurchaseModel.create(req.body);
    emitPurchaseCreated(purchase);
    res.json(purchase);
  } catch (error: any) {
    const statusCode = error.message.includes('required') || error.message.includes('must be') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to create purchase' });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const purchases = await PurchaseModel.findAll();
    res.json(purchases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const purchase = await PurchaseModel.findById(parseInt(req.params.id));
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }
    res.json(purchase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
