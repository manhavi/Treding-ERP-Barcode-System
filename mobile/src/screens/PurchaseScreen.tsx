import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { fromByteArray } from 'base64-js';
import api, { getBaseURL } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/colors';

export default function PurchaseScreen() {
  const [designNumber, setDesignNumber] = useState('');
  const [colorDescription, setColorDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [barcode, setBarcode] = useState<string>('');
  const [importExportLoading, setImportExportLoading] = useState<'export' | 'import' | null>(null);

  useEffect(() => {
    if (designNumber) {
      const generatedBarcode = designNumber.replace(/\s+/g, '').toUpperCase();
      setBarcode(generatedBarcode);
    }
  }, [designNumber]);

  const handleSubmit = async () => {
    if (!designNumber || !colorDescription || !sellingPrice || !purchasePrice) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const purchaseData = {
        design_number: designNumber,
        color_description: colorDescription,
        selling_price: parseFloat(sellingPrice),
        purchase_price: parseFloat(purchasePrice),
        quantity: 0,
      };

      await api.post('/purchases', purchaseData);
      Alert.alert('Success', 'Purchase added successfully!');
      resetForm();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add purchase');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDesignNumber('');
    setColorDescription('');
    setSellingPrice('');
    setPurchasePrice('');
    setBarcode('');
  };

  const handleExportXL = async () => {
    setImportExportLoading('export');
    try {
      const res = await api.get('/purchases/export', { responseType: 'arraybuffer' });
      const buffer = res.data as ArrayBuffer;
      const base64 = fromByteArray(new Uint8Array(buffer));
      if (!base64) {
        throw new Error('Could not read export file');
      }
      const path = `${RNFS.DocumentDirectoryPath}/purchases-export-${Date.now()}.xlsx`;
      await RNFS.writeFile(path, base64, 'base64');
      await Share.open({
        url: Platform.OS === 'android' ? `file://${path}` : path,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        title: 'Export Purchases',
      });
      Alert.alert('Success', 'Excel exported. You can save or share it.');
      try {
        await RNFS.unlink(path);
      } catch (_) {}
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || e.message || 'Export failed');
    } finally {
      setImportExportLoading(null);
    }
  };

  const handleImportXL = async () => {
    setImportExportLoading('import');
    try {
      const result = await DocumentPicker.pickSingle({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyTo: 'documentDirectory',
      });
      const formData = new FormData();
      formData.append('file', {
        uri: result.fileCopyUri || result.uri,
        type: result.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        name: result.name || 'import.xlsx',
      } as any);
      const token = await AsyncStorage.getItem('token');
      const base = getBaseURL();
      const res = await fetch(`${base}/purchases/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Import failed');
      const { created = 0, updated = 0, deleted = 0, errors = [] } = data;
      let msg = data.message || `Import complete: ${created} created, ${updated} updated.`;
      if (deleted > 0) msg += ` ${deleted} removed (inventory synced to file).`;
      if (errors.length) msg += ` (${errors.length} row errors)`;
      Alert.alert('Success', msg);
    } catch (e: any) {
      if (e.code !== 'DOCUMENT_PICKER_CANCELED') {
        Alert.alert('Error', e.message || 'Import failed');
      }
    } finally {
      setImportExportLoading(null);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Premium Header */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Icon name="shopping-cart" size={28} color={colors.primary} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Add Purchase</Text>
            <Text style={styles.subtitle}>Create new product entry</Text>
          </View>
        </View>

        {/* Bulk Excel – compact */}
        <View style={styles.excelCard}>
          <View style={styles.excelRow}>
            <Icon name="table-chart" size={16} color={colors.primary} />
            <Text style={styles.excelLabel}>Bulk data (Excel)</Text>
            <View style={styles.excelButtons}>
              <TouchableOpacity
                style={[styles.excelBtn, importExportLoading && styles.buttonDisabled]}
                onPress={handleExportXL}
                disabled={!!importExportLoading}
                activeOpacity={0.8}
              >
                {importExportLoading === 'export' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Icon name="file-download" size={16} color={colors.primary} />
                    <Text style={styles.excelBtnText}>Export</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.excelBtn, importExportLoading && styles.buttonDisabled]}
                onPress={handleImportXL}
                disabled={!!importExportLoading}
                activeOpacity={0.8}
              >
                {importExportLoading === 'import' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Icon name="file-upload" size={16} color={colors.primary} />
                    <Text style={styles.excelBtnText}>Import</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.excelHint} numberOfLines={2}>Design No, Colour, Selling & Purchase price. Edit file & re-upload.</Text>
        </View>

        {/* Premium Form Card */}
        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <View style={styles.labelIcon}>
                <Icon name="tag" size={18} color={colors.primary} />
              </View>
              <Text style={styles.label}>Design Number</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={designNumber}
                onChangeText={setDesignNumber}
                placeholder="e.g., Dno 101"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <View style={styles.labelIcon}>
                <Icon name="palette" size={18} color={colors.primary} />
              </View>
              <Text style={styles.label}>Color/Description</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={colorDescription}
                onChangeText={setColorDescription}
                placeholder="Red Lahengha"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: spacing.sm }]}>
              <View style={styles.labelRow}>
                <View style={styles.labelIcon}>
                  <Icon name="attach-money" size={18} color={colors.success} />
                </View>
                <Text style={styles.label}>Selling Price</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                  placeholder="0.00"
                  placeholderTextColor={colors.inputPlaceholder}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: spacing.sm }]}>
              <View style={styles.labelRow}>
                <View style={styles.labelIcon}>
                  <Icon name="payments" size={18} color={colors.warning} />
                </View>
                <Text style={styles.label}>Purchase Price</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                  placeholder="0.00"
                  placeholderTextColor={colors.inputPlaceholder}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>
        </View>

        {barcode && (
          <View style={styles.barcodeContainer}>
            <View style={styles.barcodeIconContainer}>
              <Icon name="qr-code" size={28} color={colors.primary} />
            </View>
            <View style={styles.barcodeTextContainer}>
              <Text style={styles.barcodeLabel}>Generated Barcode</Text>
              <Text style={styles.barcodeText}>{barcode}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.textWhite} />
          ) : (
            <>
              <Icon name="save" size={22} color={colors.textWhite} />
              <Text style={styles.buttonText}>Save Purchase</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  subtitle: {
    ...typography.body3,
    color: colors.textTertiary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.xl,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  labelIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  currencySymbol: {
    ...typography.body1,
    color: colors.textSecondary,
    marginRight: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  priceInput: {
    paddingVertical: spacing.md,
  },
  barcodeContainer: {
    backgroundColor: colors.primaryLightest,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.md,
  },
  barcodeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeTextContainer: {
    flex: 1,
  },
  barcodeLabel: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  barcodeText: {
    ...typography.h5,
    color: colors.primaryDark,
    letterSpacing: 3,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  button: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    ...shadows.primary,
  },
  buttonDisabled: {
    backgroundColor: colors.buttonDisabled,
    ...shadows.sm,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLightest,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.primary,
    fontSize: 15,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  excelCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  excelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  excelLabel: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  excelButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  excelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLightest,
  },
  excelBtnText: {
    ...typography.button,
    color: colors.primary,
    fontSize: 12,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  excelHint: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: spacing.xs,
    paddingLeft: 22,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  buttonText: {
    ...typography.button,
    color: colors.textWhite,
    fontSize: 17,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
});
