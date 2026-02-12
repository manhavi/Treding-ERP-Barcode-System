import express from 'express';
import { BillModel } from '../models/Bill';
import { DispatchModel } from '../models/Dispatch';
import { StaffModel } from '../models/Staff';
import { authenticate, AuthRequest } from '../middleware/auth';
import { emitBillCreated, emitBillUpdated } from '../utils/websocket';

const router = express.Router();

router.use(authenticate);

router.post('/', async (req: AuthRequest, res) => {
  try {
    const bill = await BillModel.create({
      ...req.body,
      created_by: req.userId,
      created_by_role: req.userRole,
    });
    emitBillCreated(bill);
    res.json(bill);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Use efficient JOIN query for admin, regular query for staff
    if (req.userRole === 'admin') {
      const result = await BillModel.findAllWithStaffNames(
        req.userId,
        req.userRole,
        { limit, offset }
      );
      return res.json({
        bills: result.bills,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasMore: result.hasMore
        }
      });
    }
    
    const result = await BillModel.findAll(
      req.userId,
      req.userRole,
      { limit, offset }
    );
    
    res.json({
      bills: result.bills,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasMore: result.hasMore
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const bill = await BillModel.findById(parseInt(req.params.id));
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    const dispatch = await DispatchModel.findById(bill.dispatch_id);
    const items = dispatch ? await DispatchModel.getItems(dispatch.id) : [];
    res.json({ ...bill, items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/pdf', async (req: AuthRequest, res) => {
  try {
    const { pdf_data } = req.body;
    await BillModel.updatePdfData(parseInt(req.params.id), pdf_data);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { party_name, subtotal, gst_amount, total_amount } = req.body;
    const updates: any = {};
    
    if (party_name !== undefined) updates.party_name = party_name;
    if (subtotal !== undefined) updates.subtotal = subtotal;
    if (gst_amount !== undefined) updates.gst_amount = gst_amount;
    if (total_amount !== undefined) updates.total_amount = total_amount;

    const bill = await BillModel.update(parseInt(req.params.id), updates);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    emitBillUpdated(bill);
    res.json(bill);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const deleted = await BillModel.delete(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
