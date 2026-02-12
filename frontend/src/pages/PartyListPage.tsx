import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import api from '../services/api';
import { onPartyCreated, onPartyUpdated, onPartyDeleted, offPartyCreated, offPartyUpdated, offPartyDeleted } from '../services/websocket';

interface Party {
  id: number;
  name: string;
  address: string;
  gstin: string;
  phone: string;
  alternate_phone: string | null;
  place_of_supply: string;
  transport: string;
  station: string;
  agent: string;
  created_at: string;
  updated_at: string;
}

const emptyPartyForm = {
  name: '',
  address: '',
  gstin: '',
  phone: '',
  alternate_phone: '',
  place_of_supply: '24-Gujarat',
  transport: '',
  station: '',
  agent: '',
};

export default function PartyListPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [editForm, setEditForm] = useState(emptyPartyForm);
  const [addForm, setAddForm] = useState(emptyPartyForm);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [importExportLoading, setImportExportLoading] = useState<'export' | 'import' | 'sample' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseURL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '/api';

  useEffect(() => {
    loadParties();
  }, []);

  // Real-time updates via WebSocket
  useEffect(() => {
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
      console.error('Failed to load parties:', err);
      setMessage({ type: 'error', text: 'Failed to load parties' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (party: Party) => {
    setSelectedParty(party);
    setEditForm({
      name: party.name,
      address: party.address,
      gstin: party.gstin || '',
      phone: party.phone,
      alternate_phone: party.alternate_phone || '',
      place_of_supply: party.place_of_supply || '24-Gujarat',
      transport: party.transport || '',
      station: party.station || '',
      agent: party.agent || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedParty) return;

    if (!editForm.name || !editForm.address || !editForm.phone) {
      setMessage({ type: 'error', text: 'Name, Address, and Phone are required' });
      return;
    }

    setSaving(true);
    try {
      await api.put(`/parties/${selectedParty.id}`, editForm);
      setMessage({ type: 'success', text: 'Party updated successfully!' });
      setEditDialogOpen(false);
      loadParties();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update party' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (party: Party) => {
    setSelectedParty(party);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedParty) return;

    try {
      await api.delete(`/parties/${selectedParty.id}`);
      setMessage({ type: 'success', text: 'Party deleted successfully!' });
      setDeleteDialogOpen(false);
      loadParties();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete party' });
    }
  };

  const handleAddSave = async () => {
    if (!addForm.name || !addForm.address || !addForm.phone) {
      setMessage({ type: 'error', text: 'Name, Address, and Phone are required' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/parties', {
        name: addForm.name,
        address: addForm.address,
        gstin: addForm.gstin || '',
        phone: addForm.phone,
        alternate_phone: addForm.alternate_phone || undefined,
        place_of_supply: addForm.place_of_supply || '24-Gujarat',
        transport: addForm.transport || '',
        station: addForm.station || '',
        agent: addForm.agent || '',
      });
      setMessage({ type: 'success', text: 'Party added successfully!' });
      setAddDialogOpen(false);
      setAddForm(emptyPartyForm);
      loadParties();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to add party' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportXL = async () => {
    setImportExportLoading('export');
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseURL}/parties/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parties-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Parties exported to Excel successfully.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Export failed' });
    } finally {
      setImportExportLoading(null);
    }
  };

  const handleDownloadSampleXL = async () => {
    setImportExportLoading('sample');
    setMessage(null);
    try {
      const res = await api.get('/parties/export-sample', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'parties-upload-sample.xlsx';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Sample XL download ho gaya. Fill karke Import XL se upload karein.' });
    } catch (e: any) {
      let errMsg = e.response?.data?.error || e.message || 'Sample download failed';
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const json = JSON.parse(text);
          errMsg = json.error || errMsg;
        } catch (_) {
          errMsg = `Download failed (${e.response?.status || 'error'})`;
        }
      }
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setImportExportLoading(null);
    }
  };

  const handleImportXL = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportExportLoading('import');
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseURL}/parties/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Import failed');
      const { created = 0, updated = 0, errors = [] } = data;
      let text = data.message || `Import complete: ${created} created, ${updated} updated.`;
      if (errors.length) text += ` ${errors.length} row(s) had errors: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`;
      setMessage({ type: 'success', text });
      loadParties();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Import failed' });
    } finally {
      setImportExportLoading(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Container maxWidth="xl">
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BusinessIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Typography variant="h4" component="h1">
              Party List
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setAddForm(emptyPartyForm); setAddDialogOpen(true); }}
          >
            Add New Party
          </Button>
        </Box>

        {/* Excel bulk import / export */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'primary.main' }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary.main">
            📊 Excel – Bulk add & Export
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Export all parties to Excel. Edit the file and re-upload to add or update parties in bulk. Upload testing ke liye sample XL download karein, fill karke Import se upload karein. Columns: Name, Address, GSTIN, Phone, Alternate Phone, Place of Supply, Transport, Station, Agent.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={importExportLoading === 'sample' ? <CircularProgress size={20} /> : <FileDownloadIcon />}
              onClick={handleDownloadSampleXL}
              disabled={!!importExportLoading}
              title="Upload testing ke liye sample file (headers + example row)"
            >
              Download Sample XL
            </Button>
            <Button
              variant="contained"
              startIcon={importExportLoading === 'export' ? <CircularProgress size={20} color="inherit" /> : <FileDownloadIcon />}
              onClick={handleExportXL}
              disabled={!!importExportLoading || parties.length === 0}
              title={parties.length === 0 ? 'Export tab available jab kam se kam 1 party ho' : ''}
            >
              Export XL
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleImportXL}
            />
            <Button
              variant="contained"
              color="secondary"
              startIcon={importExportLoading === 'import' ? <CircularProgress size={20} color="inherit" /> : <UploadFileIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={!!importExportLoading}
            >
              Import XL (Bulk add)
            </Button>
          </Box>
        </Paper>

        {message && (
          <Alert 
            severity={message.type} 
            onClose={() => setMessage(null)}
            sx={{ mb: 2 }}
          >
            {message.text}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Address</strong></TableCell>
                  <TableCell><strong>GSTIN</strong></TableCell>
                  <TableCell><strong>Phone</strong></TableCell>
                  <TableCell><strong>Alt. Phone</strong></TableCell>
                  <TableCell><strong>Transport</strong></TableCell>
                  <TableCell><strong>Station</strong></TableCell>
                  <TableCell><strong>Agent</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No parties found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  parties.map((party) => (
                    <TableRow key={party.id} hover>
                      <TableCell>{party.name}</TableCell>
                      <TableCell>{party.address}</TableCell>
                      <TableCell>{party.gstin || '-'}</TableCell>
                      <TableCell>{party.phone}</TableCell>
                      <TableCell>{party.alternate_phone || '-'}</TableCell>
                      <TableCell>{party.transport || '-'}</TableCell>
                      <TableCell>{party.station || '-'}</TableCell>
                      <TableCell>{party.agent || '-'}</TableCell>
                      <TableCell>
                        <IconButton
                          color="primary"
                          onClick={() => handleEditClick(party)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteClick(party)}
                          size="small"
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

      {/* Add New Party Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Party</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Party Name *"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address *"
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  required
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="GSTIN"
                  value={addForm.gstin}
                  onChange={(e) => setAddForm({ ...addForm, gstin: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Place of Supply"
                  value={addForm.place_of_supply}
                  onChange={(e) => setAddForm({ ...addForm, place_of_supply: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number *"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Alternate Phone Number"
                  value={addForm.alternate_phone}
                  onChange={(e) => setAddForm({ ...addForm, alternate_phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                  Transport Details (Optional)
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Transport"
                  value={addForm.transport}
                  onChange={(e) => setAddForm({ ...addForm, transport: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Station"
                  value={addForm.station}
                  onChange={(e) => setAddForm({ ...addForm, station: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Agent"
                  value={addForm.agent}
                  onChange={(e) => setAddForm({ ...addForm, agent: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddSave}
            variant="contained"
            color="primary"
            disabled={saving || !addForm.name || !addForm.address || !addForm.phone}
          >
            {saving ? <CircularProgress size={20} /> : 'Add Party'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Party</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Party Name *"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address *"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  required
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="GSTIN"
                  value={editForm.gstin}
                  onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Place of Supply"
                  value={editForm.place_of_supply}
                  onChange={(e) => setEditForm({ ...editForm, place_of_supply: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number *"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Alternate Phone Number"
                  value={editForm.alternate_phone}
                  onChange={(e) => setEditForm({ ...editForm, alternate_phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                  Transport Details (Optional)
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Transport"
                  value={editForm.transport}
                  onChange={(e) => setEditForm({ ...editForm, transport: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Station"
                  value={editForm.station}
                  onChange={(e) => setEditForm({ ...editForm, station: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Agent"
                  value={editForm.agent}
                  onChange={(e) => setEditForm({ ...editForm, agent: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained" 
            color="primary"
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Party</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedParty?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
