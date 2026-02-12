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
  Switch,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../services/api';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { Staff } from '../types';
import { connectWebSocket, onStaffCreated, onStaffUpdated, onStaffDeleted, offStaffCreated, offStaffUpdated, offStaffDeleted } from '../services/websocket';

export default function StaffScreen() {
  const { isAdmin } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState({
    username: '',
    email: '',
    aaradhya_pin: '',
    af_creation_pin: '',
    purchase: false,
    inventory: false,
    dispatch: false,
    billing: false,
    parties: false,
    staff: false,
    is_active: true,
  });

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Error', 'Admin access required');
      return;
    }
    loadStaff();
  }, [isAdmin]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!isAdmin) return;

    // Connect WebSocket on mount
    connectWebSocket();

    const handleStaffCreated = (staff: Staff) => {
      setStaff((prev) => [...prev, staff]);
    };

    const handleStaffUpdated = (staff: Staff) => {
      setStaff((prev) => {
        const index = prev.findIndex((s) => s.id === staff.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = staff;
          return updated;
        }
        return prev;
      });
    };

    const handleStaffDeleted = (data: { id: number }) => {
      setStaff((prev) => prev.filter((s) => s.id !== data.id));
    };

    onStaffCreated(handleStaffCreated);
    onStaffUpdated(handleStaffUpdated);
    onStaffDeleted(handleStaffDeleted);

    return () => {
      offStaffCreated(handleStaffCreated);
      offStaffUpdated(handleStaffUpdated);
      offStaffDeleted(handleStaffDeleted);
    };
  }, [isAdmin]);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const response = await api.get('/staff');
      setStaff(response.data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.username || !form.aaradhya_pin || !form.af_creation_pin) {
      Alert.alert('Error', 'Username and both PINs are required');
      return;
    }

    if (form.aaradhya_pin.length !== 6 || !/^\d{6}$/.test(form.aaradhya_pin)) {
      Alert.alert('Error', 'Aaradhya Fashion PIN must be exactly 6 digits');
      return;
    }

    if (form.af_creation_pin.length !== 6 || !/^\d{6}$/.test(form.af_creation_pin)) {
      Alert.alert('Error', 'AF Creation PIN must be exactly 6 digits');
      return;
    }

    try {
      const staffData = {
        username: form.username,
        email: form.email,
        aaradhya_pin: form.aaradhya_pin,
        af_creation_pin: form.af_creation_pin,
        permissions: {
          purchase: form.purchase,
          inventory: form.inventory,
          dispatch: form.dispatch,
          billing: form.billing,
          parties: form.parties,
          staff: form.staff,
        },
        is_active: form.is_active,
      };

      if (editingStaff) {
        await api.put(`/staff/${editingStaff.id}`, staffData);
        Alert.alert('Success', 'Staff updated successfully!');
      } else {
        await api.post('/staff', staffData);
        Alert.alert('Success', 'Staff created successfully!');
      }
      setModalVisible(false);
      resetForm();
      loadStaff();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save staff');
    }
  };

  const handleDelete = (staffMember: Staff) => {
    Alert.alert(
      'Delete Staff',
      `Are you sure you want to delete ${staffMember.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/staff/${staffMember.id}`);
              Alert.alert('Success', 'Staff deleted successfully');
              loadStaff();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to delete staff');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setForm({
      username: staffMember.username,
      email: staffMember.email || '',
      aaradhya_pin: staffMember.aaradhya_pin || '',
      af_creation_pin: staffMember.af_creation_pin || '',
      purchase: staffMember.permissions?.purchase || false,
      inventory: staffMember.permissions?.inventory || false,
      dispatch: staffMember.permissions?.dispatch || false,
      billing: staffMember.permissions?.billing || false,
      parties: staffMember.permissions?.parties || false,
      staff: staffMember.permissions?.staff || false,
      is_active: staffMember.is_active,
    });
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingStaff(null);
    setForm({
      username: '',
      email: '',
      aaradhya_pin: '',
      af_creation_pin: '',
      purchase: false,
      inventory: false,
      dispatch: false,
      billing: false,
      parties: false,
      staff: false,
      is_active: true,
    });
  };

  const renderStaff = ({ item }: { item: Staff }) => (
    <View style={styles.staffCard}>
      <View style={styles.staffHeader}>
        <View style={styles.staffInfo}>
          <Text style={styles.staffName}>{item.username}</Text>
          <Text style={styles.staffEmail}>{item.email}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, item.is_active && styles.statusActive]} />
            <Text style={styles.statusText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <View style={styles.staffActions}>
          <TouchableOpacity onPress={() => handleEdit(item)}>
            <Icon name="edit" size={24} color="colors.primary" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Icon name="delete" size={24} color="#d32f2f" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (!isAdmin) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Admin access required</Text>
      </View>
    );
  }

  if (loading && staff.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="colors.primary" />
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
      >
        <Icon name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Staff</Text>
      </TouchableOpacity>

      <FlatList
        data={staff}
        renderItem={renderStaff}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadStaff}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No staff found</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <ScrollView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingStaff ? 'Edit Staff' : 'Add Staff'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              value={form.username}
              onChangeText={(text) => setForm({ ...form, username: text })}
              placeholder="Username"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              placeholder="Email"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Aaradhya Fashion PIN *</Text>
            <TextInput
              style={styles.input}
              value={form.aaradhya_pin}
              onChangeText={(text) => setForm({ ...form, aaradhya_pin: text.replace(/\D/g, '').slice(0, 6) })}
              placeholder="6-digit PIN"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>AF Creation PIN *</Text>
            <TextInput
              style={styles.input}
              value={form.af_creation_pin}
              onChangeText={(text) => setForm({ ...form, af_creation_pin: text.replace(/\D/g, '').slice(0, 6) })}
              placeholder="6-digit PIN"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          <Text style={styles.sectionTitle}>Permissions</Text>

          {['purchase', 'inventory', 'dispatch', 'billing', 'parties', 'staff'].map((permission) => (
            <View key={permission} style={styles.switchContainer}>
              <Text style={styles.switchLabel}>
                {permission.charAt(0).toUpperCase() + permission.slice(1)}
              </Text>
              <Switch
                value={form[permission as keyof typeof form] as boolean}
                onValueChange={(value) => setForm({ ...form, [permission]: value })}
              />
            </View>
          ))}

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Active</Text>
            <Switch
              value={form.is_active}
              onValueChange={(value) => setForm({ ...form, is_active: value })}
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  addButton: {
    backgroundColor: 'colors.primary',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  listContent: {
    padding: 16,
  },
  staffCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  staffEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginRight: 6,
  },
  statusActive: {
    backgroundColor: '#4caf50',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  staffActions: {
    flexDirection: 'row',
    gap: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: 'colors.primary',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
});
