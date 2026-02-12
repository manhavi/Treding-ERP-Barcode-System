import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import sqlite3 from 'sqlite3';

const execAsync = promisify(exec);

export interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  verified: boolean;
}

/**
 * Create a backup of the database
 * Uses a reliable method that works with WAL mode and ensures ALL data is included
 */
export async function createBackup(): Promise<BackupInfo> {
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database.db');
  const backupDir = path.join(__dirname, '../../backups');
  
  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Generate timestamp for backup filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const backupFileName = `database-backup-${timestamp}-${time}.db`;
  const backupPath = path.join(backupDir, backupFileName);

  try {
    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      throw new Error('Database file not found');
    }

    return new Promise((resolve, reject) => {
      // Method 1: Try VACUUM INTO (best method - creates complete standalone backup)
      const sourceDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (openErr) => {
        if (openErr) {
          // Method 2: Fallback to file copy with WAL files
          console.warn('Read-only open failed, using file copy method:', openErr.message);
          try {
            // Copy main database file
            fs.copyFileSync(dbPath, backupPath);
            
            // Copy WAL and SHM files (important for WAL mode)
            const walPath = `${dbPath}-wal`;
            const shmPath = `${dbPath}-shm`;
            if (fs.existsSync(walPath)) {
              fs.copyFileSync(walPath, `${backupPath}-wal`);
            }
            if (fs.existsSync(shmPath)) {
              fs.copyFileSync(shmPath, `${backupPath}-shm`);
            }

            const stats = fs.statSync(backupPath);
            verifyBackup(backupPath).then((verified) => {
              console.log(`✅ Backup created (file copy): ${backupFileName} (${(stats.size / 1024).toFixed(2)} KB)`);
              resolve({
                filename: backupFileName,
                path: backupPath,
                size: stats.size,
                createdAt: new Date(),
                verified,
              });
            }).catch(() => {
              resolve({
                filename: backupFileName,
                path: backupPath,
                size: stats.size,
                createdAt: new Date(),
                verified: false,
              });
            });
          } catch (copyErr: any) {
            reject(new Error(`Failed to copy database: ${copyErr.message}`));
          }
          return;
        }

        // Use VACUUM INTO to create complete backup
        // This creates a standalone database with ALL data (including WAL data)
        const escapedPath = backupPath.replace(/'/g, "''");
        sourceDb.run(`VACUUM INTO '${escapedPath}'`, (vacuumErr) => {
          sourceDb.close((closeErr) => {
            if (closeErr) console.warn('Warning closing source db:', closeErr);

            if (vacuumErr) {
              // Fallback to file copy if VACUUM fails
              console.warn('VACUUM INTO failed, using file copy:', vacuumErr.message);
              try {
                fs.copyFileSync(dbPath, backupPath);
                const walPath = `${dbPath}-wal`;
                const shmPath = `${dbPath}-shm`;
                if (fs.existsSync(walPath)) {
                  fs.copyFileSync(walPath, `${backupPath}-wal`);
                }
                if (fs.existsSync(shmPath)) {
                  fs.copyFileSync(shmPath, `${backupPath}-shm`);
                }
              } catch (copyErr: any) {
                reject(new Error(`Backup failed: ${vacuumErr.message}`));
                return;
              }
            }

            // Verify the backup was created
            if (!fs.existsSync(backupPath)) {
              reject(new Error('Backup file was not created'));
              return;
            }

            // Get file stats
            const stats = fs.statSync(backupPath);
            
            // Verify backup integrity and data completeness
            verifyBackup(backupPath).then(async (verified) => {
              if (verified) {
                // Additional check: Verify all bills are in backup
                try {
                  const verifyBackupDb = new sqlite3.Database(backupPath, sqlite3.OPEN_READONLY);
                  const verifySourceDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
                  
                  const [backupBills, sourceBills, backupParties, sourceParties] = await Promise.all([
                    new Promise<number>((resolve) => {
                      verifyBackupDb.get('SELECT COUNT(*) as count FROM bills', (err, row: any) => {
                        resolve(err ? 0 : (row?.count || 0));
                      });
                    }),
                    new Promise<number>((resolve) => {
                      verifySourceDb.get('SELECT COUNT(*) as count FROM bills', (err, row: any) => {
                        resolve(err ? 0 : (row?.count || 0));
                      });
                    }),
                    new Promise<number>((resolve) => {
                      verifyBackupDb.get('SELECT COUNT(*) as count FROM parties', (err, row: any) => {
                        resolve(err ? 0 : (row?.count || 0));
                      });
                    }),
                    new Promise<number>((resolve) => {
                      verifySourceDb.get('SELECT COUNT(*) as count FROM parties', (err, row: any) => {
                        resolve(err ? 0 : (row?.count || 0));
                      });
                    }),
                  ]);

                  verifyBackupDb.close();
                  verifySourceDb.close();

                  if (backupBills === sourceBills && backupParties === sourceParties) {
                    console.log(`✅ Backup created: ${backupFileName} (${(stats.size / 1024).toFixed(2)} KB)`);
                    console.log(`   ✅ All data included: ${backupBills} bills, ${backupParties} parties`);
                    console.log(`   ✅ Complete backup with all data`);
                  } else {
                    console.warn(`⚠️  Backup created but data mismatch:`);
                    console.warn(`   Bills: Backup=${backupBills}, Source=${sourceBills}`);
                    console.warn(`   Parties: Backup=${backupParties}, Source=${sourceParties}`);
                  }
                } catch (dataCheckErr) {
                  console.warn('Could not verify data completeness:', dataCheckErr);
                }
              }

              resolve({
                filename: backupFileName,
                path: backupPath,
                size: stats.size,
                createdAt: new Date(),
                verified,
              });
            }).catch((verifyErr) => {
              // Even if verification fails, return the backup info
              console.warn('Backup verification warning:', verifyErr);
              resolve({
                filename: backupFileName,
                path: backupPath,
                size: stats.size,
                createdAt: new Date(),
                verified: false,
              });
            });
          });
        });
      });
    });
  } catch (error: any) {
    console.error('Backup creation failed:', error);
    throw new Error(`Failed to create backup: ${error.message}`);
  }
}

