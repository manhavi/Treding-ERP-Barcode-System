import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../services/api';
import { colors } from '../theme/colors';
import { format } from 'date-fns';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

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

export default function BackupScreen() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadBackups(), loadStats()]);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadBackups = async () => {
    try {
      const response = await api.get('/backup/list');
      setBackups(response.data);
    } catch (err: any) {
      console.error('Failed to load backups:', err);
      Alert.alert('Error', 'Failed to load backups');
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/backup/stats');
      setStats(response.data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await api.post('/backup/create');
      Alert.alert('Success', 'Backup created successfully!');
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      Alert.alert(
        'Download Backup',
        'This will download the backup file to your device.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: async () => {
              try {
                // Get the token for authentication
                const token = await api.defaults.headers.Authorization;
                
                // Create download path
                const downloadPath = `${RNFS.DownloadDirectoryPath}/${filename}`;
                
                // Download file
                const response = await RNFS.downloadFile({
                  fromUrl: `${api.defaults.baseURL}/backup/download/${filename}`,
                  toFile: downloadPath,
                  headers: {
                    Authorization: token || '',
                  },
                }).promise;

                if (response.statusCode === 200) {
                  Alert.alert(
                    'Success',
                    `Backup downloaded successfully!\n\nLocation: ${downloadPath}`,
                    [
                      {
                        text: 'Share',
                        onPress: () => {
                          Share.open({
                            url: `file://${downloadPath}`,
                            type: 'application/octet-stream',
                          }).catch(err => console.log('Share error:', err));
                        },
                      },
                      { text: 'OK' },
                    ]
                  );
                } else {
                  Alert.alert('Error', 'Failed to download backup');
                }
              } catch (err: any) {
                Alert.alert('Error', 'Failed to download backup');
                console.error('Download error:', err);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', 'Failed to download backup');
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    Alert.alert(
      'Delete Backup',
      `Are you sure you want to delete backup: ${filename}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/backup/${filename}`);
              Alert.alert('Success', 'Backup deleted successfully!');
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to delete backup');
            }
          },
        },
      ]
    );
  };

  const handleRestoreBackup = async (backup: Backup) => {
    Alert.alert(
      'Restore Database',
      `⚠️ WARNING: This will replace your current database with the backup from ${format(new Date(backup.createdAt), 'dd/MM/yyyy HH:mm')}. This action cannot be undone. Are you absolutely sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/backup/restore/${backup.filename}`);
              Alert.alert(
                'Success',
                'Database restored successfully! Please restart the app for changes to take effect.'
              );
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to restore backup');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const renderBackupItem = ({ item }: { item: Backup }) => (
    <View style={styles.backupCard}>
      <View style={styles.backupHeader}>
        <View style={styles.backupInfo}>
          <Text style={styles.backupFilename} numberOfLines={1}>
            {item.filename}
          </Text>
          <Text style={styles.backupDate}>
            {format(new Date(item.createdAt), 'dd MMM yyyy, HH:mm')}
          </Text>
          <Text style={styles.backupSize}>{formatFileSize(item.size)}</Text>
        </View>
        <View style={styles.backupStatus}>
          {item.verified ? (
            <View style={styles.verifiedBadge}>
              <Icon name="check-circle" size={16} color="#4caf50" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : (
            <View style={styles.unverifiedBadge}>
              <Icon name="error" size={16} color="#ff9800" />
              <Text style={styles.unverifiedText}>Not Verified</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.backupActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDownloadBackup(item.filename)}
        >
          <Icon name="download" size={20} color="colors.primary" />
          <Text style={styles.actionButtonText}>Download</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleRestoreBackup(item)}
        >
          <Icon name="restore" size={20} color="#2e7d32" />
          <Text style={styles.actionButtonText}>Restore</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteBackup(item.filename)}
        >
          <Icon name="delete" size={20} color="#d32f2f" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && backups.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="colors.primary" />
        <Text style={styles.loadingText}>Loading backups...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Icon name="backup" size={32} color="colors.primary" />
            <Text style={styles.headerTitle}>Database Backup</Text>
          </View>
          <TouchableOpacity
            style={[styles.createButton, creating && styles.createButtonDisabled]}
            onPress={handleCreateBackup}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="add-circle" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Create Backup</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Statistics */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalBackups}</Text>
              <Text style={styles.statLabel}>Total Backups</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalSizeMB} MB</Text>
              <Text style={styles.statLabel}>Total Size</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.cloudBackups}</Text>
              <Text style={styles.statLabel}>Cloud Backups</Text>
            </View>
          </View>
        )}

        {/* Info Alert */}
        <View style={styles.infoBox}>
          <Icon name="info" size={20} color="colors.primary" />
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>Automatic Backups:</Text> Your database is
            automatically backed up daily at 2 AM. Backups are saved locally and uploaded
            to Google Drive (if configured).
          </Text>
        </View>

        {/* Backups List */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>
            <Icon name="storage" size={20} color="#333" /> Local Backups
          </Text>
          {backups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="backup" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No backups found</Text>
              <Text style={styles.emptySubtext}>
                Create your first backup to protect your data
              </Text>
            </View>
          ) : (
            <FlatList
              data={backups}
              renderItem={renderBackupItem}
              keyExtractor={(item) => item.filename}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#333',
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  createButton: {
    backgroundColor: 'colors.primary',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'colors.primary',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: 'colors.primary',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  backupCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  backupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backupInfo: {
    flex: 1,
  },
  backupFilename: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  backupDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  backupSize: {
    fontSize: 12,
    color: '#999',
  },
  backupStatus: {
    marginLeft: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 11,
    color: '#4caf50',
    marginLeft: 4,
    fontWeight: '600',
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  unverifiedText: {
    fontSize: 11,
    color: '#ff9800',
    marginLeft: 4,
    fontWeight: '600',
  },
  backupActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
    color: '#333',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
  },
});
