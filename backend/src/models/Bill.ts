import db from '../database/db';
import { DispatchModel } from './Dispatch';

export interface Bill {
  id: number;
  dispatch_id: number;
  bill_type: 'aaradhya_fashion' | 'af_creation';
  party_name: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  bill_date: string;
  pdf_data: string | null;
  invoice_number: number | null;
  created_by: number | null;
  created_by_role: string | null;
  created_at: string;
}

export interface CreateBillInput {
  dispatch_id: number;
  bill_type: 'aaradhya_fashion' | 'af_creation';
  pdf_data?: string;
  created_by?: number;
  created_by_role?: 'admin' | 'staff';
}

export class BillModel {
  /** Sequence id: 1 = Aaradhya Fashion (AF-1001, 1002...), 2 = AF Creation (AFC-11001, 11002...) */
  static readonly AF_SEQUENCE_ID = 1;
  static readonly AFC_SEQUENCE_ID = 2;

  static async getNextInvoiceNumber(billType: 'aaradhya_fashion' | 'af_creation'): Promise<number> {
    const sequenceId = billType === 'aaradhya_fashion' ? this.AF_SEQUENCE_ID : this.AFC_SEQUENCE_ID;
    const getStmt = db.prepare('SELECT last_invoice_number FROM invoice_sequence WHERE id = ?');
    const current = (await getStmt.get(sequenceId)) as { last_invoice_number: number } | null;

    if (!current) {
      const defaultLast = billType === 'aaradhya_fashion' ? 1000 : 11000;
      const initStmt = db.prepare('INSERT INTO invoice_sequence (id, last_invoice_number) VALUES (?, ?)');
      await initStmt.run(sequenceId, defaultLast);
      return defaultLast + 1;
    }

    const nextNumber = current.last_invoice_number + 1;
    const updateStmt = db.prepare('UPDATE invoice_sequence SET last_invoice_number = ? WHERE id = ?');
    await updateStmt.run(nextNumber, sequenceId);
    return nextNumber;
  }

  static async create(input: CreateBillInput): Promise<Bill> {
    const dispatch = await DispatchModel.findById(input.dispatch_id);
    if (!dispatch) {
      throw new Error('Dispatch not found');
    }

    const items = await DispatchModel.getItems(input.dispatch_id);
    const subtotal = items.reduce((sum, item: any) => {
      return sum + (item.selling_price * item.quantity);
    }, 0);

    const gstRate = input.bill_type === 'aaradhya_fashion' ? 0.05 : 0; // af_creation has no GST
    const gstAmount = subtotal * gstRate;
    const totalAmount = subtotal + gstAmount;

    const invoiceNumber = await this.getNextInvoiceNumber(input.bill_type);

    const stmt = db.prepare(`
      INSERT INTO bills (dispatch_id, bill_type, party_name, subtotal, gst_amount, total_amount, pdf_data, invoice_number, created_by, created_by_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = await stmt.run(
      input.dispatch_id,
      input.bill_type,
      dispatch.party_name,
      subtotal,
      gstAmount,
      totalAmount,
      input.pdf_data || null,
      invoiceNumber,
      input.created_by || null,
      input.created_by_role || null
    );

    // Mark dispatch as completed
    await DispatchModel.complete(input.dispatch_id);

    return (await this.findById(result.lastInsertRowid))!;
  }

  static async findById(id: number): Promise<Bill | null> {
    const stmt = db.prepare('SELECT * FROM bills WHERE id = ?');
    return (await stmt.get(id)) as Bill | null;
  }

  static async findByDispatchId(dispatchId: number): Promise<Bill | null> {
    const stmt = db.prepare('SELECT * FROM bills WHERE dispatch_id = ?');
    return (await stmt.get(dispatchId)) as Bill | null;
  }

  static async findAll(
    userId?: number, 
    userRole?: 'admin' | 'staff',
    options?: { limit?: number; offset?: number; includeStaffName?: boolean }
  ): Promise<{ bills: Bill[]; total: number; hasMore: boolean }> {
    const limit = options?.limit || 50; // Default 50 per page
    const offset = options?.offset || 0;
    
    // Build base query
    let whereClause = '';
    const params: any[] = [];

    // Staff can only see their own bills
    if (userRole === 'staff' && userId) {
      whereClause = ' WHERE created_by = ?';
      params.push(userId);
    }

    // Count total records
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM bills${whereClause}`);
    const countResult = (await countStmt.get(...params)) as { total: number };
    const total = countResult.total;

    // Get paginated results
    let query = `SELECT * FROM bills${whereClause}`;
    query += ' ORDER BY invoice_number DESC, created_at DESC';
    query += ' LIMIT ? OFFSET ?';
    
    const stmt = db.prepare(query);
    const bills = (await stmt.all(...params, limit, offset)) as Bill[];

    return {
      bills,
      total,
      hasMore: offset + limit < total
    };
  }

  // Get bills with staff names using JOIN (more efficient than N+1 queries)
  static async findAllWithStaffNames(
    userId?: number,
    userRole?: 'admin' | 'staff',
    options?: { limit?: number; offset?: number }
  ): Promise<{ bills: (Bill & { created_by_name?: string | null })[]; total: number; hasMore: boolean }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    
    let whereClause = '';
    const params: any[] = [];

    if (userRole === 'staff' && userId) {
      whereClause = ' WHERE b.created_by = ?';
      params.push(userId);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM bills b${whereClause}`;
    const countStmt = db.prepare(countQuery);
    const countResult = (await countStmt.get(...params)) as { total: number };
    const total = countResult.total;

    // Get bills with staff names using LEFT JOIN
    let query = `
      SELECT 
        b.*,
        CASE 
          WHEN b.created_by_role = 'admin' THEN 'Admin'
          WHEN b.created_by_role = 'staff' AND s.name IS NOT NULL THEN s.name
          ELSE NULL
        END as created_by_name
      FROM bills b
      LEFT JOIN staff s ON b.created_by = s.id AND b.created_by_role = 'staff'
      ${whereClause}
      ORDER BY b.invoice_number DESC, b.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const stmt = db.prepare(query);
    const bills = (await stmt.all(...params, limit, offset)) as (Bill & { created_by_name?: string | null })[];

    return {
      bills,
      total,
      hasMore: offset + limit < total
    };
  }

  static async updatePdfData(id: number, pdfData: string): Promise<void> {
    const stmt = db.prepare('UPDATE bills SET pdf_data = ? WHERE id = ?');
    await stmt.run(pdfData, id);
  }

  static async update(id: number, updates: {
    party_name?: string;
    subtotal?: number;
    gst_amount?: number;
    total_amount?: number;
  }): Promise<Bill | null> {
    const bill = await this.findById(id);
    if (!bill) {
      throw new Error('Bill not found');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.party_name !== undefined) {
      fields.push('party_name = ?');
      values.push(updates.party_name);
    }
    if (updates.subtotal !== undefined) {
      fields.push('subtotal = ?');
      values.push(updates.subtotal);
    }
    if (updates.gst_amount !== undefined) {
      fields.push('gst_amount = ?');
      values.push(updates.gst_amount);
    }
    if (updates.total_amount !== undefined) {
      fields.push('total_amount = ?');
      values.push(updates.total_amount);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE bills SET ${fields.join(', ')} WHERE id = ?`);
    await stmt.run(...values);

    return this.findById(id);
  }

  static async delete(id: number): Promise<boolean> {
    const bill = await this.findById(id);
    if (!bill) return false;
    const stmt = db.prepare('DELETE FROM bills WHERE id = ?');
    await stmt.run(id);
    return true;
  }
}
