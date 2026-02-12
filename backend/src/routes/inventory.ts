import express from 'express';
import { ProductModel } from '../models/Product';
import { authenticate, AuthRequest } from '../middleware/auth';
import { emitInventoryUpdated, emitInventoryDeleted } from '../utils/websocket';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const search = req.query.search as string | undefined;
    const products = await ProductModel.findAll(search);
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const product = await ProductModel.findById(parseInt(req.params.id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/barcode/:barcode', async (req: AuthRequest, res) => {
  try {
    const product = await ProductModel.findByBarcode(req.params.barcode);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { color_description, selling_price, stock_quantity } = req.body;
    
    const updates: any = {};
    if (color_description !== undefined) updates.color_description = color_description;
    if (selling_price !== undefined) updates.selling_price = selling_price;
    if (stock_quantity !== undefined) updates.stock_quantity = stock_quantity;

    const product = await ProductModel.update(id, updates);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    emitInventoryUpdated(product);
    res.json(product);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await ProductModel.delete(id);
    emitInventoryDeleted(id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
