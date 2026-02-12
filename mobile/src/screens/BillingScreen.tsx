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
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Bill } from '../types';
import { format } from 'date-fns';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { connectWebSocket, onBillCreated, onBillUpdated, offBillCreated, offBillUpdated } from '../services/websocket';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/colors';
import { generateTaxInvoiceHTML, generateAFCreationInvoiceHTML } from '../utils/invoiceHtml';

function formatBillNumber(bill: { bill_type: 'aaradhya_fashion' | 'af_creation'; invoice_number: number | null; id: number }): string {
  if (bill.invoice_number != null) {
    return bill.bill_type === 'aaradhya_fashion' ? `AF-${bill.invoice_number}` : `AFC-${bill.invoice_number}`;
  }
  return `BILL-${bill.id}`;
}

export default function BillingScreen() {
  const { isAdmin, user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [billSearch, setBillSearch] = useState('');

  useEffect(() => {
    loadBills();
  }, []);

  // Real-time updates via WebSocket
  useEffect(() => {
    // Connect WebSocket on mount
    connectWebSocket();

    const handleBillCreated = (bill: Bill) => {
      // Filter based on user permissions
      if (!isAdmin && !user?.hasBothCompanies && user?.company) {
        if (bill.bill_type !== user.company) return;
      }
      setBills((prev) => [bill, ...prev]);
    };

    const handleBillUpdated = (bill: Bill) => {
      setBills((prev) => {
        const index = prev.findIndex((b) => b.id === bill.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = bill;
          return updated;
        }
        return prev;
      });
    };

    onBillCreated(handleBillCreated);
    onBillUpdated(handleBillUpdated);

    return () => {
      offBillCreated(handleBillCreated);
      offBillUpdated(handleBillUpdated);
    };
  }, [isAdmin, user]);

  const loadBills = async () => {
    setLoading(true);
    try {
      const response = await api.get('/bills', { params: { page: 1, limit: 50 } });
      let allBills = Array.isArray(response.data) ? response.data : response.data.bills || [];
      
      if (!isAdmin && !user?.hasBothCompanies && user?.company) {
        allBills = allBills.filter((bill: Bill) => bill.bill_type === user.company);
      }
      
      setBills(allBills);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const [pdfGeneratingFor, setPdfGeneratingFor] = useState<number | null>(null);

  const generateBillPDFFile = async (bill: Bill): Promise<{ filePath: string } | null> => {
    const billDetails = await api.get(`/bills/${bill.id}`);
    const items = billDetails.data.items || [];
    const dateStr = format(new Date(bill.bill_date), 'dd/MM/yyyy');
    const html = bill.bill_type === 'aaradhya_fashion'
      ? generateTaxInvoiceHTML(bill, items, dateStr)
      : generateAFCreationInvoiceHTML(bill, items, dateStr);
    const options = {
      html,
      fileName: `Bill-${formatBillNumber(bill)}`,
      directory: 'Documents',
    };
    const file = await RNHTMLtoPDF.convert(options);
    return file?.filePath ? { filePath: file.filePath } : null;
  };

  const handleDownloadPDF = async (bill: Bill) => {
    if (pdfGeneratingFor !== null) return;
    setPdfGeneratingFor(bill.id);
    try {
      const result = await generateBillPDFFile(bill);
      if (result) {
        Alert.alert('Done', 'PDF downloaded. Saved in app Documents.');
      } else {
        Alert.alert('Error', 'Failed to generate PDF');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setPdfGeneratingFor(null);
    }
  };

  const handleSharePDF = async (bill: Bill) => {
    if (pdfGeneratingFor !== null) return;
    setPdfGeneratingFor(bill.id);
    try {
      const result = await generateBillPDFFile(bill);
      if (result) {
        await Share.open({
          url: Platform.OS === 'android' ? `file://${result.filePath}` : result.filePath,
          type: 'application/pdf',
        });
      } else {
        Alert.alert('Error', 'Failed to generate PDF');
      }
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share PDF');
      }
    } finally {
      setPdfGeneratingFor(null);
    }
  };

  const handleDeleteBill = (bill: Bill) => {
    Alert.alert(
      'Delete Bill',
      `Delete bill ${formatBillNumber(bill)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/bills/${bill.id}`);
              setBills((prev) => prev.filter((b) => b.id !== bill.id));
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to delete bill');
            }
          },
        },
      ]
    );
  };

  const renderBill = ({ item }: { item: Bill }) => {
    const isAF = item.bill_type === 'aaradhya_fashion';
    return (
      <View style={styles.billCard}>
        <View style={[styles.billCardAccent, isAF ? styles.billCardAccentAF : styles.billCardAccentAFC]} />
        <View style={styles.billCardInner}>
          <View style={styles.billHeader}>
            <View style={styles.billHeaderLeft}>
              <View style={[styles.billTypeChip, isAF ? styles.billTypeChipAF : styles.billTypeChipAFC]}>
                <Text style={[styles.billTypeChipText, isAF ? styles.billTypeChipTextAF : styles.billTypeChipTextAFC]}>{isAF ? 'Aaradhya Fashion' : 'AF Creation'}</Text>
              </View>
              <Text style={styles.billNumber}>{formatBillNumber(item)}</Text>
            </View>
            <View style={styles.billIconWrap}>
              <Icon name="receipt-long" size={28} color={isAF ? colors.primary : colors.info} />
            </View>
          </View>
          <View style={styles.billMeta}>
            <View style={styles.billMetaRow}>
              <Icon name="business" size={18} color={colors.textTertiary} style={styles.billMetaIcon} />
              <Text style={styles.partyName} numberOfLines={1}>{item.party_name}</Text>
            </View>
            <View style={styles.billMetaRow}>
              <Icon name="event" size={18} color={colors.textTertiary} style={styles.billMetaIcon} />
              <Text style={styles.billDate}>{format(new Date(item.bill_date), 'dd MMM yyyy')}</Text>
            </View>
          </View>
          <View style={styles.billFooter}>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={[styles.billTotal, isAF ? styles.billTotalAF : styles.billTotalAFC]}>₹{item.total_amount.toFixed(2)}</Text>
            </View>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.downloadButton, pdfGeneratingFor === item.id && styles.actionButtonDisabled]}
                onPress={() => handleDownloadPDF(item)}
                activeOpacity={0.85}
                disabled={pdfGeneratingFor !== null}
              >
                {pdfGeneratingFor === item.id ? (
                  <ActivityIndicator size="small" color={colors.textWhite} />
                ) : (
                  <>
                    <Icon name="download" size={18} color={colors.textWhite} />
                    <Text style={styles.downloadButtonText}>Download</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareButton, pdfGeneratingFor === item.id && styles.actionButtonDisabled]}
                onPress={() => handleSharePDF(item)}
                activeOpacity={0.85}
                disabled={pdfGeneratingFor !== null}
              >
                <Icon name="share" size={18} color={isAF ? colors.primary : colors.info} />
                <Text style={[styles.shareButtonText, isAF ? styles.shareButtonTextAF : styles.shareButtonTextAFC]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBillButton}
                onPress={() => handleDeleteBill(item)}
                activeOpacity={0.85}
              >
                <Icon name="delete" size={18} color={colors.error} />
                <Text style={styles.deleteBillButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading && bills.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading bills...</Text>
      </View>
    );
  }

  const q = billSearch.trim().toLowerCase();
  const filteredBills = q
    ? bills.filter(
        (b) =>
          formatBillNumber(b).toLowerCase().includes(q) ||
          b.party_name.toLowerCase().includes(q) ||
          format(new Date(b.bill_date), 'dd/MM/yyyy').includes(q) ||
          format(new Date(b.bill_date), 'dd MMM yyyy').toLowerCase().includes(q)
      )
    : bills;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Billing</Text>
        <Text style={styles.headerSubtitle}>Invoices & bills</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>
      <View style={styles.searchContainer}>
        <Icon name="search" size={22} color={colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by bill no, party, date..."
          placeholderTextColor={colors.inputPlaceholder}
          value={billSearch}
          onChangeText={setBillSearch}
        />
        {billSearch.length > 0 && (
          <TouchableOpacity onPress={() => setBillSearch('')} style={styles.clearSearch} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Icon name="close" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={filteredBills}
        renderItem={renderBill}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadBills}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Icon name="description" size={48} color={colors.borderDark} />
            </View>
            <Text style={styles.emptyTitle}>{billSearch.trim() ? 'No matching bills' : 'No bills yet'}</Text>
            <Text style={styles.emptyText}>{billSearch.trim() ? 'Try a different search' : 'Bills will appear here after dispatch'}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLighter,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  clearSearch: {
    padding: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  billCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.cardBackground,
    overflow: 'hidden',
    ...shadows.md,
    elevation: 3,
  },
  billCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  billCardAccentAF: {
    backgroundColor: colors.primary,
  },
  billCardAccentAFC: {
    backgroundColor: colors.info,
  },
  billCardInner: {
    padding: spacing.lg,
    paddingLeft: spacing.lg + 4,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  billHeaderLeft: {
    flex: 1,
  },
  billTypeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  billTypeChipAF: {
    backgroundColor: colors.primaryLighter,
  },
  billTypeChipAFC: {
    backgroundColor: colors.infoBackground,
  },
  billTypeChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  billTypeChipTextAF: {
    color: colors.primary,
  },
  billTypeChipTextAFC: {
    color: colors.info,
  },
  billNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  billIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billMeta: {
    marginBottom: spacing.md,
  },
  billMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  billMetaIcon: {
    marginRight: spacing.sm,
  },
  partyName: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  billDate: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  totalBox: {
    minWidth: 120,
  },
  totalLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 2,
    fontWeight: '500',
  },
  billTotal: {
    fontSize: 22,
    fontWeight: '700',
  },
  billTotalAF: {
    color: colors.primary,
  },
  billTotalAFC: {
    color: colors.info,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    gap: 6,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundDark,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
    fontSize: 14,
  },
  shareButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  shareButtonTextAF: {
    color: colors.primary,
  },
  shareButtonTextAFC: {
    color: colors.info,
  },
  deleteBillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.errorBackground || '#fde8e8',
    borderWidth: 1.5,
    borderColor: colors.error,
    gap: 6,
  },
  deleteBillButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.error,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.textTertiary,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
