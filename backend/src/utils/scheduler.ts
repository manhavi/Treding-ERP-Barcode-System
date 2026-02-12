import { createBackup } from './backup';
import { uploadToGoogleDrive } from './googleDrive';

let backupInterval: NodeJS.Timeout | null = null;

/**
 * Start scheduled daily backups
 */
export function startScheduledBackups() {
  // Clear any existing interval
  if (backupInterval) {
    clearInterval(backupInterval);
  }

  // Run backup immediately on start
  runScheduledBackup();

  // Schedule daily backups at 2 AM
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0);

  const msUntilBackup = tomorrow.getTime() - now.getTime();

  setTimeout(() => {
    runScheduledBackup();
    // Then run every 24 hours
    backupInterval = setInterval(runScheduledBackup, 24 * 60 * 60 * 1000);
  }, msUntilBackup);

  console.log('📅 Scheduled backups started. Next backup at:', tomorrow.toLocaleString());
}

/**
 * Run scheduled backup (local + cloud)
 */
async function runScheduledBackup() {
  try {
    console.log('🔄 Starting scheduled backup...');
    
    // Create local backup
    const backupInfo = await createBackup();
    console.log(`✅ Local backup created: ${backupInfo.filename}`);

    // Upload to Google Drive
    const driveFileId = await uploadToGoogleDrive(backupInfo.path, backupInfo.filename);
    if (driveFileId) {
      console.log(`☁️  Cloud backup uploaded successfully`);
    } else {
      console.warn('⚠️  Cloud backup failed, but local backup is safe');
    }

    // Clean old backups (keep last 30 days)
    const { cleanOldBackups } = require('./backup');
    const deletedCount = cleanOldBackups(30);
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned ${deletedCount} old backup(s)`);
    }
  } catch (error: any) {
    console.error('❌ Scheduled backup failed:', error.message);
  }
}

/**
 * Stop scheduled backups
 */
export function stopScheduledBackups() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    console.log('⏹️  Scheduled backups stopped');
  }
}
