import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  createBackup,
  listBackups,
  deleteBackup,
  restoreBackup,
  getBackupStats,
  verifyBackup,
  cleanOldBackups,
} from '../utils/backup';
import {
  uploadToGoogleDrive,
  listGoogleDriveBackups,
  downloadFromGoogleDrive,
  deleteFromGoogleDrive,
} from '../utils/googleDrive';
import fs from 'fs';
import path from 'path';

const router = express.Router();
router.use(authenticate);

// Create manual backup
router.post('/create', async (req: AuthRequest, res) => {
  try {
    const backupInfo = await createBackup();
    
    // Try to upload to Google Drive
    let driveFileId = null;
    try {
      driveFileId = await uploadToGoogleDrive(backupInfo.path, backupInfo.filename);
    } catch (error: any) {
      console.warn('Google Drive upload failed:', error.message);
    }

    res.json({
      success: true,
      backup: {
        filename: backupInfo.filename,
        size: backupInfo.size,
        createdAt: backupInfo.createdAt,
        verified: backupInfo.verified,
        driveFileId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List all backups
router.get('/list', async (req: AuthRequest, res) => {
  try {
    const backups = listBackups();
    
    // Verify each backup
    const verifiedBackups = await Promise.all(
      backups.map(async (backup) => ({
        ...backup,
        verified: await verifyBackup(backup.path),
      }))
    );

    res.json(verifiedBackups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get backup statistics
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const stats = getBackupStats();
    
    // Get Google Drive backups count
    let driveBackups = [];
    try {
      driveBackups = await listGoogleDriveBackups();
    } catch (error: any) {
      console.warn('Failed to get Google Drive backups:', error.message);
    }

    res.json({
      ...stats,
      cloudBackups: driveBackups.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Download backup file
router.get('/download/:filename', async (req: AuthRequest, res) => {
  try {
    const { filename } = req.params;
    const backupDir = path.join(__dirname, '../../backups');
    const backupPath = path.join(backupDir, filename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    // Verify backup before downloading
    const { verifyBackup } = require('../utils/backup');
    const isValid = await verifyBackup(backupPath);
    
    if (!isValid) {
      return res.status(400).json({ error: 'Backup file is corrupted or invalid' });
    }

    // Set proper headers for file download
    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fs.statSync(backupPath).size);

    // Stream the file
    const fileStream = fs.createReadStream(backupPath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('Download stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download backup' });
      }
    });
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete backup
router.delete('/:filename', async (req: AuthRequest, res) => {
  try {
    const { filename } = req.params;
    deleteBackup(filename);
    res.json({ success: true, message: 'Backup deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Restore from backup
router.post('/restore/:filename', async (req: AuthRequest, res) => {
  try {
    const { filename } = req.params;
    await restoreBackup(filename);
    res.json({ success: true, message: 'Database restored successfully. Please restart the server.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clean old backups
router.post('/clean', async (req: AuthRequest, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    const deletedCount = cleanOldBackups(daysToKeep);
    res.json({ success: true, deletedCount, message: `Deleted ${deletedCount} old backup(s)` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List Google Drive backups
router.get('/cloud/list', async (req: AuthRequest, res) => {
  try {
    const backups = await listGoogleDriveBackups();
    res.json(backups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Download from Google Drive
router.post('/cloud/download/:fileId', async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params;
    const backupDir = path.join(__dirname, '../../backups');
    const destinationPath = path.join(backupDir, `downloaded-${fileId}.db`);

    const success = await downloadFromGoogleDrive(fileId, destinationPath);
    if (success) {
      res.json({ success: true, message: 'Backup downloaded from Google Drive' });
    } else {
      res.status(500).json({ error: 'Failed to download from Google Drive' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete from Google Drive
router.delete('/cloud/:fileId', async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params;
    const success = await deleteFromGoogleDrive(fileId);
    if (success) {
      res.json({ success: true, message: 'Backup deleted from Google Drive' });
    } else {
      res.status(500).json({ error: 'Failed to delete from Google Drive' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify backup file (for testing downloaded files)
router.post('/verify', async (req: AuthRequest, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const backupDir = path.join(__dirname, '../../backups');
    const backupPath = path.join(backupDir, filename);
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database.db');

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    const { verifyBackup } = require('../utils/backup');
    const isValid = await verifyBackup(backupPath);
    const stats = fs.statSync(backupPath);

    // Compare data counts between backup and source
    const sqlite3 = require('sqlite3');
    let backupBills = 0;
    let sourceBills = 0;
    let backupParties = 0;
    let sourceParties = 0;
    let dataMatch = false;

    if (isValid) {
      try {
        const backupDb = new sqlite3.Database(backupPath, sqlite3.OPEN_READONLY);
        const sourceDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

        [backupBills, sourceBills, backupParties, sourceParties] = await Promise.all([
          new Promise<number>((resolve) => {
            backupDb.get('SELECT COUNT(*) as count FROM bills', (err: Error | null, row: any) => {
              resolve(err ? 0 : (row?.count || 0));
            });
          }),
          new Promise<number>((resolve) => {
            sourceDb.get('SELECT COUNT(*) as count FROM bills', (err: Error | null, row: any) => {
              resolve(err ? 0 : (row?.count || 0));
            });
          }),
          new Promise<number>((resolve) => {
            backupDb.get('SELECT COUNT(*) as count FROM parties', (err: Error | null, row: any) => {
              resolve(err ? 0 : (row?.count || 0));
            });
          }),
          new Promise<number>((resolve) => {
            sourceDb.get('SELECT COUNT(*) as count FROM parties', (err: Error | null, row: any) => {
              resolve(err ? 0 : (row?.count || 0));
            });
          }),
        ]);

        backupDb.close();
        sourceDb.close();

        dataMatch = backupBills === sourceBills && backupParties === sourceParties;
      } catch (err) {
        console.warn('Could not compare data counts:', err);
      }
    }

    res.json({
      valid: isValid,
      filename,
      size: stats.size,
      sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
      dataMatch,
      backupBills,
      sourceBills,
      backupParties,
      sourceParties,
      message: isValid 
        ? (dataMatch 
          ? 'Backup file is valid and contains all data. Ready to restore.' 
          : `Backup file is valid but data count mismatch. Backup: ${backupBills} bills, Source: ${sourceBills} bills`)
        : 'Backup file is corrupted or invalid',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
