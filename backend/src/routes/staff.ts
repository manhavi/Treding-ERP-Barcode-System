import express from 'express';
import { StaffModel } from '../models/Staff';
import { authenticate, AuthRequest } from '../middleware/auth';
import { emitStaffCreated, emitStaffUpdated, emitStaffDeleted } from '../utils/websocket';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Check if user is admin
const isAdmin = (req: AuthRequest): boolean => {
  return req.userRole === 'admin';
};

// Get all staff (admin only)
router.get('/', async (req: AuthRequest, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const staff = await StaffModel.findAll();
    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get staff by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const staff = await StaffModel.findById(parseInt(req.params.id));
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create staff (admin only)
router.post('/', async (req: AuthRequest, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const staff = await StaffModel.create(req.body);
    emitStaffCreated(staff);
    res.json(staff);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update staff (admin only)
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const staff = await StaffModel.update(parseInt(req.params.id), req.body);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    emitStaffUpdated(staff);
    res.json(staff);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete staff (admin only)
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const staffId = parseInt(req.params.id);
    await StaffModel.delete(staffId);
    emitStaffDeleted(staffId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
