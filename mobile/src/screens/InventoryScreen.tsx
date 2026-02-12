import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Barcode from 'react-native-barcode-svg';
import api from '../services/api';
import { Product } from '../types';
import { connectWebSocket, onInventoryUpdated, onInventoryDeleted, onPurchaseCreated, offInventoryUpdated, offInventoryDeleted, offPurchaseCreated } from '../services/websocket';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/colors';

/** Normalize product from API (color_description) for display */
function normalizeProduct(p: any): Product {
  return {
    ...p,
    color: p.color_description ?? p.color,
  };
}

export default function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editColor, setEditColor] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [search]);

  // Real-time updates via WebSocket
  useEffect(() => {
    connectWebSocket();

    const handleInventoryUpdate = (product: any) => {
      setProducts((prev) => {
        const normalized = normalizeProduct(product);
        const index = prev.findIndex((p) => p.id === normalized.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = normalized;
          return updated;
        }
        return prev;
      });
    };

    const handleInventoryDelete = (data: { id: number }) => {
      setProducts((prev) => prev.filter((p) => p.id !== data.id));
    };

    const handlePurchaseCreated = () => {
      loadProducts();
    };

    onInventoryUpdated(handleInventoryUpdate);
    onInventoryDeleted(handleInventoryDelete);
    onPurchaseCreated(handlePurchaseCreated);

    return () => {
      offInventoryUpdated(handleInventoryUpdate);
      offInventoryDeleted(handleInventoryDelete);
      offPurchaseCreated(handlePurchaseCreated);
    };
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = search ? { search } : {};
      const response = await api.get('/inventory', { params });
      setProducts((response.data || []).map(normalizeProduct));
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditColor(product.color_description ?? product.color ?? '');
    setEditPrice(String(product.selling_price));
    setEditModalVisible(true);
  };

  const closeEdit = () => {
    setEditModalVisible(false);
    setSelectedProduct(null);
    setEditColor('');
    setEditPrice('');
  };

  const handleEditSave = async () => {
    if (!selectedProduct) return;
    const color_description = editColor.trim();
    const selling_price = parseFloat(editPrice);
    if (!color_description || isNaN(selling_price) || selling_price < 0) {
      Alert.alert('Error', 'Please enter valid color/description and selling price.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/inventory/${selectedProduct.id}`, {
        color_description,
        selling_price,
      });
      Alert.alert('Success', 'Product updated successfully');
      closeEdit();
      loadProducts();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${product.design_number} - ${product.color_description ?? product.color}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/inventory/${product.id}`);
              Alert.alert('Success', 'Product deleted successfully');
              loadProducts();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const displayColor = (item: Product) => item.color_description ?? item.color ?? '';

  const handleShareBarcode = (item: Product) => {
    const b = item.barcode || item.design_number || '';
    const msg = `Design: ${item.design_number}\nColor: ${displayColor(item)}\nBarcode: ${b}\nPrice: ₹${Number(item.selling_price).toFixed(2)}`;
    Share.share({
      message: msg,
      title: `Barcode ${item.design_number}`,
    }).catch(() => {});
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productIconContainer}>
          <Icon name="inventory" size={24} color={colors.primary} />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.designNumber}>{item.design_number}</Text>
          <Text style={styles.color}>{displayColor(item)}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => handleShareBarcode(item)}
          >
            <Icon name="share" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEdit(item)}
          >
            <Icon name="edit" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Icon name="delete" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Barcode display - visual barcode + number + Print */}
      <View style={styles.barcodeSection}>
        <Text style={styles.barcodeLabel}>Barcode</Text>
        <View style={styles.barcodeWrapper}>
          <Barcode
            value={String(item.barcode || item.design_number || '').trim() || '0'}
            format="CODE128"
            singleBarWidth={1.5}
            height={40}
            lineColor={colors.textPrimary}
            backgroundColor={colors.cardBackground}
          />
        </View>
        <Text style={styles.barcodeText}>{item.barcode}</Text>
        <TouchableOpacity
          style={styles.printBarcodeButton}
          onPress={() => handleShareBarcode(item)}
          activeOpacity={0.8}
        >
          <Icon name="print" size={18} color={colors.primary} />
          <Text style={styles.printBarcodeButtonText}>Print Barcode</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.productDetails}>
        <View style={styles.detailRow}>
          <Icon name="attach-money" size={16} color={colors.success} />
          <Text style={styles.detailText}>₹{Number(item.selling_price).toFixed(2)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="inventory-2" size={16} color={colors.info} />
          <Text style={styles.detailText}>Stock: {item.stock_quantity}</Text>
        </View>
      </View>
    </View>
  );

  if (loading && products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchIconContainer}>
          <Icon name="search" size={20} color={colors.textTertiary} />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by design number, color, or barcode..."
          placeholderTextColor={colors.inputPlaceholder}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearch('')}
          >
            <Icon name="close" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadProducts}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />

      {/* Edit Product Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Product</Text>
            {selectedProduct && (
              <>
                <Text style={styles.modalFieldLabel}>Design Number</Text>
                <Text style={styles.modalFieldValue}>{selectedProduct.design_number}</Text>
                <Text style={styles.modalFieldLabel}>Color / Description</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editColor}
                  onChangeText={setEditColor}
                  placeholder="Color or description"
                  placeholderTextColor={colors.inputPlaceholder}
                />
                <Text style={styles.modalFieldLabel}>Selling Price (₹)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editPrice}
                  onChangeText={setEditPrice}
                  placeholder="0.00"
                  placeholderTextColor={colors.inputPlaceholder}
                  keyboardType="decimal-pad"
                />
              </>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={closeEdit}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, saving && styles.buttonDisabled]}
                onPress={handleEditSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.textWhite} />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.md,
  },
  searchIconContainer: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  productCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  productIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  designNumber: {
    ...typography.h5,
    color: colors.primary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  color: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shareButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLightest,
  },
  editButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLightest,
  },
  deleteButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.errorBackground,
  },
  barcodeSection: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  barcodeLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  barcodeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  barcodeText: {
    ...typography.caption,
    marginTop: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo',
  },
  printBarcodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLightest,
  },
  printBarcodeButtonText: {
    ...typography.button,
    color: colors.primary,
    fontSize: 14,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  productDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    ...typography.body2,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body2,
    color: colors.textTertiary,
    marginTop: spacing.md,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body1,
    color: colors.textDisabled,
    fontWeight: '500',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.xl,
  },
  modalTitle: {
    ...typography.h5,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  modalFieldLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  modalFieldValue: {
    ...typography.body1,
    color: colors.textDisabled,
    marginBottom: spacing.md,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalCancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modalCancelText: {
    ...typography.button,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  modalSaveText: {
    ...typography.button,
    color: colors.textWhite,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
