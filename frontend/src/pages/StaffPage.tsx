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
  TextField,
  FormControlLabel,
  Checkbox,
  IconButton,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { onStaffCreated, onStaffUpdated, onStaffDeleted, offStaffCreated, offStaffUpdated, offStaffDeleted } from '../services/websocket';

interface Staff {
  id: number;
  name: string;
  pin_aaradhya: string;
  pin_af_creation: string;
  can_access_purchase: number;
  can_access_inventory: number;
  can_access_dispatch: number;
  can_access_billing: number;
  can_access_parties: number;
  is_active: number;
  created_at: string;
}

export default function StaffPage() {
  const { isAdmin } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState({
    name: '',
    pin_aaradhya: '',
    pin_af_creation: '',
    can_access_purchase: false,
    can_access_inventory: false,
    can_access_dispatch: false,
    can_access_billing: false,
    can_access_parties: false,
  });

  useEffect(() => {
    if (!isAdmin) {
      setMessage({ type: 'error', text: 'Admin access required' });
      return;
    }
    loadStaff();
  }, [isAdmin]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!isAdmin) return;

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
      console.error('Failed to load staff:', err);
      setMessage({ type: 'error', text: 'Failed to load staff' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (staffMember?: Staff) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setForm({
        name: staffMember.name,
        pin_aaradhya: staffMember.pin_aaradhya,
        pin_af_creation: staffMember.pin_af_creation,
        can_access_purchase: staffMember.can_access_purchase === 1,
        can_access_inventory: staffMember.can_access_inventory === 1,
        can_access_dispatch: staffMember.can_access_dispatch === 1,
        can_access_billing: staffMember.can_access_billing === 1,
        can_access_parties: staffMember.can_access_parties === 1,
      });
    } else {
      setEditingStaff(null);
      setForm({
        name: '',
        pin_aaradhya: '',
        pin_af_creation: '',
        can_access_purchase: false,
        can_access_inventory: false,
        can_access_dispatch: false,
        can_access_billing: false,
        can_access_parties: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStaff(null);
    setForm({
      name: '',
      pin_aaradhya: '',
      pin_af_creation: '',
      can_access_purchase: false,
      can_access_inventory: false,
      can_access_dispatch: false,
      can_access_billing: false,
      can_access_parties: false,
    });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.pin_aaradhya || !form.pin_af_creation) {
      setMessage({ type: 'error', text: 'Name and both PINs are required' });
      return;
    }

    if (form.pin_aaradhya.length !== 6 || !/^\d{6}$/.test(form.pin_aaradhya)) {
      setMessage({ type: 'error', text: 'Aaradhya Fashion PIN must be exactly 6 digits' });
      return;
    }

    if (form.pin_af_creation.length !== 6 || !/^\d{6}$/.test(form.pin_af_creation)) {
      setMessage({ type: 'error', text: 'AF Creation PIN must be exactly 6 digits' });
      return;
    }

    try {
      if (editingStaff) {
        await api.put(`/staff/${editingStaff.id}`, form);
        setMessage({ type: 'success', text: 'Staff updated successfully!' });
      } else {
        await api.post('/staff', form);
        setMessage({ type: 'success', text: 'Staff created successfully!' });
      }
      handleCloseDialog();
      await loadStaff();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save staff' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      await api.delete(`/staff/${id}`);
      setMessage({ type: 'success', text: 'Staff deleted successfully!' });
      await loadStaff();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete staff' });
    }
  };


  if (!isAdmin) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">Admin access required</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Staff Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Staff
        </Button>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                      <TableCell>PINs</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No staff members found
                    </TableCell>
                  </TableRow>
                ) : (
                  staff.map((staffMember) => (
                    <TableRow key={staffMember.id}>
                      <TableCell>{staffMember.name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip 
                            label={`Aaradhya: ${staffMember.pin_aaradhya}`} 
                            size="small" 
                            color="primary" 
                          />
                          <Chip 
                            label={`AF Creation: ${staffMember.pin_af_creation}`} 
                            size="small" 
                            color="secondary" 
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {staffMember.can_access_purchase === 1 && (
                            <Chip label="Purchase" size="small" color="primary" variant="outlined" />
                          )}
                          {staffMember.can_access_inventory === 1 && (
                            <Chip label="Inventory" size="small" color="primary" variant="outlined" />
                          )}
                          {staffMember.can_access_dispatch === 1 && (
                            <Chip label="Dispatch" size="small" color="primary" variant="outlined" />
                          )}
                          {staffMember.can_access_billing === 1 && (
                            <Chip label="Billing" size="small" color="primary" variant="outlined" />
                          )}
                          {staffMember.can_access_parties === 1 && (
                            <Chip label="Parties" size="small" color="primary" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={staffMember.is_active === 1 ? 'Active' : 'Inactive'}
                          color={staffMember.is_active === 1 ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(staffMember)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(staffMember.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingStaff ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Aaradhya Fashion PIN (6 digits)"
              value={form.pin_aaradhya}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setForm({ ...form, pin_aaradhya: value });
              }}
              required
              inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
              helperText="PIN for Aaradhya Fashion (with GST)"
            />
            <TextField
              fullWidth
              label="AF Creation PIN (6 digits)"
              value={form.pin_af_creation}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setForm({ ...form, pin_af_creation: value });
              }}
              required
              inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
              helperText="PIN for AF Creation (without GST)"
            />
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Page Access Permissions
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.can_access_purchase}
                  onChange={(e) => setForm({ ...form, can_access_purchase: e.target.checked })}
                />
              }
              label="Purchase"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.can_access_inventory}
                  onChange={(e) => setForm({ ...form, can_access_inventory: e.target.checked })}
                />
              }
              label="Inventory"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.can_access_dispatch}
                  onChange={(e) => setForm({ ...form, can_access_dispatch: e.target.checked })}
                />
              }
              label="Dispatch"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.can_access_billing}
                  onChange={(e) => setForm({ ...form, can_access_billing: e.target.checked })}
                />
              }
              label="Billing"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.can_access_parties}
                  onChange={(e) => setForm({ ...form, can_access_parties: e.target.checked })}
                />
              }
              label="Parties"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingStaff ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
