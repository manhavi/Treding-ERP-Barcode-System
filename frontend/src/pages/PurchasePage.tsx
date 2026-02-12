import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import api from '../services/api';
import { generateBarcode, printBarcode, createBarcodeSVG } from '../services/barcode';
import { saveToOffline, addToSyncQueue } from '../services/offline';

export default function PurchasePage() {
  const [designNumber, setDesignNumber] = useState('');
  const [colorDescription, setColorDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [barcode, setBarcode] = useState<string>('');
  const [importExportLoading, setImportExportLoading] = useState<'export' | 'import' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (designNumber) {
      const generatedBarcode = generateBarcode(designNumber);
      setBarcode(generatedBarcode);
      // Render barcode SVG
      setTimeout(() => {
        createBarcodeSVG(generatedBarcode, 'barcode-preview');
      }, 100);
    }
  }, [designNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const purchaseData = {
        design_number: designNumber,
        color_description: colorDescription,
        selling_price: parseFloat(sellingPrice),
        purchase_price: parseFloat(purchasePrice),
        quantity: 0, // No stock maintenance - just add to inventory
      };

      try {
        await api.post('/purchases', purchaseData);
        setMessage({ type: 'success', text: 'Purchase added successfully!' });
        resetForm();
      } catch (err: any) {
        // If offline, save to local storage and sync queue
        if (!navigator.onLine || err.code === 'ERR_NETWORK') {
          await saveToOffline('purchases', purchaseData);
          await addToSyncQueue('purchase', purchaseData);
          setMessage({ type: 'success', text: 'Purchase saved offline. Will sync when online.' });
          resetForm();
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to add purchase' });
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

  const handlePrintBarcode = () => {
    if (barcode && designNumber && colorDescription) {
      printBarcode(barcode, designNumber, colorDescription);
    }
  };

  const baseURL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '/api';

  const handleExportXL = async () => {
    setImportExportLoading('export');
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseURL}/purchases/export`, {
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
      a.download = `purchases-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Excel exported successfully. All purchase products are in the file.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Export failed' });
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
      const res = await fetch(`${baseURL}/purchases/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Import failed');
      const { created = 0, updated = 0, deleted = 0, errors = [] } = data;
      let text = data.message || `Import complete: ${created} created, ${updated} updated.` + (deleted ? ` ${deleted} removed (inventory synced to file).` : '');
      if (errors.length) text += ` ${errors.length} row(s) had errors: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`;
      setMessage({ type: 'success', text });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Import failed' });
    } finally {
      setImportExportLoading(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h5" gutterBottom>
        Add Purchase
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
        {/* Excel Import / Export - Form ke andar sabse upar */}
        <Box
          data-testid="purchase-excel-section"
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 1,
            border: '2px solid',
            borderColor: 'primary.main',
            bgcolor: 'grey.100',
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} gutterBottom color="primary.main">
            📊 Excel – Upload & Export
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Export/import only 4 columns: Design Number, Colour, Selling Price (₹), Purchase Price (₹). Edit the Excel file and re-upload to update in bulk.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={importExportLoading === 'export' ? <CircularProgress size={20} color="inherit" /> : <FileDownloadIcon />}
              onClick={handleExportXL}
              disabled={!!importExportLoading}
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
              Import XL (Upload)
            </Button>
          </Box>
        </Box>

        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Design Number (e.g., Dno 101)"
                value={designNumber}
                onChange={(e) => setDesignNumber(e.target.value)}
                required
                placeholder="Dno 101"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Color/Description"
                value={colorDescription}
                onChange={(e) => setColorDescription(e.target.value)}
                required
                placeholder="Red Lahengha"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Selling Price (₹)"
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Purchase Price (₹)"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            {barcode && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, bgcolor: '#f5f5f5' }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Generated Barcode:</strong> {barcode}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                    <svg id="barcode-preview" />
                  </Box>
                  <Button
                    startIcon={<PrintIcon />}
                    onClick={handlePrintBarcode}
                    variant="outlined"
                    sx={{ mt: 2 }}
                    disabled={!designNumber || !colorDescription}
                  >
                    Print Barcode
                  </Button>
                </Box>
              </Grid>
            )}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={loading}
                >
                  Save Purchase
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}
