import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

let driveClient: any = null;

/**
 * Initialize Google Drive client
 */
export function initializeGoogleDrive(): any {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('⚠️  Google Drive credentials not configured. Cloud backups will be disabled.');
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  driveClient = google.drive({ version: 'v3', auth: oauth2Client });
  return oauth2Client;
}

/**
 * Upload backup to Google Drive
 */
export async function uploadToGoogleDrive(backupPath: string, filename: string): Promise<string | null> {
  if (!driveClient) {
    const client = initializeGoogleDrive();
    if (!client) {
      return null;
    }
  }

  try {
    // Check if folder exists, create if not
    const folderName = 'Aaradhya Fashion Backups';
    let folderId = await findOrCreateFolder(folderName);

    // Upload file
    const fileMetadata = {
      name: filename,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/x-sqlite3',
      body: fs.createReadStream(backupPath),
    };

    const response = await driveClient.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, size',
    });

    console.log(`☁️  Backup uploaded to Google Drive: ${filename} (ID: ${response.data.id})`);
    return response.data.id as string;
  } catch (error: any) {
    console.error('Google Drive upload failed:', error.message);
    return null;
  }
}

/**
 * Find or create folder in Google Drive
 */
async function findOrCreateFolder(folderName: string): Promise<string> {
  try {
    // Try to find existing folder
    const response = await driveClient.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id as string;
    }

    // Create new folder
    const folderResponse = await driveClient.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    return folderResponse.data.id as string;
  } catch (error: any) {
    throw new Error(`Failed to create/find folder: ${error.message}`);
  }
}

/**
 * List backups from Google Drive
 */
export async function listGoogleDriveBackups(): Promise<any[]> {
  if (!driveClient) {
    const client = initializeGoogleDrive();
    if (!client) {
      return [];
    }
  }

  try {
    const folderName = 'Aaradhya Fashion Backups';
    const folderId = await findOrCreateFolder(folderName);

    const response = await driveClient.files.list({
      q: `'${folderId}' in parents and mimeType='application/x-sqlite3' and trashed=false`,
      fields: 'files(id, name, size, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc',
    });

    return response.data.files || [];
  } catch (error: any) {
    console.error('Failed to list Google Drive backups:', error.message);
    return [];
  }
}

/**
 * Download backup from Google Drive
 */
export async function downloadFromGoogleDrive(fileId: string, destinationPath: string): Promise<boolean> {
  if (!driveClient) {
    const client = initializeGoogleDrive();
    if (!client) {
      return false;
    }
  }

  try {
    const response = await driveClient.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    const dest = fs.createWriteStream(destinationPath);
    response.data.pipe(dest);

    return new Promise((resolve, reject) => {
      dest.on('finish', () => resolve(true));
      dest.on('error', (error) => reject(error));
    });
  } catch (error: any) {
    console.error('Failed to download from Google Drive:', error.message);
    return false;
  }
}

/**
 * Delete backup from Google Drive
 */
export async function deleteFromGoogleDrive(fileId: string): Promise<boolean> {
  if (!driveClient) {
    const client = initializeGoogleDrive();
    if (!client) {
      return false;
    }
  }

  try {
    await driveClient.files.delete({ fileId });
    console.log(`🗑️  Deleted backup from Google Drive: ${fileId}`);
    return true;
  } catch (error: any) {
    console.error('Failed to delete from Google Drive:', error.message);
    return false;
  }
}
