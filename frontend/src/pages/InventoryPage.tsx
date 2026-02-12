import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Checkbox,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import api from '../services/api';
import { createBarcodeSVG, printBarcodeLabelTSC, printMultipleBarcodeLabelsTSC } from '../services/barcode';
import { onInventoryUpdated, onInventoryDeleted, offInventoryUpdated, offInventoryDeleted, onPurchaseCreated, offPurchaseCreated } from '../services/websocket';

interface Product {
  id: number;
  design_number: string;
  barcode: string;
  color_description: string;
  selling_price: number;
  stock_quantity: number;
  created_at: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ color_description: '', selling_price: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadProducts();
  }, [search]);

  // Real-time updates via WebSocket
  useEffect(() => {
    const handleInventoryUpdate = (product: Product) => {
      setProducts((prev) => {
        const index = prev.findIndex((p) => p.id === product.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = product;
          // Regenerate barcode SVG
          setTimeout(() => {
            createBarcodeSVG(product.barcode, `barcode-${product.id}`);
          }, 100);
          return updated;
        }
        return prev;
      });
    };

    const handleInventoryDelete = (data: { id: number }) => {
      setProducts((prev) => prev.filter((p) => p.id !== data.id));
    };

    const handlePurchaseCreated = () => {
      // Reload products when a new purchase is created
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
      setProducts(response.data);
      
      // Generate barcode SVGs
      setTimeout(() => {
        response.data.forEach((product: Product) => {
          createBarcodeSVG(product.barcode, `barcode-${product.id}`);
        });
      }, 100);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setMessage({ type: 'error', text: 'Failed to load products' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setEditForm({
      color_description: product.color_description,
      selling_price: product.selling_price.toString(),
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedProduct) return;

    try {
      await api.put(`/inventory/${selectedProduct.id}`, {
        color_description: editForm.color_description,
        selling_price: parseFloat(editForm.selling_price),
      });
      setMessage({ type: 'success', text: 'Product updated successfully!' });
      setEditDialogOpen(false);
      loadProducts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update product' });
    }
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;

    try {
      await api.delete(`/inventory/${selectedProduct.id}`);
      setMessage({ type: 'success', text: 'Product deleted successfully!' });
      setDeleteDialogOpen(false);
      loadProducts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete product' });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p) => p.id)));
  };

  const handlePrintOne = (product: Product) => {
    printBarcodeLabelTSC(product.barcode, product.design_number, product.color_description);
  };

  const handlePrintSelected = () => {
    const list = products.filter((p) => selectedIds.has(p.id));
    if (list.length === 0) {
      setMessage({ type: 'error', text: 'Pehle koi product select karein.' });
      return;
    }
    printMultipleBarcodeLabelsTSC(
      list.map((p) => ({
        barcode: p.barcode,
        designNumber: p.design_number,
        color: p.color_description,
      }))
    );
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h5" gutterBottom>
        Inventory
      </Typography>
      <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search by design number, color, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: '1 1 280px' }}
          />
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrintSelected}
            disabled={products.length === 0 || selectedIds.size === 0}
          >
            Print Selected ({selectedIds.size})
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedIds.size > 0 && selectedIds.size < products.length}
                        checked={products.length > 0 && selectedIds.size === products.length}
                        onChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableCell>
                    <TableCell>Design Number</TableCell>
                    <TableCell>Color/Description</TableCell>
                    <TableCell>Barcode</TableCell>
                    <TableCell align="right">Selling Price</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          aria-label={`Select ${product.design_number}`}
                        />
                      </TableCell>
                      <TableCell>{product.design_number}</TableCell>
                      <TableCell>{product.color_description}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                          <svg id={`barcode-${product.id}`} />
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PrintIcon />}
                            onClick={() => handlePrintOne(product)}
                            title="Barcode print karein (TSC label)"
                          >
                            Print Barcode
                          </Button>
                        </Box>
                      </TableCell>
                      <TableCell align="right">₹{product.selling_price.toFixed(2)}</TableCell>
                      <TableCell align="right">{product.stock_quantity}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditClick(product)}
                          title="Edit"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(product)}
                          title="Delete"
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Design Number"
              value={selectedProduct?.design_number || ''}
              disabled
              helperText="Design number cannot be changed"
            />
            <TextField
              fullWidth
              label="Color/Description"
              value={editForm.color_description}
              onChange={(e) => setEditForm({ ...editForm, color_description: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Selling Price (₹)"
              type="number"
              value={editForm.selling_price}
              onChange={(e) => setEditForm({ ...editForm, selling_price: e.target.value })}
              required
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" disabled={!editForm.color_description || !editForm.selling_price}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Product</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedProduct?.design_number}</strong> - {selectedProduct?.color_description}?
            <br />
            <br />
            This action cannot be undone.
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
