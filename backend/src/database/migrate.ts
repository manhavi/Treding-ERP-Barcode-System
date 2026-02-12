import db from './db';

export async function runMigrations() {
  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      design_number TEXT UNIQUE NOT NULL,
      barcode TEXT UNIQUE NOT NULL,
      color_description TEXT NOT NULL,
      selling_price REAL NOT NULL,
      stock_quantity INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Purchases table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      purchase_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // Dispatches table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS dispatches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_name TEXT NOT NULL,
      dispatch_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Dispatch items table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS dispatch_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      scanned_barcode TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // Bills table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_id INTEGER NOT NULL,
      bill_type TEXT NOT NULL CHECK(bill_type IN ('aaradhya_fashion', 'af_creation')),
      party_name TEXT NOT NULL,
      subtotal REAL NOT NULL,
      gst_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      bill_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      pdf_data TEXT,
      invoice_number INTEGER,
      created_by INTEGER,
      created_by_role TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE
    )
  `);

  // Invoice number sequence table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_sequence (
      id INTEGER PRIMARY KEY,
      last_invoice_number INTEGER DEFAULT 1000
    )
  `);

  // Invoice sequences: id=1 Aaradhya Fashion (AF-1001, AF-1002...), id=2 AF Creation (AFC-11001, AFC-11002...)
  await db.exec(`
    INSERT OR IGNORE INTO invoice_sequence (id, last_invoice_number) VALUES (1, 1000)
  `);
  await db.exec(`
    INSERT OR IGNORE INTO invoice_sequence (id, last_invoice_number) VALUES (2, 11000)
  `);

  // Staff table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pin_aaradhya TEXT UNIQUE NOT NULL,
      pin_af_creation TEXT UNIQUE NOT NULL,
      can_access_purchase INTEGER DEFAULT 0,
      can_access_inventory INTEGER DEFAULT 0,
      can_access_dispatch INTEGER DEFAULT 0,
      can_access_billing INTEGER DEFAULT 0,
      can_access_parties INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add can_access_parties column to existing staff table if it doesn't exist
  try {
    await db.exec(`
      ALTER TABLE staff ADD COLUMN can_access_parties INTEGER DEFAULT 0;
    `);
  } catch (e: any) {
    // Column might already exist, ignore error
    if (!e.message.includes('duplicate column')) {
      console.warn('Could not add can_access_parties column:', e.message);
    }
  }

  // Parties (Buyers) table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      gstin TEXT,
      phone TEXT NOT NULL,
      alternate_phone TEXT,
      place_of_supply TEXT DEFAULT '24-Gujarat',
      transport TEXT NOT NULL DEFAULT '',
      station TEXT NOT NULL DEFAULT '',
      agent TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add transport fields to existing parties table if they don't exist
  try {
    await db.exec(`
      ALTER TABLE parties ADD COLUMN transport TEXT NOT NULL DEFAULT '';
    `);
  } catch (e: any) {
    // Column might already exist, ignore error
    if (!e.message.includes('duplicate column')) {
      console.warn('Could not add transport column:', e.message);
    }
  }

  try {
    await db.exec(`
      ALTER TABLE parties ADD COLUMN station TEXT NOT NULL DEFAULT '';
    `);
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) {
      console.warn('Could not add station column:', e.message);
    }
  }

  try {
    await db.exec(`
      ALTER TABLE parties ADD COLUMN agent TEXT NOT NULL DEFAULT '';
    `);
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) {
      console.warn('Could not add agent column:', e.message);
    }
  }

  // Create indexes for performance optimization
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_design_number ON products(design_number);
    CREATE INDEX IF NOT EXISTS idx_dispatch_items_dispatch_id ON dispatch_items(dispatch_id);
    CREATE INDEX IF NOT EXISTS idx_dispatch_items_product_id ON dispatch_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_bills_dispatch_id ON bills(dispatch_id);
    CREATE INDEX IF NOT EXISTS idx_bills_created_by ON bills(created_by);
    CREATE INDEX IF NOT EXISTS idx_bills_invoice_number ON bills(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON bills(bill_date);
    CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);
    CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);
    CREATE INDEX IF NOT EXISTS idx_staff_pin_aaradhya ON staff(pin_aaradhya);
    CREATE INDEX IF NOT EXISTS idx_staff_pin_af_creation ON staff(pin_af_creation);
    CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(name);
    CREATE INDEX IF NOT EXISTS idx_parties_gstin ON parties(gstin);
    CREATE INDEX IF NOT EXISTS idx_parties_phone ON parties(phone);
    CREATE INDEX IF NOT EXISTS idx_parties_alternate_phone ON parties(alternate_phone);
  `);

  // Enable WAL mode for better concurrency and performance
  await db.exec(`PRAGMA journal_mode = WAL;`);
  await db.exec(`PRAGMA synchronous = NORMAL;`);
  await db.exec(`PRAGMA cache_size = -64000;`); // 64MB cache
  await db.exec(`PRAGMA temp_store = MEMORY;`);

  console.log('Database migrations completed successfully!');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
