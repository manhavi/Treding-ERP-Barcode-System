import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import BackupIcon from '@mui/icons-material/Backup';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import RestoreIcon from '@mui/icons-material/Restore';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import api from '../services/api';
import { format } from 'date-fns';

interface Backup {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  verified: boolean;
}

interface BackupStats {
  totalBackups: number;
  totalSize: number;
  totalSizeMB: string;
  oldestBackup: Date | null;
  newestBackup: Date | null;
  cloudBackups: number;
}

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [cloudBackups, setCloudBackups] = useState<any[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);

  useEffect(() => {
    loadBackups();
    loadStats();
  }, []);

  const loadBackups = async () => {
    try {
      const response = await api.get('/backup/list');
      setBackups(response.data);
    } catch (err: any) {
      console.error('Failed to load backups:', err);
      setMessage({ type: 'error', text: 'Failed to load backups' });
    } finally {
      setLoading(false);
    }
  };

  const loadCloudBackups = async () => {
    try {
      const response = await api.get('/backup/cloud/list');
      setCloudBackups(response.data);
    } catch (err: any) {
      console.warn('Failed to load cloud backups:', err);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/backup/stats');
      setStats(response.data);
      if (response.data.cloudBackups !== undefined) {
        await loadCloudBackups();
      }
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const response = await api.post('/backup/create');
      setMessage({ type: 'success', text: 'Backup created successfully!' });
      await loadBackups();
      await loadStats();
      await loadCloudBackups();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create backup' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to delete backup: ${filename}?`)) {
      return;
    }

    try {
      await api.delete(`/backup/${filename}`);
      setMessage({ type: 'success', text: 'Backup deleted successfully!' });
      await loadBackups();
      await loadStats();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete backup' });
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      // Get the token for authentication
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'Please login to download backup' });
        return;
      }

      // Get base URL
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const baseURL = hostname !== 'localhost' && hostname !== '127.0.0.1'
        ? `${protocol}//${hostname}:3001/api`
        : '/api';

      // Create download URL with token
      const downloadUrl = `${baseURL}/backup/download/${filename}`;

      // Fetch the file with authentication
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download backup');
      }

      // Get the blob
      const blob = await response.blob();

      // Verify it's a valid SQLite database (check first 16 bytes)
      const arrayBuffer = await blob.slice(0, 16).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const magicString = String.fromCharCode(...uint8Array);
      
      if (!magicString.startsWith('SQLite format 3')) {
        setMessage({ type: 'error', text: 'Downloaded file is not a valid SQLite database! Please try downloading again.' });
        return;
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Verify the backup on server side as well
      try {
        const verifyResponse = await api.post('/backup/verify', { filename });
        if (verifyResponse.data.valid) {
          setMessage({ 
            type: 'success', 
            text: `✅ Backup downloaded successfully! File verified (${verifyResponse.data.sizeMB} MB). This file can be restored/imported anytime.` 
          });
        } else {
          setMessage({ 
            type: 'warning', 
            text: '⚠️ File downloaded but server verification failed. Please try downloading again.' 
          });
        }
      } catch (verifyErr) {
        // If verification fails, at least we verified client-side
        setMessage({ 
          type: 'success', 
          text: '✅ Backup downloaded successfully! File appears to be valid SQLite database.' 
        });
      }
    } catch (err: any) {
      console.error('Download error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to download backup' });
    }
  };

  const handleRestoreClick = (backup: Backup) => {
    setSelectedBackup(backup);
    setRestoreDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!selectedBackup) return;

    if (!window.confirm(`⚠️ WARNING: This will replace your current database with the backup from ${selectedBackup.createdAt.toLocaleString()}. This action cannot be undone. Are you absolutely sure?`)) {
      return;
    }

    try {
      await api.post(`/backup/restore/${selectedBackup.filename}`);
      setMessage({ 
        type: 'success', 
        text: 'Database restored successfully! Please restart the server for changes to take effect.' 
      });
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to restore backup' });
    }
  };

  const handleCleanOldBackups = async () => {
    if (!window.confirm('Delete backups older than 30 days?')) {
      return;
    }

    try {
      const response = await api.post('/backup/clean', { daysToKeep: 30 });
      setMessage({ type: 'success', text: response.data.message });
      await loadBackups();
      await loadStats();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to clean backups' });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Container maxWidth="xl">
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BackupIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              Data Backup & Safety
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={creating ? <CircularProgress size={20} /> : <BackupIcon />}
              onClick={handleCreateBackup}
              disabled={creating}
            >
              Create Backup Now
            </Button>
            <Button
              variant="outlined"
              onClick={handleCleanOldBackups}
            >
              Clean Old Backups
            </Button>
          </Box>
        </Box>

        {message && (
          <Alert 
            severity={message.type} 
            onClose={() => setMessage(null)}
            sx={{ mb: 2 }}
          >
            {message.text}
          </Alert>
        )}

        {/* Statistics Cards */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Backups
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalBackups}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Size
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalSizeMB} MB
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Cloud Backups
                  </Typography>
                  <Typography variant="h4">
                    {stats.cloudBackups}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Latest Backup
                  </Typography>
                  <Typography variant="body2">
                    {stats.newestBackup 
                      ? format(new Date(stats.newestBackup), 'MMM dd, yyyy HH:mm')
                      : 'No backups yet'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Info Alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Automatic Backups:</strong> Your database is automatically backed up daily at 2 AM. 
            Backups are saved locally and uploaded to Google Drive (if configured).
          </Typography>
        </Alert>

        {/* Local Backups Table */}
        <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>
          <StorageIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Local Backups
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Filename</strong></TableCell>
                  <TableCell><strong>Size</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No backups found. Create your first backup now!
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  backups.map((backup) => (
                    <TableRow key={backup.filename} hover>
                      <TableCell>{backup.filename}</TableCell>
                      <TableCell>{formatFileSize(backup.size)}</TableCell>
                      <TableCell>
                        {format(new Date(backup.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {backup.verified ? (
                          <Chip 
                            icon={<CheckCircleIcon />} 
                            label="Verified" 
                            color="success" 
                            size="small" 
                          />
                        ) : (
                          <Chip 
                            icon={<ErrorIcon />} 
                            label="Not Verified" 
                            color="warning" 
                            size="small" 
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Download">
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadBackup(backup.filename)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Restore">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleRestoreClick(backup)}
                          >
                            <RestoreIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteBackup(backup.filename)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Cloud Backups Table */}
        {cloudBackups.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
              <CloudUploadIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Google Drive Backups
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Filename</strong></TableCell>
                    <TableCell><strong>Size</strong></TableCell>
                    <TableCell><strong>Modified</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cloudBackups.map((backup: any) => (
                    <TableRow key={backup.id} hover>
                      <TableCell>{backup.name}</TableCell>
                      <TableCell>{formatFileSize(parseInt(backup.size || '0'))}</TableCell>
                      <TableCell>
                        {format(new Date(backup.modifiedTime), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Download from Cloud">
                          <IconButton
                            size="small"
                            onClick={() => {
                              api.post(`/backup/cloud/download/${backup.id}`)
                                .then(() => {
                                  setMessage({ type: 'success', text: 'Backup downloaded from Google Drive!' });
                                  loadBackups();
                                })
                                .catch((err) => {
                                  setMessage({ type: 'error', text: 'Failed to download from Google Drive' });
                                });
                            }}
                          >
                            <CloudDownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete from Cloud">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              if (window.confirm('Delete this backup from Google Drive?')) {
                                api.delete(`/backup/cloud/${backup.id}`)
                                  .then(() => {
                                    setMessage({ type: 'success', text: 'Backup deleted from Google Drive!' });
                                    loadCloudBackups();
                                  })
                                  .catch((err) => {
                                    setMessage({ type: 'error', text: 'Failed to delete from Google Drive' });
                                  });
                              }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)}>
        <DialogTitle>Restore Database</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Warning:</strong> This will replace your current database with the backup. 
            All current data will be lost. This action cannot be undone.
          </Alert>
          <Typography>
            Restore from: <strong>{selectedBackup?.filename}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Created: {selectedBackup ? format(new Date(selectedBackup.createdAt), 'MMM dd, yyyy HH:mm:ss') : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRestoreConfirm} variant="contained" color="error">
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
