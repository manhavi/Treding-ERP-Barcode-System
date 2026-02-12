import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database.db');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Performance optimizations for scalability
// WAL mode allows multiple readers and one writer simultaneously
db.run('PRAGMA journal_mode = WAL');
// NORMAL sync is safe with WAL and faster than FULL
db.run('PRAGMA synchronous = NORMAL');
// Increase cache size to 64MB for better performance
db.run('PRAGMA cache_size = -64000');
// Store temporary tables in memory
db.run('PRAGMA temp_store = MEMORY');
// Optimize for better query planning
db.run('PRAGMA optimize');

// Promisify methods
export const dbRun = promisify(db.run.bind(db));
export const dbGet = promisify(db.get.bind(db));
export const dbAll = promisify(db.all.bind(db));
export const dbExec = promisify(db.exec.bind(db));

// Helper class to provide similar interface to better-sqlite3
class DatabaseWrapper {
  run(sql: string, ...params: any[]): Promise<{ lastInsertRowid: number; changes: number }> {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql: string, ...params: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql: string, ...params: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  prepare(sql: string) {
    const stmt = db.prepare(sql);
    return {
      run: (...params: any[]) => {
        return new Promise<{ lastInsertRowid: number; changes: number }>((resolve, reject) => {
          stmt.run(...params, function(this: { lastID: number; changes: number }, err: Error | null) {
            if (err) reject(err);
            else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
          });
        });
      },
      get: (...params: any[]) => {
        return new Promise<any>((resolve, reject) => {
          stmt.get(...params, (err: Error | null, row: any) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      },
      all: (...params: any[]) => {
        return new Promise<any[]>((resolve, reject) => {
          stmt.all(...params, (err: Error | null, rows: any[]) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });
      },
      finalize: () => {
        return new Promise<void>((resolve, reject) => {
          stmt.finalize((err: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    };
  }
}

export default new DatabaseWrapper();
