import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { PartyModel } from '../models/Party';
import { authenticate, AuthRequest } from '../middleware/auth';
import { emitPartyCreated, emitPartyUpdated, emitPartyDeleted } from '../utils/websocket';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

// Download sample/template XL for upload testing (headers + example row)
router.get('/export-sample', async (_req: AuthRequest, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Name', 'Address', 'GSTIN', 'Phone', 'Alternate Phone', 'Place of Supply', 'Transport', 'Station', 'Agent'],
      ['Sample Party', '123 Main St, City', '24AABCU9603R1ZM', '9876543210', '', '24-Gujarat', '', '', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Parties');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=parties-upload-sample.xlsx');
    res.send(buf);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Sample export failed' });
  }
});

// Export parties to Excel (must be before /:id)
router.get('/export', async (_req: AuthRequest, res) => {
  try {
    const rows = await PartyModel.getExportRows();
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Name', 'Address', 'GSTIN', 'Phone', 'Alternate Phone', 'Place of Supply', 'Transport', 'Station', 'Agent'],
      ...rows.map((r) => [
        r.name,
        r.address,
        r.gstin || '',
        r.phone,
        r.alternate_phone || '',
        r.place_of_supply || '',
        r.transport || '',
        r.station || '',
        r.agent || '',
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Parties');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=parties-export.xlsx');
    res.send(buf);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Export failed' });
  }
});

// Import parties from Excel
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
    const normalize = (s: string) => String(s).toLowerCase().replace(/[\s_/()-]/g, '');
    const col = (key: string) => rawHeaders.find((h) => normalize(h).includes(normalize(key)) || normalize(h) === normalize(key));
    const nameCol = col('name') ?? rawHeaders[0];
    const addressCol = col('address') ?? rawHeaders[1];
    const gstinCol = col('gstin') ?? rawHeaders[2];
    const phoneCol = col('phone') ?? rawHeaders[3];
    const altPhoneCol = col('alternate') ?? col('alt phone') ?? rawHeaders[4];
    const posCol = col('place of supply') ?? col('place_of_supply') ?? rawHeaders[5];
    const transportCol = col('transport') ?? rawHeaders[6];
    const stationCol = col('station') ?? rawHeaders[7];
    const agentCol = col('agent') ?? rawHeaders[8];
    const rows = data.map((row) => ({
      name: row[nameCol] != null ? String(row[nameCol]).trim() : '',
      address: row[addressCol] != null ? String(row[addressCol]).trim() : '',
      gstin: row[gstinCol] != null ? String(row[gstinCol]).trim() : '',
      phone: row[phoneCol] != null ? String(row[phoneCol]).trim() : '',
      alternate_phone: row[altPhoneCol] != null ? String(row[altPhoneCol]).trim() : '',
      place_of_supply: row[posCol] != null ? String(row[posCol]).trim() : '',
      transport: row[transportCol] != null ? String(row[transportCol]).trim() : '',
      station: row[stationCol] != null ? String(row[stationCol]).trim() : '',
      agent: row[agentCol] != null ? String(row[agentCol]).trim() : '',
    }));
    const result = await PartyModel.importFromRows(rows);
    res.json({
      message: `Import complete: ${result.created} created, ${result.updated} updated`,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Import failed' });
  }
});

// Create or update party
router.post('/', async (req: AuthRequest, res) => {
  try {
    const party = await PartyModel.create(req.body);
    emitPartyCreated(party);
    res.json(party);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Search parties
router.get('/search', async (req: AuthRequest, res) => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.trim() === '') {
      return res.json([]);
    }
    
    const parties = await PartyModel.search(query);
    res.json(parties);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all parties (with pagination support)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
    
    const result = await PartyModel.findAll({ limit, offset });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get party by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const party = await PartyModel.findById(parseInt(req.params.id));
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }
    res.json(party);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update party
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const party = await PartyModel.update(parseInt(req.params.id), req.body);
    emitPartyUpdated(party);
    res.json(party);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete party
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const partyId = parseInt(req.params.id);
    await PartyModel.delete(partyId);
    emitPartyDeleted(partyId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
