import db from '../database/db';
import { ProductModel } from './Product';

export interface Dispatch {
  id: number;
  party_name: string;
  dispatch_date: string;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface DispatchItem {
  id: number;
  dispatch_id: number;
  product_id: number;
  quantity: number;
  scanned_barcode: string;
  created_at: string;
}

export interface CreateDispatchInput {
  party_name: string;
  items: Array<{
    barcode: string;
    quantity: number;
  }>;
}

export class DispatchModel {
  static async create(input: CreateDispatchInput): Promise<Dispatch> {
    // Validate input
    if (!input.party_name || input.party_name.trim() === '') {
      throw new Error('Party name is required');
    }
    
    if (!input.items || input.items.length === 0) {
      throw new Error('At least one item is required');
    }
    
    const stmt = db.prepare(`
      INSERT INTO dispatches (party_name)
      VALUES (?)
    `);
    
    const result = await stmt.run(input.party_name);
    const dispatchId = result.lastInsertRowid;

    // Add items
    const itemStmt = db.prepare(`
      INSERT INTO dispatch_items (dispatch_id, product_id, quantity, scanned_barcode)
      VALUES (?, ?, ?, ?)
    `);

    for (const item of input.items) {
      const product = await ProductModel.findByBarcode(item.barcode);
      if (!product) {
        throw new Error(`Product with barcode ${item.barcode} not found`);
      }
      
      // No stock validation - unlimited products can be dispatched
      // Stock maintenance is disabled, so we don't check or update stock
      
      await itemStmt.run(dispatchId, product.id, item.quantity, item.barcode);
      // Note: Stock is not reduced since stock maintenance is disabled
    }

    return (await this.findById(dispatchId))!;
  }

  static async findById(id: number): Promise<Dispatch | null> {
    const stmt = db.prepare('SELECT * FROM dispatches WHERE id = ?');
    return (await stmt.get(id)) as Dispatch | null;
  }

  static async findAll(): Promise<Dispatch[]> {
    const stmt = db.prepare('SELECT * FROM dispatches ORDER BY created_at DESC');
    return (await stmt.all()) as Dispatch[];
  }

  static async getItems(dispatchId: number): Promise<Array<DispatchItem & { product: any }>> {
    const stmt = db.prepare(`
      SELECT di.*, p.design_number, p.color_description, p.barcode, p.selling_price
      FROM dispatch_items di
      JOIN products p ON di.product_id = p.id
      WHERE di.dispatch_id = ?
    `);
    return (await stmt.all(dispatchId)) as Array<DispatchItem & { product: any }>;
  }

  static async complete(dispatchId: number): Promise<void> {
    const stmt = db.prepare('UPDATE dispatches SET status = ?, dispatch_date = CURRENT_TIMESTAMP WHERE id = ?');
    await stmt.run('completed', dispatchId);
  }
}
