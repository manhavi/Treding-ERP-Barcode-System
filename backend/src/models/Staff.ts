import db from '../database/db';

export interface Staff {
  id: number;
  name: string;
  pin_aaradhya: string;
  pin_af_creation: string;
  can_access_purchase: number; // 0 or 1
  can_access_inventory: number;
  can_access_dispatch: number;
  can_access_billing: number;
  can_access_parties: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffInput {
  name: string;
  pin_aaradhya: string;
  pin_af_creation: string;
  can_access_purchase: boolean;
  can_access_inventory: boolean;
  can_access_dispatch: boolean;
  can_access_billing: boolean;
  can_access_parties: boolean;
}

export interface UpdateStaffInput {
  name?: string;
  pin_aaradhya?: string;
  pin_af_creation?: string;
  can_access_purchase?: boolean;
  can_access_inventory?: boolean;
  can_access_dispatch?: boolean;
  can_access_billing?: boolean;
  can_access_parties?: boolean;
  is_active?: boolean;
}

export class StaffModel {
  static async create(input: CreateStaffInput): Promise<Staff> {
    if (!input.name || !input.pin_aaradhya || !input.pin_af_creation) {
      throw new Error('Name and both PINs are required');
    }

    if (input.pin_aaradhya.length !== 6 || !/^\d{6}$/.test(input.pin_aaradhya)) {
      throw new Error('Aaradhya Fashion PIN must be exactly 6 digits');
    }

    if (input.pin_af_creation.length !== 6 || !/^\d{6}$/.test(input.pin_af_creation)) {
      throw new Error('AF Creation PIN must be exactly 6 digits');
    }

    // Check if PINs already exist
    const existingAaradhya = await this.findByPin(input.pin_aaradhya);
    if (existingAaradhya) {
      throw new Error('Aaradhya Fashion PIN already exists');
    }

    const existingAFCreation = await this.findByPin(input.pin_af_creation);
    if (existingAFCreation) {
      throw new Error('AF Creation PIN already exists');
    }

    const stmt = db.prepare(`
      INSERT INTO staff (name, pin_aaradhya, pin_af_creation, can_access_purchase, can_access_inventory, can_access_dispatch, can_access_billing, can_access_parties)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      input.name,
      input.pin_aaradhya,
      input.pin_af_creation,
      input.can_access_purchase ? 1 : 0,
      input.can_access_inventory ? 1 : 0,
      input.can_access_dispatch ? 1 : 0,
      input.can_access_billing ? 1 : 0,
      input.can_access_parties ? 1 : 0
    );

    return (await this.findById(result.lastInsertRowid))!;
  }

  static async findById(id: number): Promise<Staff | null> {
    const stmt = db.prepare('SELECT * FROM staff WHERE id = ?');
    return (await stmt.get(id)) as Staff | null;
  }

  static async findByPin(pin: string): Promise<{ staff: Staff; company: 'aaradhya_fashion' | 'af_creation' } | null> {
    try {
      // Check Aaradhya Fashion PIN
      let stmt = db.prepare('SELECT * FROM staff WHERE pin_aaradhya = ? AND is_active = 1');
      let staff = (await stmt.get(pin)) as Staff | null;
      if (staff) {
        return { staff, company: 'aaradhya_fashion' };
      }

      // Check AF Creation PIN
      stmt = db.prepare('SELECT * FROM staff WHERE pin_af_creation = ? AND is_active = 1');
      staff = (await stmt.get(pin)) as Staff | null;
      if (staff) {
        return { staff, company: 'af_creation' };
      }

      return null;
    } catch (error: any) {
      console.error('Error in findByPin:', error);
      // If table doesn't exist or database error, return null instead of throwing
      // This allows admin code to still work even if staff table has issues
      if (error.message?.includes('no such table') || error.message?.includes('SQLITE_ERROR')) {
        console.warn('Staff table may not exist or database error:', error.message);
        return null;
      }
      throw error;
    }
  }

  static async findAll(): Promise<Staff[]> {
    const stmt = db.prepare('SELECT * FROM staff ORDER BY created_at DESC');
    return (await stmt.all()) as Staff[];
  }

  static async update(id: number, input: UpdateStaffInput): Promise<Staff | null> {
    const staff = await this.findById(id);
    if (!staff) {
      throw new Error('Staff not found');
    }

    if (input.pin_aaradhya) {
      if (input.pin_aaradhya.length !== 6 || !/^\d{6}$/.test(input.pin_aaradhya)) {
        throw new Error('Aaradhya Fashion PIN must be exactly 6 digits');
      }
      // Check if PIN already exists for another staff
      const existing = await this.findByPin(input.pin_aaradhya);
      if (existing && existing.staff.id !== id) {
        throw new Error('Aaradhya Fashion PIN already exists');
      }
    }

    if (input.pin_af_creation) {
      if (input.pin_af_creation.length !== 6 || !/^\d{6}$/.test(input.pin_af_creation)) {
        throw new Error('AF Creation PIN must be exactly 6 digits');
      }
      // Check if PIN already exists for another staff
      const existing = await this.findByPin(input.pin_af_creation);
      if (existing && existing.staff.id !== id) {
        throw new Error('AF Creation PIN already exists');
      }
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      fields.push('name = ?');
      values.push(input.name);
    }
    if (input.pin_aaradhya !== undefined) {
      fields.push('pin_aaradhya = ?');
      values.push(input.pin_aaradhya);
    }
    if (input.pin_af_creation !== undefined) {
      fields.push('pin_af_creation = ?');
      values.push(input.pin_af_creation);
    }
    if (input.can_access_purchase !== undefined) {
      fields.push('can_access_purchase = ?');
      values.push(input.can_access_purchase ? 1 : 0);
    }
    if (input.can_access_inventory !== undefined) {
      fields.push('can_access_inventory = ?');
      values.push(input.can_access_inventory ? 1 : 0);
    }
    if (input.can_access_dispatch !== undefined) {
      fields.push('can_access_dispatch = ?');
      values.push(input.can_access_dispatch ? 1 : 0);
    }
    if (input.can_access_billing !== undefined) {
      fields.push('can_access_billing = ?');
      values.push(input.can_access_billing ? 1 : 0);
    }
    if (input.can_access_parties !== undefined) {
      fields.push('can_access_parties = ?');
      values.push(input.can_access_parties ? 1 : 0);
    }
    if (input.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(input.is_active ? 1 : 0);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`UPDATE staff SET ${fields.join(', ')} WHERE id = ?`);
    await stmt.run(...values);

    return this.findById(id);
  }

  static async delete(id: number): Promise<void> {
    const stmt = db.prepare('DELETE FROM staff WHERE id = ?');
    await stmt.run(id);
  }
}
