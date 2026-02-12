import db from '../database/db';

export interface Party {
  id: number;
  name: string;
  address: string;
  gstin: string;
  phone: string;
  alternate_phone: string | null;
  place_of_supply: string;
  transport: string;
  station: string;
  agent: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePartyInput {
  name: string;
  address: string;
  gstin: string;
  phone: string;
  alternate_phone?: string;
  place_of_supply?: string;
  transport: string;
  station: string;
  agent: string;
}

export interface UpdatePartyInput {
  name?: string;
  address?: string;
  gstin?: string;
  phone?: string;
  alternate_phone?: string;
  place_of_supply?: string;
  transport?: string;
  station?: string;
  agent?: string;
}

export class PartyModel {
  static async create(input: CreatePartyInput): Promise<Party> {
    // Check if party with same name, GSTIN, or phone already exists
    const existing = await this.findByNameOrGstinOrPhone(input.name, input.gstin, input.phone);
    if (existing) {
      // Update existing party instead of creating duplicate
      return await this.update(existing.id, input);
    }

    const stmt = db.prepare(`
      INSERT INTO parties (name, address, gstin, phone, alternate_phone, place_of_supply, transport, station, agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      input.name,
      input.address,
      input.gstin,
      input.phone,
      input.alternate_phone || null,
      input.place_of_supply || '24-Gujarat',
      input.transport || '',
      input.station || '',
      input.agent || ''
    );

    return (await this.findById(result.lastInsertRowid))!;
  }

  static async findById(id: number): Promise<Party | null> {
    const stmt = db.prepare('SELECT * FROM parties WHERE id = ?');
    return (await stmt.get(id)) as Party | null;
  }

  static async findByNameOrGstinOrPhone(name: string, gstin?: string, phone?: string): Promise<Party | null> {
    let query = 'SELECT * FROM parties WHERE name = ?';
    const params: any[] = [name];

    if (gstin && gstin.trim() !== '') {
      query += ' OR gstin = ?';
      params.push(gstin);
    }

    if (phone && phone.trim() !== '') {
      query += ' OR phone = ? OR alternate_phone = ?';
      params.push(phone, phone);
    }

    query += ' LIMIT 1';

    const stmt = db.prepare(query);
    return (await stmt.get(...params)) as Party | null;
  }

  // Helper function to normalize phone numbers (remove all non-digits)
  private static normalizePhone(phone: string | null): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  }

  static async search(query: string): Promise<Party[]> {
    // Empty query returns empty array
    if (!query || query.trim() === '') {
      return [];
    }
    
    const trimmedQuery = query.trim();
    const searchPattern = `%${trimmedQuery}%`;
    
    // Normalize query: remove all non-digit characters for phone number search
    const normalizedQuery = trimmedQuery.replace(/\D/g, '');
    const phoneSearchPattern = normalizedQuery.length >= 2 ? `%${normalizedQuery}%` : null;
    
    // Use SQL LIKE queries with indexes for efficient searching
    // This is much faster than loading all parties into memory
    let sqlQuery = `
      SELECT * FROM parties 
      WHERE 
        LOWER(name) LIKE LOWER(?)
        OR (gstin IS NOT NULL AND gstin != '' AND LOWER(gstin) LIKE LOWER(?))
        OR phone LIKE ?
        OR (alternate_phone IS NOT NULL AND alternate_phone != '' AND alternate_phone LIKE ?)
    `;
    
    const params: any[] = [searchPattern, searchPattern, searchPattern, searchPattern];
    
    // For phone number search, also check normalized (digits-only) version
    // SQLite doesn't have built-in regex, so we use REPLACE to remove non-digits
    if (phoneSearchPattern) {
      sqlQuery += `
        OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '') LIKE ?
        OR (alternate_phone IS NOT NULL AND alternate_phone != '' 
            AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(alternate_phone, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '') LIKE ?)
      `;
      params.push(phoneSearchPattern, phoneSearchPattern);
    }
    
    sqlQuery += ' ORDER BY name ASC LIMIT 50';
    
    const stmt = db.prepare(sqlQuery);
    return (await stmt.all(...params)) as Party[];
  }

  static async findAll(options?: { limit?: number; offset?: number }): Promise<{ parties: Party[]; total: number; hasMore: boolean }> {
    const limit = options?.limit || 1000; // Default 1000 per page for scalability
    const offset = options?.offset || 0;
    
    // Count total records
    const countStmt = db.prepare('SELECT COUNT(*) as total FROM parties');
    const countResult = (await countStmt.get()) as { total: number };
    const total = countResult.total;
    
    // Get paginated results
    const stmt = db.prepare('SELECT * FROM parties ORDER BY name ASC LIMIT ? OFFSET ?');
    const parties = (await stmt.all(limit, offset)) as Party[];
    
    return {
      parties,
      total,
      hasMore: offset + limit < total
    };
  }

  static async update(id: number, input: UpdatePartyInput): Promise<Party> {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.address !== undefined) {
      updates.push('address = ?');
      values.push(input.address);
    }
    if (input.gstin !== undefined) {
      updates.push('gstin = ?');
      values.push(input.gstin);
    }
    if (input.phone !== undefined) {
      updates.push('phone = ?');
      values.push(input.phone);
    }
    if (input.alternate_phone !== undefined) {
      updates.push('alternate_phone = ?');
      values.push(input.alternate_phone);
    }
    if (input.place_of_supply !== undefined) {
      updates.push('place_of_supply = ?');
      values.push(input.place_of_supply);
    }
    if (input.transport !== undefined) {
      updates.push('transport = ?');
      values.push(input.transport);
    }
    if (input.station !== undefined) {
      updates.push('station = ?');
      values.push(input.station);
    }
    if (input.agent !== undefined) {
      updates.push('agent = ?');
      values.push(input.agent);
    }

    if (updates.length === 0) {
      return (await this.findById(id))!;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE parties 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    await stmt.run(...values);
    return (await this.findById(id))!;
  }

  static async delete(id: number): Promise<void> {
    const stmt = db.prepare('DELETE FROM parties WHERE id = ?');
    await stmt.run(id);
  }

  /** Export: all parties for Excel */
  static async getExportRows(): Promise<Party[]> {
    const stmt = db.prepare('SELECT * FROM parties ORDER BY name ASC');
    return (await stmt.all()) as Party[];
  }

  /** Import from Excel rows: create or update by name/phone/gstin */
  static async importFromRows(
    rows: Array<{
      name: string;
      address: string;
      gstin?: string;
      phone: string;
      alternate_phone?: string;
      place_of_supply?: string;
      transport?: string;
      station?: string;
      agent?: string;
    }>
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      if (!row.name || String(row.name).trim() === '') {
        errors.push(`Row ${rowNum}: Name is required`);
        continue;
      }
      if (!row.address || String(row.address).trim() === '') {
        errors.push(`Row ${rowNum}: Address is required`);
        continue;
      }
      if (!row.phone || String(row.phone).trim() === '') {
        errors.push(`Row ${rowNum}: Phone is required`);
        continue;
      }
      const name = String(row.name).trim();
      const address = String(row.address).trim();
      const phone = String(row.phone).trim();
      const gstin = String(row.gstin ?? '').trim();
      const alternate_phone = row.alternate_phone != null ? String(row.alternate_phone).trim() : '';
      const place_of_supply = String(row.place_of_supply ?? '').trim() || '24-Gujarat';
      const transport = String(row.transport ?? '').trim();
      const station = String(row.station ?? '').trim();
      const agent = String(row.agent ?? '').trim();
      try {
        const existing = await this.findByNameOrGstinOrPhone(name, gstin || undefined, phone);
        if (existing) {
          await this.update(existing.id, {
            name,
            address,
            gstin: gstin || undefined,
            phone,
            alternate_phone: alternate_phone || undefined,
            place_of_supply,
            transport,
            station,
            agent,
          });
          updated++;
        } else {
          await this.create({
            name,
            address,
            gstin: gstin || '',
            phone,
            alternate_phone: alternate_phone || undefined,
            place_of_supply,
            transport,
            station,
            agent,
          });
          created++;
        }
      } catch (e: any) {
        errors.push(`Row ${rowNum}: ${e.message || 'Failed'}`);
      }
    }
    return { created, updated, errors };
  }
}
