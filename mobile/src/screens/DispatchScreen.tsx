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
  FlatList,
  Modal,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QRCodeScanner from 'react-native-qrcode-scanner';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Party, DispatchItem } from '../types';
import { connectWebSocket, onDispatchCreated, onPartyCreated, onPartyUpdated, offDispatchCreated, offPartyCreated, offPartyUpdated } from '../services/websocket';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/colors';

export default function DispatchScreen() {
  const { isAdmin, user } = useAuth();
  const [partyName, setPartyName] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partyOptions, setPartyOptions] = useState<Party[]>([]);
  const [items, setItems] = useState<DispatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastDispatchId, setLastDispatchId] = useState<number | null>(null);
  const [billTypeModalVisible, setBillTypeModalVisible] = useState(false);
  const [creatingBill, setCreatingBill] = useState(false);

  useEffect(() => {
    if (partySearch.trim().length >= 1) {
      searchParties();
    } else {
      setPartyOptions([]);
    }
  }, [partySearch]);

  // Real-time updates via WebSocket
  useEffect(() => {
    // Connect WebSocket on mount
    connectWebSocket();

    const handleDispatchCreated = () => {
      // Clear form after dispatch is created
      setItems([]);
      setPartyName('');
      setSelectedParty(null);
    };

    const handlePartyCreated = (party: Party) => {
      // Update party options if needed
      setPartyOptions((prev) => {
        const exists = prev.find((p) => p.id === party.id);
        if (!exists) {
          return [...prev, party];
        }
        return prev;
      });
    };

    const handlePartyUpdated = (party: Party) => {
      // Update selected party if it was updated
      if (selectedParty?.id === party.id) {
        setSelectedParty(party);
      }
      // Update party options
      setPartyOptions((prev) => {
        const index = prev.findIndex((p) => p.id === party.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = party;
          return updated;
        }
        return prev;
      });
    };

    onDispatchCreated(handleDispatchCreated);
    onPartyCreated(handlePartyCreated);
    onPartyUpdated(handlePartyUpdated);

    return () => {
      offDispatchCreated(handleDispatchCreated);
      offPartyCreated(handlePartyCreated);
      offPartyUpdated(handlePartyUpdated);
    };
  }, [selectedParty]);

  const searchParties = async () => {
    try {
      const response = await api.get('/parties/search', { params: { q: partySearch.trim() } });
      setPartyOptions(response.data || []);
    } catch (err) {
      console.error('Failed to search parties:', err);
    }
  };

  const handleBarcodeScanned = async (e: any) => {
    const barcode = e.data;
    setScannerOpen(false);

    try {
      const response = await api.get(`/inventory/barcode/${barcode}`);
      const product = response.data;

      const existingItem = items.find(item => item.barcode === barcode);
      if (existingItem) {
        setItems(items.map(item =>
          item.barcode === barcode
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        setItems([...items, {
          barcode,
          product,
          quantity: 1,
        }]);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Product not found for this barcode');
    }
  };

  const handleRemoveItem = (barcode: string) => {
    setItems(items.filter(item => item.barcode !== barcode));
  };

  const handleSubmit = async () => {
    if (!selectedParty) {
      Alert.alert('Error', 'Please select a party');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }

    setLoading(true);
    try {
      const dispatchData = {
        party_name: selectedParty.name,
        items: items.map(item => ({
          barcode: item.barcode,
          quantity: item.quantity,
        })),
      };

      const response = await api.post('/dispatch', dispatchData);
      const dispatchId = response.data?.id;
      setLastDispatchId(dispatchId ?? null);

      if (showBothBoxes && dispatchId) {
        setBillTypeModalVisible(true);
        setItems([]);
        setSelectedParty(null);
        setPartyName('');
      } else if (dispatchId && !showBothBoxes && user?.company) {
        setCreatingBill(true);
        try {
          await api.post('/bills', { dispatch_id: dispatchId, bill_type: user.company });
          Alert.alert('Success', 'Dispatch and bill created successfully!');
        } catch (billErr: any) {
          Alert.alert('Error', billErr.response?.data?.error || 'Bill create failed');
        } finally {
          setCreatingBill(false);
          setLastDispatchId(null);
        }
        setItems([]);
        setSelectedParty(null);
        setPartyName('');
      } else {
        Alert.alert('Success', 'Dispatch created successfully!');
        setItems([]);
        setSelectedParty(null);
        setPartyName('');
        setLastDispatchId(null);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create dispatch');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBill = async (billType: 'aaradhya_fashion' | 'af_creation') => {
    if (!lastDispatchId) return;
    setBillTypeModalVisible(false);
    setCreatingBill(true);
    try {
      await api.post('/bills', { dispatch_id: lastDispatchId, bill_type: billType });
      Alert.alert('Success', `Bill created (${billType === 'aaradhya_fashion' ? 'Aaradhya Fashion' : 'AF Creation'})`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create bill');
    } finally {
      setCreatingBill(false);
      setLastDispatchId(null);
    }
  };

  const showBothBoxes = isAdmin || user?.hasBothCompanies === true;

  return (
    <>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Premium Header */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Icon name="local-shipping" size={28} color={colors.primary} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Create Dispatch</Text>
            <Text style={styles.subtitle}>Ship products to party</Text>
          </View>
        </View>

        {/* Party Selection Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="business" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Select Party</Text>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Party Name</Text>
            <View style={styles.inputWrapper}>
              <Icon name="search" size={18} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={partyName}
                onChangeText={(text) => {
                  setPartyName(text);
                  setPartySearch(text);
                }}
                placeholder="Search or enter party name"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          {partyOptions.length > 0 && (
            <View style={styles.partyOptions}>
              {partyOptions.map(party => (
                <TouchableOpacity
                  key={party.id}
                  style={styles.partyOption}
                  onPress={() => {
                    setSelectedParty(party);
                    setPartyName(party.name);
                    setPartyOptions([]);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.partyOptionName}>{party.name}</Text>
                  {(party.address || party.phone) && (
                    <View style={styles.partyOptionDetails}>
                      {party.address ? (
                        <Text style={styles.partyOptionDetail} numberOfLines={1}>{party.address}</Text>
                      ) : null}
                      {party.phone ? (
                        <Text style={styles.partyOptionDetail}>{party.phone}</Text>
                      ) : null}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          </View>
        </View>

        {/* Scan Button - enabled only after party is selected */}
        <TouchableOpacity
          style={[styles.scanButton, !selectedParty && styles.scanButtonDisabled]}
          onPress={() => selectedParty && setScannerOpen(true)}
          activeOpacity={0.8}
          disabled={!selectedParty}
        >
          <View style={[styles.scanButtonIcon, !selectedParty && styles.scanButtonIconDisabled]}>
            <Icon name="qr-code-scanner" size={28} color={selectedParty ? colors.textWhite : colors.textDisabled} />
          </View>
          <Text style={[styles.scanButtonText, !selectedParty && styles.scanButtonTextDisabled]}>Scan Barcode</Text>
        </TouchableOpacity>
        {!selectedParty && (
          <Text style={styles.scanHint}>Select a party above to enable barcode scanning</Text>
        )}

        {/* Items List */}
        {items.length > 0 && (
          <View style={styles.itemsContainer}>
            <View style={styles.itemsHeader}>
              <View style={styles.itemsHeaderLeft}>
                <Icon name="inventory" size={20} color={colors.primary} />
                <Text style={styles.itemsTitle}>Items ({items.length})</Text>
              </View>
            </View>
            {items.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemIconContainer}>
                  <Icon name="check-circle" size={24} color={colors.success} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemDesign}>{item.product?.design_number}</Text>
                  <Text style={styles.itemColor}>{item.product?.color_description ?? item.product?.color}</Text>
                  <View style={styles.itemPriceRow}>
                    <Icon name="attach-money" size={14} color={colors.success} />
                    <Text style={styles.itemPrice}>₹{item.product?.selling_price}</Text>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <View style={styles.quantityBadge}>
                    <Text style={styles.itemQuantity}>{item.quantity}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleRemoveItem(item.barcode)}
                  >
                    <Icon name="delete" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Submit Button */}
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
              <Icon name="send" size={22} color={colors.textWhite} />
              <Text style={styles.buttonText}>Create Dispatch</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={scannerOpen}
        animationType="slide"
        onRequestClose={() => setScannerOpen(false)}
      >
        <View style={styles.scannerContainer}>
          <QRCodeScanner
            onRead={handleBarcodeScanned}
            topContent={
              <Text style={styles.scannerText}>Scan barcode</Text>
            }
            bottomContent={
              <TouchableOpacity
                style={styles.scannerButton}
                onPress={() => setScannerOpen(false)}
              >
                <Text style={styles.scannerButtonText}>Cancel</Text>
              </TouchableOpacity>
            }
          />
        </View>
      </Modal>

      <Modal
        visible={billTypeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setBillTypeModalVisible(false); setLastDispatchId(null); }}
      >
        <View style={styles.billTypeModalOverlay}>
          <View style={styles.billTypeModalContent}>
            <Text style={styles.billTypeModalTitle}>Create Bill</Text>
            <Text style={styles.billTypeModalSubtitle}>Select bill type</Text>
            {creatingBill && (
              <ActivityIndicator color={colors.primary} size="small" style={{ marginBottom: spacing.sm }} />
            )}
            <TouchableOpacity
              style={[styles.billTypeButton, styles.billTypeButtonAF, creatingBill && styles.buttonDisabled]}
              onPress={() => handleCreateBill('aaradhya_fashion')}
              disabled={creatingBill}
            >
              <Icon name="store" size={22} color={colors.textWhite} />
              <Text style={styles.billTypeButtonText}>Aaradhya Fashion</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.billTypeButton, styles.billTypeButtonAFC, creatingBill && styles.buttonDisabled]}
              onPress={() => handleCreateBill('af_creation')}
              disabled={creatingBill}
            >
              <Icon name="business" size={22} color={colors.textWhite} />
              <Text style={styles.billTypeButtonText}>AF Creation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.billTypeSkipButton}
              onPress={() => { setBillTypeModalVisible(false); setLastDispatchId(null); }}
              disabled={creatingBill}
            >
              <Text style={styles.billTypeSkipText}>Skip (bill later)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </>
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
    backgroundColor: colors.primaryLightest,
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
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cardTitle: {
    ...typography.h6,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body2,
    marginBottom: spacing.sm,
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
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  partyOptions: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    maxHeight: 200,
    ...shadows.md,
  },
  partyOption: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  partyOptionName: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  partyOptionDetails: {
    gap: spacing.xs,
  },
  partyOptionDetail: {
    ...typography.body3,
    color: colors.textTertiary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  scanButton: {
    backgroundColor: colors.buttonPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
    ...shadows.primary,
  },
  scanButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonText: {
    ...typography.button,
    color: colors.textWhite,
    fontSize: 17,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  scanButtonDisabled: {
    backgroundColor: colors.buttonSecondary,
    opacity: 0.85,
  },
  scanButtonIconDisabled: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  scanButtonTextDisabled: {
    color: colors.textDisabled,
  },
  scanHint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  itemsContainer: {
    marginBottom: spacing.lg,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  itemsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemsTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  itemCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  itemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.successBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemDesign: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  itemColor: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemPrice: {
    ...typography.body2,
    color: colors.success,
    fontWeight: '600',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quantityBadge: {
    backgroundColor: colors.primaryLightest,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  itemQuantity: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '700',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  deleteButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.errorBackground,
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
  buttonText: {
    ...typography.button,
    color: colors.textWhite,
    fontSize: 17,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerText: {
    fontSize: 20,
    color: colors.textWhite,
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  scannerButton: {
    backgroundColor: colors.buttonPrimary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    margin: spacing.lg,
  },
  scannerButtonText: {
    ...typography.button,
    color: colors.textWhite,
    textAlign: 'center',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  billTypeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  billTypeModalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
  billTypeModalTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  billTypeModalSubtitle: {
    ...typography.body2,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  billTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  billTypeButtonAF: {
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  billTypeButtonAFC: {
    backgroundColor: colors.info,
  },
  billTypeButtonText: {
    ...typography.button,
    color: colors.textWhite,
    fontSize: 16,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  billTypeSkipButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  billTypeSkipText: {
    ...typography.body2,
    color: colors.textTertiary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
});
