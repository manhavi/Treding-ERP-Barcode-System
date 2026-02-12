import express from 'express';
import { DispatchModel } from '../models/Dispatch';
import { authenticate, AuthRequest } from '../middleware/auth';
import { emitDispatchCreated } from '../utils/websocket';

const router = express.Router();

router.use(authenticate);

router.post('/', async (req: AuthRequest, res) => {
  try {
    const dispatch = await DispatchModel.create(req.body);
    emitDispatchCreated(dispatch);
    res.json(dispatch);
  } catch (error: any) {
    const statusCode = error.message.includes('not found') || error.message.includes('Insufficient') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to create dispatch' });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const dispatches = await DispatchModel.findAll();
    res.json(dispatches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const dispatch = await DispatchModel.findById(parseInt(req.params.id));
    if (!dispatch) {
      return res.status(404).json({ error: 'Dispatch not found' });
    }
    const items = await DispatchModel.getItems(dispatch.id);
    res.json({ ...dispatch, items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
