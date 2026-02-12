import db from '../database/db';

export interface Product {
  id: number;
  design_number: string;
  barcode: string;
  color_description: string;
  selling_price: number;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  design_number: string;
  color_description: string;
  selling_price: number;
  quantity?: number;
}

export class ProductModel {
  static generateBarcode(designNumber: string): string {
    // Remove spaces and convert to uppercase
    const cleaned = designNumber.replace(/\s+/g, '').toUpperCase();
    return cleaned;
  }

  static async create(input: CreateProductInput): Promise<Product> {
    const barcode = this.generateBarcode(input.design_number);
    
    const stmt = db.prepare(`
      INSERT INTO products (design_number, barcode, color_description, selling_price, stock_quantity)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = await stmt.run(
      input.design_number,
      barcode,
      input.color_description,
      input.selling_price,
      input.quantity || 0
    );

    return (await this.findById(result.lastInsertRowid))!;
  }

  static async findById(id: number): Promise<Product | null> {
    const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
    return (await stmt.get(id)) as Product | null;
  }

  static async findByBarcode(barcode: string): Promise<Product | null> {
    const stmt = db.prepare('SELECT * FROM products WHERE barcode = ?');
    return (await stmt.get(barcode)) as Product | null;
  }

  static async findByDesignNumber(designNumber: string): Promise<Product | null> {
    const stmt = db.prepare('SELECT * FROM products WHERE design_number = ?');
    return (await stmt.get(designNumber)) as Product | null;
  }

  static async findAll(search?: string): Promise<Product[]> {
    if (search) {
      const stmt = db.prepare(`
        SELECT * FROM products 
        WHERE design_number LIKE ? OR color_description LIKE ? OR barcode LIKE ?
        ORDER BY created_at DESC
      `);
      const searchTerm = `%${search}%`;
      return (await stmt.all(searchTerm, searchTerm, searchTerm)) as Product[];
    }
    const stmt = db.prepare('SELECT * FROM products ORDER BY created_at DESC');
    return (await stmt.all()) as Product[];
  }

  static async updateStock(id: number, quantity: number): Promise<void> {
    const product = await this.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    
    // Prevent negative stock
    const newStock = product.stock_quantity + quantity;
    if (newStock < 0) {
      throw new Error(`Insufficient stock. Current stock: ${product.stock_quantity}, cannot reduce by ${Math.abs(quantity)}`);
    }
    
    const stmt = db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    await stmt.run(quantity, id);
  }

  static async update(id: number, updates: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<Product | null> {
    const product = await this.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.color_description !== undefined) {
      fields.push('color_description = ?');
      values.push(updates.color_description);
    }
    if (updates.selling_price !== undefined) {
      fields.push('selling_price = ?');
      values.push(updates.selling_price);
    }
    if (updates.stock_quantity !== undefined) {
      fields.push('stock_quantity = ?');
      values.push(updates.stock_quantity);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`);
    await stmt.run(...values);

    return this.findById(id);
  }

  static async delete(id: number): Promise<void> {
    const product = await this.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    await stmt.run(id);
  }
}
