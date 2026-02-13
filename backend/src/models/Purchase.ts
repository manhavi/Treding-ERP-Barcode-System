import db from '../database/db';
import { ProductModel } from './Product';

export interface Purchase {
  id: number;
  product_id: number;
  purchase_date: string;
  purchase_price: number;
  quantity: number;
  created_at: string;
}

export interface CreatePurchaseInput {
  design_number: string;
  color_description: string;
  selling_price: number;
  purchase_price: number;
  quantity?: number; // Optional - no stock maintenance
}

export class PurchaseModel {
  static async create(input: CreatePurchaseInput): Promise<Purchase> {
    // Validate input
    if (!input.design_number || input.design_number.trim() === '') {
      throw new Error('Design number is required');
    }
    if (!input.color_description || input.color_description.trim() === '') {
      throw new Error('Color description is required');
    }
    if (input.selling_price <= 0) {
      throw new Error('Selling price must be greater than 0');
    }
    if (input.purchase_price <= 0) {
      throw new Error('Purchase price must be greater than 0');
    }
    // Quantity is optional - default to 0 (no stock maintenance)
    const quantity = input.quantity || 0;
    
    // Check if product exists
    let product = await ProductModel.findByDesignNumber(input.design_number);
    
    if (!product) {
      // Create new product (no stock maintenance - quantity = 0)
      product = await ProductModel.create({
        design_number: input.design_number,
        color_description: input.color_description,
        selling_price: input.selling_price,
        quantity: 0 // No stock maintenance
      });
    }
    // Note: We don't update stock since we're not maintaining stock

    // Create purchase record
    const stmt = db.prepare(`
      INSERT INTO purchases (product_id, purchase_price, quantity)
      VALUES (?, ?, ?)
    `);
    
    const result = await stmt.run(
      product.id,
      input.purchase_price,
      quantity
    );

    return (await this.findById(result.lastInsertRowid))!;
  }

  static async findById(id: number): Promise<Purchase | null> {
    const stmt = db.prepare('SELECT * FROM purchases WHERE id = ?');
    return (await stmt.get(id)) as Purchase | null;
  }

  static async findAll(): Promise<Purchase[]> {
    const stmt = db.prepare(`
      SELECT p.*, pr.design_number, pr.color_description, pr.barcode
      FROM purchases p
      JOIN products pr ON p.product_id = pr.id
      ORDER BY p.created_at DESC
    `);
    return (await stmt.all()) as Purchase[];
  }

  /** Get latest purchase for a product (for upsert/export) */
  static async getLatestByProductId(productId: number): Promise<Purchase | null> {
    const stmt = db.prepare(`
      SELECT * FROM purchases WHERE product_id = ? ORDER BY created_at DESC LIMIT 1
    `);
    return (await stmt.get(productId)) as Purchase | null;
  }

  /** Update purchase record (for import upsert) */
  static async update(id: number, updates: { purchase_price?: number; quantity?: number }): Promise<Purchase | null> {
    const purchase = await this.findById(id);
    if (!purchase) return null;
    const purchase_price = updates.purchase_price ?? purchase.purchase_price;
    const quantity = updates.quantity ?? purchase.quantity;
    const stmt = db.prepare('UPDATE purchases SET purchase_price = ?, quantity = ? WHERE id = ?');
    await stmt.run(purchase_price, quantity, id);
    return this.findById(id);
  }

  /** Export data: one row per product with latest purchase (for Excel) */
  static async getExportRows(): Promise<Array<{
    design_number: string;
    color_description: string;
    barcode: string;
    selling_price: number;
    purchase_price: number;
    quantity: number;
  }>> {
    const stmt = db.prepare(`
      WITH latest_purchase AS (
        SELECT product_id, MAX(created_at) AS created_at FROM purchases GROUP BY product_id
      )
      SELECT pr.design_number, pr.color_description, pr.barcode, pr.selling_price, p.purchase_price, p.quantity
      FROM purchases p
      JOIN products pr ON pr.id = p.product_id
      JOIN latest_purchase lp ON lp.product_id = p.product_id AND lp.created_at = p.created_at
      ORDER BY pr.design_number
    `);
    return (await stmt.all()) as any[];
  }

  /** Import rows: upsert product by design_number, update or create purchase.
   *  After import, inventory is synced to the file: any product NOT in the file is removed,
   *  so total inventory = exactly the rows in the uploaded XL. */
  static async importFromRows(rows: Array<{
    design_number: string;
    color_description: string;
    selling_price: number;
    purchase_price: number;
    quantity?: number;
  }>): Promise<{ created: number; updated: number; deleted: number; errors: string[] }> {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    const importedDesignNumbers = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-based + header
      if (!row.design_number || String(row.design_number).trim() === '') {
        errors.push(`Row ${rowNum}: Design number is required`);
        continue;
      }
      const design_number = String(row.design_number).trim();
      const color_description = String(row.color_description ?? '').trim() || 'N/A';
      const selling_price = Number(row.selling_price);
      const purchase_price = Number(row.purchase_price);
      const quantity = Number(row.quantity) || 0;
      if (isNaN(selling_price) || selling_price <= 0) {
        errors.push(`Row ${rowNum}: Valid selling price required`);
        continue;
      }
      if (isNaN(purchase_price) || purchase_price <= 0) {
        errors.push(`Row ${rowNum}: Valid purchase price required`);
        continue;
      }
      try {
        let product = await ProductModel.findByDesignNumber(design_number);
        if (!product) {
          await this.create({ design_number, color_description, selling_price, purchase_price, quantity });
          created++;
        } else {
          await ProductModel.update(product.id, { color_description, selling_price });
          const latest = await this.getLatestByProductId(product.id);
          if (latest) {
            await this.update(latest.id, { purchase_price, quantity });
            updated++;
          } else {
            const stmt = db.prepare(`
              INSERT INTO purchases (product_id, purchase_price, quantity) VALUES (?, ?, ?)
            `);
            await stmt.run(product.id, purchase_price, quantity);
            created++;
          }
        }
        importedDesignNumbers.add(design_number);
      } catch (e: any) {
        errors.push(`Row ${rowNum}: ${e.message || 'Failed'}`);
      }
    }
    // Sync inventory to file: remove products that are NOT in the imported list (so inventory = exactly XL rows)
    let deleted = 0;
    if (importedDesignNumbers.size > 0) {
      const placeholders = Array.from(importedDesignNumbers).map(() => '?').join(',');
      const stmt = db.prepare(
        `DELETE FROM products WHERE design_number NOT IN (${placeholders})`
      );
      const result = await stmt.run(...Array.from(importedDesignNumbers));
      deleted = result.changes ?? 0;
    }
    return { created, updated, deleted, errors };
  }
}
