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
import api from '../services/api';
import { Party } from '../types';
import { connectWebSocket, onPartyCreated, onPartyUpdated, onPartyDeleted, offPartyCreated, offPartyUpdated, offPartyDeleted } from '../services/websocket';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/colors';

export default function PartyListScreen() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    alternate_phone: '',
    gstin: '',
    place_of_supply: '24-Gujarat',
    transport: '',
    station: '',
    agent: '',
  });

  useEffect(() => {
    loadParties();
  }, []);

  // Real-time updates via WebSocket
  useEffect(() => {
    // Connect WebSocket on mount
    connectWebSocket();

    const handlePartyCreated = (party: Party) => {
      setParties((prev) => [...prev, party]);
    };

    const handlePartyUpdated = (party: Party) => {
      setParties((prev) => {
        const index = prev.findIndex((p) => p.id === party.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = party;
          return updated;
        }
        return prev;
      });
    };

    const handlePartyDeleted = (data: { id: number }) => {
      setParties((prev) => prev.filter((p) => p.id !== data.id));
    };

    onPartyCreated(handlePartyCreated);
    onPartyUpdated(handlePartyUpdated);
    onPartyDeleted(handlePartyDeleted);

    return () => {
      offPartyCreated(handlePartyCreated);
      offPartyUpdated(handlePartyUpdated);
      offPartyDeleted(handlePartyDeleted);
    };
  }, []);

  const loadParties = async () => {
    setLoading(true);
    try {
      const response = await api.get('/parties');
      setParties(response.data.parties || response.data || []);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.address || !form.phone) {
      Alert.alert('Error', 'Name, Address, and Phone are required');
      return;
    }

    try {
      if (editingParty) {
        await api.put(`/parties/${editingParty.id}`, { ...form, transport: form.transport || '', station: form.station || '', agent: form.agent || '' });
        Alert.alert('Success', 'Party updated successfully!');
      } else {
        await api.post('/parties', { ...form, transport: form.transport || '', station: form.station || '', agent: form.agent || '' });
        Alert.alert('Success', 'Party created successfully!');
      }
      setModalVisible(false);
      resetForm();
      loadParties();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save party');
    }
  };

  const handleDelete = (party: Party) => {
    Alert.alert(
      'Delete Party',
      `Are you sure you want to delete ${party.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/parties/${party.id}`);
              Alert.alert('Success', 'Party deleted successfully');
              loadParties();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to delete party');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (party: Party) => {
    setEditingParty(party);
    setForm({
      name: party.name,
      address: party.address,
      phone: party.phone,
      alternate_phone: party.alternate_phone || '',
      gstin: party.gstin || '',
      place_of_supply: party.place_of_supply || '24-Gujarat',
      transport: party.transport || '',
      station: party.station || '',
      agent: party.agent || '',
    });
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingParty(null);
    setForm({
      name: '',
      address: '',
      phone: '',
      alternate_phone: '',
      gstin: '',
      place_of_supply: '24-Gujarat',
      transport: '',
      station: '',
      agent: '',
    });
  };

  const renderParty = ({ item }: { item: Party }) => (
    <View style={styles.partyCard}>
      <View style={styles.partyHeader}>
        <View style={styles.partyIconContainer}>
          <Icon name="business" size={24} color={colors.primary} />
        </View>
        <View style={styles.partyInfo}>
          <Text style={styles.partyName}>{item.name}</Text>
          <View style={styles.partyDetailRow}>
            <Icon name="location-on" size={14} color={colors.textTertiary} />
            <Text style={styles.partyAddress}>{item.address}</Text>
          </View>
          <View style={styles.partyDetailRow}>
            <Icon name="phone" size={14} color={colors.textTertiary} />
            <Text style={styles.partyPhone}>{item.phone}</Text>
          </View>
        </View>
        <View style={styles.partyActions}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEdit(item)}
          >
            <Icon name="edit" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Icon name="delete" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading && parties.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading parties...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.addButtonIcon}>
          <Icon name="add" size={24} color={colors.textWhite} />
        </View>
        <Text style={styles.addButtonText}>Add Party</Text>
      </TouchableOpacity>

      <FlatList
        data={parties}
        renderItem={renderParty}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadParties}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No parties found</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalIconContainer}>
                <Icon name="business" size={24} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>
                {editingParty ? 'Edit Party' : 'Add Party'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Icon name="person" size={16} color={colors.primary} />
              <Text style={styles.label}>Name *</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
                placeholder="Party name"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Icon name="location-on" size={16} color={colors.primary} />
              <Text style={styles.label}>Address *</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.address}
                onChangeText={(text) => setForm({ ...form, address: text })}
                placeholder="Address"
                placeholderTextColor={colors.inputPlaceholder}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: spacing.sm }]}>
              <View style={styles.labelRow}>
                <Icon name="phone" size={16} color={colors.primary} />
                <Text style={styles.label}>Phone *</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={form.phone}
                  onChangeText={(text) => setForm({ ...form, phone: text })}
                  placeholder="Phone number"
                  placeholderTextColor={colors.inputPlaceholder}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: spacing.sm }]}>
              <View style={styles.labelRow}>
                <Icon name="phone-android" size={16} color={colors.primary} />
                <Text style={styles.label}>Alternate</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={form.alternate_phone}
                  onChangeText={(text) => setForm({ ...form, alternate_phone: text })}
                  placeholder="Alternate"
                  placeholderTextColor={colors.inputPlaceholder}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: spacing.sm }]}>
              <View style={styles.labelRow}>
                <Icon name="receipt" size={16} color={colors.primary} />
                <Text style={styles.label}>GSTIN</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={form.gstin}
                  onChangeText={(text) => setForm({ ...form, gstin: text })}
                  placeholder="GSTIN"
                  placeholderTextColor={colors.inputPlaceholder}
                />
              </View>
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: spacing.sm }]}>
              <View style={styles.labelRow}>
                <Icon name="place" size={16} color={colors.primary} />
                <Text style={styles.label}>Place</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={form.place_of_supply}
                  onChangeText={(text) => setForm({ ...form, place_of_supply: text })}
                  placeholder="24-Gujarat"
                  placeholderTextColor={colors.inputPlaceholder}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Icon name="local-shipping" size={16} color={colors.primary} />
              <Text style={styles.label}>Transport</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={form.transport}
                onChangeText={(text) => setForm({ ...form, transport: text })}
                placeholder="Transport"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: spacing.sm }]}>
              <View style={styles.labelRow}>
                <Icon name="train" size={16} color={colors.primary} />
                <Text style={styles.label}>Station</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={form.station}
                  onChangeText={(text) => setForm({ ...form, station: text })}
                  placeholder="Station"
                  placeholderTextColor={colors.inputPlaceholder}
                />
              </View>
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: spacing.sm }]}>
              <View style={styles.labelRow}>
                <Icon name="person" size={16} color={colors.primary} />
                <Text style={styles.label}>Agent</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={form.agent}
                  onChangeText={(text) => setForm({ ...form, agent: text })}
                  placeholder="Agent"
                  placeholderTextColor={colors.inputPlaceholder}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Icon name="save" size={20} color={colors.textWhite} />
            <Text style={styles.saveButtonText}>Save Party</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  addButton: {
    backgroundColor: colors.buttonPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.primary,
  },
  addButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    ...typography.button,
    color: colors.textWhite,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  listContent: {
    padding: spacing.md,
  },
  partyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
  partyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  partyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partyInfo: {
    flex: 1,
  },
  partyName: {
    ...typography.h5,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  partyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  partyAddress: {
    ...typography.body2,
    color: colors.textSecondary,
    flex: 1,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  partyPhone: {
    ...typography.body2,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  partyActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
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
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderLight,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundDark,
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
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  inputWrapper: {
    backgroundColor: colors.inputBackground,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  input: {
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.buttonPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
    ...shadows.primary,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.textWhite,
    fontSize: 17,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
});