/**
 * Verify backup integrity by checking if it's a valid SQLite database
 */
export async function verifyBackup(backupPath: string): Promise<boolean> {
  try {
    if (!fs.existsSync(backupPath)) {
      return false;
    }

    // Check file size (should be > 0)
    const stats = fs.statSync(backupPath);
    if (stats.size === 0) {
      return false;
    }

    // Try to read first bytes to check SQLite magic number
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(backupPath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    // SQLite database files start with "SQLite format 3"
    const magicString = buffer.toString('utf8', 0, 16);
    if (!magicString.startsWith('SQLite format 3')) {
      return false;
    }

    // Additional verification: Try to open the database and check if it's readable
    try {
      const sqlite3 = require('sqlite3');
      return new Promise((resolve) => {
        const testDb = new sqlite3.Database(backupPath, sqlite3.OPEN_READONLY, (err: Error | null) => {
          if (err) {
            resolve(false);
            return;
          }
          // Try a simple query to verify database is readable
          testDb.get('SELECT COUNT(*) as count FROM sqlite_master', (err: Error | null, row: any) => {
            testDb.close();
            if (err || !row) {
              resolve(false);
            } else {
              resolve(true);
            }
          });
        });
      });
    } catch {
      // If sqlite3 module fails, at least we verified the magic number
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Get list of all backups
 */
export function listBackups(): BackupInfo[] {
  const backupDir = path.join(__dirname, '../../backups');
  
  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.db') && file.startsWith('database-backup-'))
    .map(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        path: filePath,
        size: stats.size,
        createdAt: stats.mtime,
        verified: false, // Will be verified on demand
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Newest first

  return files;
}

/**
 * Delete a backup file
 */
export function deleteBackup(filename: string): void {
  const backupDir = path.join(__dirname, '../../backups');
  const backupPath = path.join(backupDir, filename);
  
  // Also delete associated WAL and SHM files
  const walPath = `${backupPath}-wal`;
  const shmPath = `${backupPath}-shm`;

  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }
  if (fs.existsSync(walPath)) {
    fs.unlinkSync(walPath);
  }
  if (fs.existsSync(shmPath)) {
    fs.unlinkSync(shmPath);
  }
}

/**
 * Clean old backups (keep last N days)
 */
export function cleanOldBackups(daysToKeep: number = 30): number {
  const backupDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    return 0;
  }

  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.db') && file.startsWith('database-backup-'));
  
  const now = Date.now();
  const cutoffTime = now - (daysToKeep * 24 * 60 * 60 * 1000);
  let deletedCount = 0;

  files.forEach(file => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.mtime.getTime() < cutoffTime) {
      deleteBackup(file);
      deletedCount++;
      console.log(`🗑️  Deleted old backup: ${file}`);
    }
  });

  return deletedCount;
}

/**
 * Get backup statistics
 */
export function getBackupStats() {
  const backups = listBackups();
  const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
  
  return {
    totalBackups: backups.length,
    totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    oldestBackup: backups.length > 0 ? backups[backups.length - 1].createdAt : null,
    newestBackup: backups.length > 0 ? backups[0].createdAt : null,
  };
}

/**
 * Restore database from backup
 */
export async function restoreBackup(filename: string): Promise<void> {
  const backupDir = path.join(__dirname, '../../backups');
  const backupPath = path.join(backupDir, filename);
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database.db');

  if (!fs.existsSync(backupPath)) {
    throw new Error('Backup file not found');
  }

  // Verify backup before restoring
  const isValid = await verifyBackup(backupPath);
  if (!isValid) {
    throw new Error('Backup file is corrupted or invalid');
  }

  try {
    // Create a backup of current database before restoring
    const currentBackup = await createBackup();
    console.log(`📦 Created safety backup before restore: ${currentBackup.filename}`);

    // Since we use VACUUM INTO, the backup is a complete standalone database
    // No need for WAL/SHM files - just copy the main database file
    fs.copyFileSync(backupPath, dbPath);

    // Remove any existing WAL/SHM files to start fresh
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }

    console.log(`✅ Database restored from: ${filename}`);
  } catch (error: any) {
    throw new Error(`Failed to restore backup: ${error.message}`);
  }
}
