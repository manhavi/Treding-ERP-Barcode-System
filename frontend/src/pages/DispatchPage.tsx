import React, { useState, useEffect } from 'react';
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
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CardActions,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import api from '../services/api';
import { formatBillNumber } from '../utils/billNumber';
import BarcodeScanner from '../components/BarcodeScanner';
import { generateBillPDF, generateTaxInvoicePDF } from '../services/pdf';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { onDispatchCreated, onPartyCreated, onPartyUpdated, offDispatchCreated, offPartyCreated, offPartyUpdated } from '../services/websocket';

interface DispatchItem {
  barcode: string;
  product: any;
  quantity: number;
}

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
}

export default function DispatchPage() {
  const { isAdmin, user } = useAuth();
  const [partyName, setPartyName] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partyOptions, setPartyOptions] = useState<Party[]>([]);
  const [searchingParty, setSearchingParty] = useState(false);
  const [newPartyDialogOpen, setNewPartyDialogOpen] = useState(false);
  const [newPartyForm, setNewPartyForm] = useState({
    name: '',
    address: '',
    gstin: '',
    phone: '',
    alternate_phone: '',
    place_of_supply: '24-Gujarat',
    transport: '',
    station: '',
    agent: '',
  });
  const [items, setItems] = useState<DispatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [currentBarcode, setCurrentBarcode] = useState('');
  const [scanningProduct, setScanningProduct] = useState(false);
  
  // Determine which company box to show
  // Admin or staff with same PIN (hasBothCompanies) sees both boxes
  // Staff with different PINs sees only their company box
  const showBothBoxes = isAdmin || user?.hasBothCompanies === true;
  const staffCompany = user?.company; // 'aaradhya_fashion' or 'af_creation' for staff, null if both

  // Search parties - rebuilt from scratch
  useEffect(() => {
    const searchParties = async () => {
      // Clear options if search is empty
      if (partySearch.trim().length < 1) {
        setPartyOptions([]);
        return;
      }

      setSearchingParty(true);
      try {
        const trimmedQuery = partySearch.trim();
        const response = await api.get('/parties/search', { params: { q: trimmedQuery } });
        setPartyOptions(response.data || []);
      } catch (err: any) {
        console.error('Failed to search parties:', err);
        setPartyOptions([]);
      } finally {
        setSearchingParty(false);
      }
    };

    // Debounce search to avoid too many API calls (300ms delay)
    const timeoutId = setTimeout(searchParties, 300);
    return () => clearTimeout(timeoutId);
  }, [partySearch]);

  // Real-time updates via WebSocket
  useEffect(() => {
    const handleDispatchCreated = () => {
      // Clear form after dispatch is created
      setItems([]);
      setPartyName('');
      setSelectedParty(null);
    };

    const handlePartyCreated = (party: Party) => {
      // If this is the party we just created, select it
      if (party.name === newPartyForm.name) {
        setSelectedParty(party);
        setPartyName(party.name);
      }
    };

    const handlePartyUpdated = (party: Party) => {
      // Update selected party if it was updated
      if (selectedParty?.id === party.id) {
        setSelectedParty(party);
      }
    };

    onDispatchCreated(handleDispatchCreated);
    onPartyCreated(handlePartyCreated);
    onPartyUpdated(handlePartyUpdated);

    return () => {
      offDispatchCreated(handleDispatchCreated);
      offPartyCreated(handlePartyCreated);
      offPartyUpdated(handlePartyUpdated);
    };
  }, [selectedParty, newPartyForm.name]);

  // Handle party selection
  const handlePartySelect = (party: Party | null) => {
    if (party) {
      setSelectedParty(party);
      setPartyName(party.name);
      setNewPartyForm({
        name: party.name,
        address: party.address,
        gstin: party.gstin,
        phone: party.phone,
        alternate_phone: party.alternate_phone || '',
        place_of_supply: party.place_of_supply,
        transport: party.transport || '',
        station: party.station || '',
        agent: party.agent || '',
      });
    } else {
      setSelectedParty(null);
      setPartyName('');
    }
  };

  // Handle create new party
  const handleCreateNewParty = async () => {
    if (!newPartyForm.name || !newPartyForm.address || !newPartyForm.phone) {
      setMessage({ type: 'error', text: 'Name, Address, and Phone are required' });
      return;
    }

    try {
      const response = await api.post('/parties', newPartyForm);
      const newParty = response.data;
      setSelectedParty(newParty);
      setPartyName(newParty.name);
      setPartySearch(newParty.name);
      setNewPartyDialogOpen(false);
      setMessage({ type: 'success', text: 'Party created successfully!' });
      // Reset form
      setNewPartyForm({
        name: '',
        address: '',
        gstin: '',
        phone: '',
        alternate_phone: '',
        place_of_supply: '24-Gujarat',
        transport: '',
        station: '',
        agent: '',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create party' });
    }
  };

  const handleScan = async (barcode: string) => {
    setCurrentBarcode(barcode);
    setScannerOpen(false);
    setScanningProduct(true);
    setMessage(null);

    try {
      // Normalize barcode (remove spaces, uppercase)
      const normalizedBarcode = barcode.trim().toUpperCase().replace(/\s+/g, '');
      
      const response = await api.get(`/inventory/barcode/${encodeURIComponent(normalizedBarcode)}`);
      const product = response.data;

      if (!product) {
        setMessage({ type: 'error', text: `Product not found for barcode: ${normalizedBarcode}` });
        setScanningProduct(false);
        return;
      }

      const existingItem = items.find((item) => item.barcode === normalizedBarcode);
      if (existingItem) {
        setItems(
          items.map((item) =>
            item.barcode === normalizedBarcode
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
        setMessage({ type: 'success', text: `${product.design_number} - Quantity increased to ${existingItem.quantity + 1}` });
      } else {
        setItems([...items, { barcode: normalizedBarcode, product, quantity: 1 }]);
        setMessage({ type: 'success', text: `Product added: ${product.design_number} - ${product.color_description}` });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Product not found';
      setMessage({ type: 'error', text: `Barcode "${barcode}" ke liye product nahi mila. Error: ${errorMsg}` });
    } finally {
      setScanningProduct(false);
    }
  };

  const handleQuantityChange = (barcode: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(items.filter((item) => item.barcode !== barcode));
    } else {
      setItems(
        items.map((item) =>
          item.barcode === barcode ? { ...item, quantity } : item
        )
      );
    }
  };

  const handleCreateDispatchAndBill = async (billType: 'aaradhya_fashion' | 'af_creation') => {
    if (!partyName || items.length === 0) {
      setMessage({ type: 'error', text: 'Please add party name and at least one item' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Step 1: Create or update party if new party form has data
      let partyId = selectedParty?.id;
      if (!selectedParty && newPartyForm.name) {
        // Create new party
        const partyResponse = await api.post('/parties', {
          name: newPartyForm.name,
          address: newPartyForm.address,
          gstin: newPartyForm.gstin,
          phone: newPartyForm.phone,
          alternate_phone: newPartyForm.alternate_phone || null,
          place_of_supply: newPartyForm.place_of_supply,
          transport: newPartyForm.transport,
          station: newPartyForm.station,
          agent: newPartyForm.agent,
        });
        partyId = partyResponse.data.id;
      } else if (!selectedParty) {
        // Try to find existing party by name
        try {
          const searchResponse = await api.get('/parties/search', { params: { q: partyName } });
          if (searchResponse.data.length > 0) {
            const existingParty = searchResponse.data.find((p: Party) => p.name.toLowerCase() === partyName.toLowerCase());
            if (existingParty) {
              partyId = existingParty.id;
              setSelectedParty(existingParty);
            }
          }
        } catch (err) {
          // Party not found, continue without party ID
        }
      }

      // Step 2: Create Dispatch
      const dispatchData = {
        party_name: partyName,
        items: items.map((item) => ({
          barcode: item.barcode,
          quantity: item.quantity,
        })),
      };

      const dispatchResponse = await api.post('/dispatch', dispatchData);
      const dispatchId = dispatchResponse.data.id;

      // Step 2: Calculate totals
      const subtotal = items.reduce((sum, item) => {
        return sum + (item.product?.selling_price || 0) * item.quantity;
      }, 0);
      const gstRate = billType === 'aaradhya_fashion' ? 0.05 : 0;
      const gstAmount = subtotal * gstRate;
      const finalTotal = subtotal + gstAmount;

      // Step 3: Create Bill automatically
      const billResponse = await api.post('/bills', {
        dispatch_id: dispatchId,
        bill_type: billType,
      });

      // Step 4: Generate PDF
      const billItems = items.map((item) => ({
        design_number: item.product.design_number,
        color_description: item.product.color_description,
        quantity: item.quantity,
        price: item.product.selling_price,
        total: item.product.selling_price * item.quantity,
      }));

      const billData = {
        billNumber: formatBillNumber(billResponse.data),
        billType,
        partyName,
        date: format(new Date(), 'dd/MM/yyyy'),
        items: billItems,
        subtotal,
        gstAmount,
        totalAmount: finalTotal,
      };

      // Use new tax invoice template for Aaradhya Fashion, old method for AF Creation
      let pdfData: string;
      try {
        if (billType === 'aaradhya_fashion') {
          // Get party details for invoice
          const partyForInvoice = selectedParty || (newPartyForm.name ? {
            address: newPartyForm.address,
            gstin: newPartyForm.gstin || '',
            place_of_supply: newPartyForm.place_of_supply,
            transport: newPartyForm.transport || '',
            station: newPartyForm.station || '',
            agent: newPartyForm.agent || '',
          } : null);
          
          pdfData = await generateTaxInvoicePDF(billData, partyForInvoice ? {
            buyerAddress: partyForInvoice.address || '',
            buyerGstin: partyForInvoice.gstin || '',
            placeOfSupply: partyForInvoice.place_of_supply || '24-Gujarat',
            transport: partyForInvoice.transport || '',
            station: partyForInvoice.station || '',
            agent: partyForInvoice.agent || '',
          } : undefined);
        } else {
          pdfData = generateBillPDF(billData);
        }
      await api.put(`/bills/${billResponse.data.id}/pdf`, { pdf_data: pdfData });
      } catch (pdfError: any) {
        console.error('PDF generation error:', pdfError);
        // Continue even if PDF generation fails - bill is already created
        console.warn('Bill created but PDF generation failed. You can regenerate PDF later.');
      }

      setMessage({ 
        type: 'success', 
        text: `${billType === 'aaradhya_fashion' ? 'Aaradhya Fashion' : 'AF Creation'} Dispatch aur Bill successfully created!` 
      });
      setPartyName('');
      setPartySearch('');
      setSelectedParty(null);
      setNewPartyForm({
        name: '',
        address: '',
        gstin: '',
        phone: '',
        alternate_phone: '',
        place_of_supply: '24-Gujarat',
        transport: '',
        station: '',
        agent: '',
      });
      setItems([]);
    } catch (err: any) {
      console.error('Error creating dispatch and bill:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create dispatch and bill';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => {
    return sum + (item.product?.selling_price || 0) * item.quantity;
  }, 0);

  const gstAmount = totalAmount * 0.05;
  const totalWithGST = totalAmount + gstAmount;

  return (
    <Container maxWidth="lg">
      <Typography variant="h5" gutterBottom>
        Create Dispatch
      </Typography>
      <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Box component="form">
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={partyOptions}
                  getOptionLabel={(option) => {
                    return typeof option === 'string' ? option : `${option.name} - ${option.gstin || option.phone}`;
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  filterOptions={(options) => options}
                  loading={searchingParty}
                  inputValue={partySearch}
                  onInputChange={(_, newValue) => {
                    setPartySearch(newValue);
                    if (!newValue) {
                      setSelectedParty(null);
                      setPartyName('');
                    }
                  }}
                  value={selectedParty}
                  onChange={(_, newValue) => {
                    handlePartySelect(newValue);
                    setPartySearch(newValue ? newValue.name : '');
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Box>
                        <Typography variant="body1" fontWeight="bold">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.gstin && `GSTIN: ${option.gstin} • `}
                          Phone: {option.phone}
                          {option.alternate_phone && ` / Alt: ${option.alternate_phone}`}
                          {` • ${option.address}`}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search Party (Name, GSTIN, Phone, Alternate Phone)"
                      placeholder="Type to search existing party..."
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {searchingParty ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
                <Button
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setNewPartyDialogOpen(true)}
                  sx={{ minWidth: 150 }}
                >
                  New Party
                </Button>
              </Box>
            </Grid>
            
            {/* Party Details Form - Show when party is selected or new party form is filled */}
            {(selectedParty || newPartyForm.name) && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Party Name"
                    value={selectedParty?.name || newPartyForm.name}
                    onChange={(e) => {
                      setPartyName(e.target.value);
                      setNewPartyForm({ ...newPartyForm, name: e.target.value });
                    }}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Address"
                    value={selectedParty?.address || newPartyForm.address}
                    onChange={(e) => setNewPartyForm({ ...newPartyForm, address: e.target.value })}
                    required
                    disabled={!!selectedParty}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="GSTIN"
                    value={selectedParty?.gstin || newPartyForm.gstin}
                    onChange={(e) => setNewPartyForm({ ...newPartyForm, gstin: e.target.value })}
                    disabled={!!selectedParty}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={selectedParty?.phone || newPartyForm.phone}
                    onChange={(e) => setNewPartyForm({ ...newPartyForm, phone: e.target.value })}
                    required
                    disabled={!!selectedParty}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Alternate Phone Number"
                    value={selectedParty?.alternate_phone || newPartyForm.alternate_phone}
                    onChange={(e) => setNewPartyForm({ ...newPartyForm, alternate_phone: e.target.value })}
                    disabled={!!selectedParty}
                  />
                </Grid>
              </>
            )}
            
            {/* Fallback: Simple party name input if no party selected */}
            {!selectedParty && !newPartyForm.name && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Party Name"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                required
                  helperText="Enter party name or search for existing party above"
              />
            </Grid>
            )}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<QrCodeScannerIcon />}
                  onClick={() => setScannerOpen(true)}
                  size="large"
                  disabled={scanningProduct}
                >
                  Scan Barcode
                </Button>
                <Button
                  variant="text"
                  onClick={() => {
                    const barcode = prompt('Enter Barcode (e.g., DNO101):');
                    if (barcode) {
                      handleScan(barcode);
                    }
                  }}
                  disabled={scanningProduct}
                >
                  Manual Entry
                </Button>
                {scanningProduct && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="text.secondary">
                      Product fetch ho raha hai...
                    </Typography>
                  </Box>
                )}
                {currentBarcode && !scanningProduct && (
                  <Chip 
                    label={`Last scanned: ${currentBarcode}`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                )}
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: '200px' }}>
                  Scan barcode or enter manually to add products
                </Typography>
              </Box>
            </Grid>

            {items.length > 0 && (
              <Grid item xs={12}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Design</TableCell>
                        <TableCell>Color</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="center">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.barcode}>
                          <TableCell>{item.product?.design_number}</TableCell>
                          <TableCell>{item.product?.color_description}</TableCell>
                          <TableCell align="right">₹{item.product?.selling_price?.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(item.barcode, parseInt(e.target.value) || 0)
                              }
                              inputProps={{ min: 1, style: { width: '60px', textAlign: 'right' } }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            ₹{((item.product?.selling_price || 0) * item.quantity).toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() =>
                                setItems(items.filter((i) => i.barcode !== item.barcode))
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 2, textAlign: 'right' }}>
                  <Typography variant="h6">
                    Total: ₹{totalAmount.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
            )}

          </Grid>
        </Box>

        {/* Company Box(es) */}
        {items.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              {showBothBoxes ? 'Select Company for Dispatch & Bill' : 'Create Dispatch & Bill'}
            </Typography>
            <Grid container spacing={3}>
              {/* Aaradhya Fashion Box - Show for admin or staff with aaradhya_fashion */}
              {(showBothBoxes || staffCompany === 'aaradhya_fashion') && (
              <Grid item xs={12} md={showBothBoxes ? 6 : 12}>
                <Card 
                  sx={{ 
                    height: '100%',
                    border: '2px solid',
                    borderColor: 'primary.main',
                    '&:hover': { boxShadow: 6, transform: 'translateY(-4px)' },
                    transition: 'all 0.3s',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <BusinessIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                      <Typography variant="h5" component="div" fontWeight="bold">
                        Aaradhya Fashion
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Party: {partyName || 'Not set'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Items: {items.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 'bold' }}>
                        Total Quantity: {items.reduce((sum, item) => sum + item.quantity, 0)} pcs
                      </Typography>
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                        <Typography variant="body2" color="text.secondary">
                          Subtotal: ₹{totalAmount.toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          GST (5%): ₹{gstAmount.toFixed(2)}
                        </Typography>
                        <Typography variant="h6" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>
                          Total: ₹{totalWithGST.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={() => handleCreateDispatchAndBill('aaradhya_fashion')}
                      disabled={loading || !partyName || items.length === 0}
                      startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                    >
                      Create Dispatch & Bill
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              )}

              {/* AF Creation Box - Show for admin or staff with af_creation */}
              {(showBothBoxes || staffCompany === 'af_creation') && (
              <Grid item xs={12} md={showBothBoxes ? 6 : 12}>
                <Card 
                  sx={{ 
                    height: '100%',
                    border: '2px solid',
                    borderColor: 'secondary.main',
                    '&:hover': { boxShadow: 6, transform: 'translateY(-4px)' },
                    transition: 'all 0.3s',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <BusinessIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                      <Typography variant="h5" component="div" fontWeight="bold">
                        AF Creation
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Party: {partyName || 'Not set'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Items: {items.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 'bold' }}>
                        Total Quantity: {items.reduce((sum, item) => sum + item.quantity, 0)} pcs
                      </Typography>
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                        <Typography variant="body2" color="text.secondary">
                          Subtotal: ₹{totalAmount.toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          GST: ₹0.00 (No GST)
                        </Typography>
                        <Typography variant="h6" color="secondary" sx={{ mt: 1, fontWeight: 'bold' }}>
                          Total: ₹{totalAmount.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="secondary"
                      size="large"
                      onClick={() => handleCreateDispatchAndBill('af_creation')}
                      disabled={loading || !partyName || items.length === 0}
                      startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                    >
                      Create Dispatch & Bill
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              )}
            </Grid>
          </Box>
        )}
      </Paper>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />

      {/* New Party Dialog */}
      <Dialog open={newPartyDialogOpen} onClose={() => setNewPartyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Party</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Party Name *"
                  value={newPartyForm.name}
                  onChange={(e) => setNewPartyForm({ ...newPartyForm, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address *"
                  value={newPartyForm.address}
                  onChange={(e) => setNewPartyForm({ ...newPartyForm, address: e.target.value })}
                  required
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="GSTIN"
                  value={newPartyForm.gstin}
                  onChange={(e) => setNewPartyForm({ ...newPartyForm, gstin: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Place of Supply"
                  value={newPartyForm.place_of_supply}
                  onChange={(e) => setNewPartyForm({ ...newPartyForm, place_of_supply: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number *"
                  value={newPartyForm.phone}
                  onChange={(e) => setNewPartyForm({ ...newPartyForm, phone: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Alternate Phone Number"
                  value={newPartyForm.alternate_phone}
                  onChange={(e) => setNewPartyForm({ ...newPartyForm, alternate_phone: e.target.value })}
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
                  value={newPartyForm.transport}
                  onChange={(e) => setNewPartyForm({ ...newPartyForm, transport: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Station"
                  value={newPartyForm.station}
                  onChange={(e) => setNewPartyForm({ ...newPartyForm, station: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Agent"
                  value={newPartyForm.agent}
                  onChange={(e) => setNewPartyForm({ ...newPartyForm, agent: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewPartyDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateNewParty} variant="contained" color="primary">
            Create Party
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
