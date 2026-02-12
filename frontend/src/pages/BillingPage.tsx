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
  Grid,
  Chip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import TextField from '@mui/material/TextField';
import api from '../services/api';
import { generateBillPDF, downloadBillPDF, downloadTaxInvoicePDF, generateTaxInvoicePDF, BillData } from '../services/pdf';
import { format } from 'date-fns';
import BarcodeScanner from '../components/BarcodeScanner';
import { useAuth } from '../context/AuthContext';
import TaxInvoiceTemplate from '../components/TaxInvoiceTemplate';
import AFCreationInvoiceTemplate from '../components/AFCreationInvoiceTemplate';
import { convertBillDataToInvoiceData } from '../utils/invoiceConverter';
import { convertBillDataToAFCreationInvoiceData } from '../utils/afCreationConverter';
import { formatBillNumber } from '../utils/billNumber';
import { generateInvoiceHTML } from '../utils/invoiceHtmlGenerator';
import { generateAFCreationInvoiceHTML } from '../utils/afCreationHtmlGenerator';
import { onBillCreated, onBillUpdated, offBillCreated, offBillUpdated } from '../services/websocket';

interface Bill {
  id: number;
  dispatch_id: number;
  bill_type: 'aaradhya_fashion' | 'af_creation';
  party_name: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  bill_date: string;
  invoice_number: number | null;
  created_by: number | null;
  created_by_role: string | null;
  created_by_name?: string | null; // Staff name or 'Admin'
  created_at: string;
}

export default function BillingPage() {
  const { isAdmin, user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [billPreview, setBillPreview] = useState<BillData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    party_name: '',
    items: [] as Array<{ design_number: string; color_description: string; quantity: number; price: number; total: number; barcode?: string }>,
  });
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [currentBarcode, setCurrentBarcode] = useState('');
  const [scanningProduct, setScanningProduct] = useState(false);
  const [billSearch, setBillSearch] = useState('');
  const [deleteConfirmBill, setDeleteConfirmBill] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadBills();
  }, []);

  // Real-time updates via WebSocket
  useEffect(() => {
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

  const loadBills = async (page: number = 1, limit: number = 50) => {
    setLoading(true);
    try {
      const response = await api.get('/bills', {
        params: { page, limit }
      });
      
      // Handle new paginated response format
      let allBills: Bill[] = [];
      if (Array.isArray(response.data)) {
        // Backward compatibility: if response is array, use it directly
        allBills = response.data;
      } else if (response.data.bills) {
        // New format: response has bills and pagination
        allBills = response.data.bills;
      } else {
        allBills = [];
      }
      
      // Backend already filters by created_by for staff, so we get only their bills
      // For staff with different PINs, also filter by company type
      // For staff with same PIN (hasBothCompanies), show all their bills (both companies)
      if (!isAdmin && !user?.hasBothCompanies && user?.company) {
        allBills = allBills.filter((bill: Bill) => bill.bill_type === user.company);
      }
      
      setBills(allBills);
    } catch (err: any) {
      console.error('Failed to load bills:', err);
      setMessage({ type: 'error', text: 'Failed to load bills' });
    } finally {
      setLoading(false);
    }
  };

  const loadBillDetails = async (billId: number) => {
    try {
      const response = await api.get(`/bills/${billId}`);
      return response.data;
    } catch (err: any) {
      throw new Error('Failed to load bill details');
    }
  };

  const handleViewBill = async (bill: Bill) => {
    try {
      const billDetails = await loadBillDetails(bill.id);
      
      if (!billDetails.items || billDetails.items.length === 0) {
        setMessage({ type: 'error', text: 'Bill has no items' });
        return;
      }

      const items = billDetails.items.map((item: any) => ({
        design_number: item.product?.design_number || item.design_number || '',
        color_description: item.product?.color_description || item.color_description || '',
        quantity: item.quantity,
        price: item.product?.selling_price || item.selling_price || 0,
        total: (item.product?.selling_price || item.selling_price || 0) * item.quantity,
      }));

      const billData: BillData = {
        billNumber: formatBillNumber(bill),
        billType: bill.bill_type,
        partyName: bill.party_name,
        date: format(new Date(bill.bill_date), 'dd/MM/yyyy'),
        items,
        subtotal: bill.subtotal,
        gstAmount: bill.gst_amount,
        totalAmount: bill.total_amount,
      };

      setBillPreview(billData);
      setSelectedBill(bill);
      setPreviewOpen(true);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to load bill details' });
    }
  };

  const handleDownloadPDF = async () => {
    if (billPreview) {
      if (billPreview.billType === 'aaradhya_fashion') {
        await downloadTaxInvoicePDF(billPreview, `Tax-Invoice-${billPreview.billNumber}.pdf`);
      } else {
        downloadBillPDF(billPreview, `Bill-${billPreview.billNumber}.pdf`);
      }
    }
  };

  const handleSharePDF = async () => {
    if (!billPreview) return;
    try {
      const filename = billPreview.billType === 'aaradhya_fashion'
        ? `Tax-Invoice-${billPreview.billNumber}.pdf`
        : `Bill-${billPreview.billNumber}.pdf`;
      const dataUrl = billPreview.billType === 'aaradhya_fashion'
        ? await generateTaxInvoicePDF(billPreview)
        : generateBillPDF(billPreview);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${billPreview.billNumber}`,
          text: `Invoice ${billPreview.billNumber} - ${billPreview.partyName}`,
        });
        setMessage({ type: 'success', text: 'Invoice shared!' });
      } else {
        if (billPreview.billType === 'aaradhya_fashion') {
          await downloadTaxInvoicePDF(billPreview, filename);
        } else {
          downloadBillPDF(billPreview, filename);
        }
        setMessage({ type: 'success', text: 'Share not supported on this device — PDF downloaded.' });
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setMessage({ type: 'error', text: err?.message || 'Failed to share PDF' });
    }
  };

  const handlePrintPDF = async () => {
    if (billPreview) {
      let htmlContent: string;
      
      if (billPreview.billType === 'aaradhya_fashion') {
        // Use new tax invoice template for Aaradhya Fashion
        const invoiceData = convertBillDataToInvoiceData(billPreview);
        htmlContent = generateInvoiceHTML(invoiceData);
      } else {
        // Use new AF Creation template
        const afCreationData = convertBillDataToAFCreationInvoiceData(billPreview);
        htmlContent = generateAFCreationInvoiceHTML(afCreationData);
      }
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait longer for all content to render, especially for print
        const waitForPrint = () => {
          if (printWindow.document.readyState === 'complete') {
            // Additional wait to ensure CSS is applied
            setTimeout(() => {
              printWindow.print();
            }, 1000);
          } else {
            setTimeout(waitForPrint, 100);
          }
        };
        
        // Start waiting
        setTimeout(waitForPrint, 500);
        
        // Fallback - print after 2 seconds regardless
        setTimeout(() => {
          printWindow.print();
        }, 2000);
      }
    }
  };

  const handleEditClick = async (bill: Bill) => {
    try {
      const billDetails = await loadBillDetails(bill.id);
      
      const items = billDetails.items.map((item: any) => ({
        design_number: item.product?.design_number || item.design_number || '',
        color_description: item.product?.color_description || item.color_description || '',
        quantity: item.quantity,
        price: item.product?.selling_price || item.selling_price || 0,
        total: (item.product?.selling_price || item.selling_price || 0) * item.quantity,
        barcode: item.scanned_barcode || item.product?.barcode || item.barcode || '',
      }));

      setEditForm({
        party_name: bill.party_name,
        items,
      });
      setEditingBill(bill);
      setEditDialogOpen(true);
      setCurrentBarcode('');
      setMessage(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to load bill for editing' });
    }
  };

  const handleEditSave = async () => {
    if (!editingBill) return;

    try {
      // Recalculate totals
      const subtotal = editForm.items.reduce((sum, item) => sum + item.total, 0);
      const gstRate = editingBill.bill_type === 'aaradhya_fashion' ? 0.05 : 0;
      const gstAmount = subtotal * gstRate;
      const totalAmount = subtotal + gstAmount;

      // Update bill
      await api.put(`/bills/${editingBill.id}`, {
        party_name: editForm.party_name,
        subtotal,
        gst_amount: gstAmount,
        total_amount: totalAmount,
      });

      // Regenerate PDF
      const billData: BillData = {
        billNumber: formatBillNumber(editingBill),
        billType: editingBill.bill_type,
        partyName: editForm.party_name,
        date: format(new Date(editingBill.bill_date), 'dd/MM/yyyy'),
        items: editForm.items,
        subtotal,
        gstAmount,
        totalAmount,
      };

      // Use new tax invoice template for Aaradhya Fashion, old method for AF Creation
      const pdfData = editingBill.bill_type === 'aaradhya_fashion'
        ? await generateTaxInvoicePDF(billData)
        : generateBillPDF(billData);
      await api.put(`/bills/${editingBill.id}/pdf`, { pdf_data: pdfData });

      setMessage({ type: 'success', text: 'Bill updated successfully!' });
      setEditDialogOpen(false);
      await loadBills();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update bill' });
    }
  };

  const handleItemChange = (index: number, field: 'quantity' | 'price', value: number) => {
    const newItems = [...editForm.items];
    if (field === 'quantity') {
      newItems[index].quantity = value;
      newItems[index].total = newItems[index].price * value;
    } else if (field === 'price') {
      newItems[index].price = value;
      newItems[index].total = value * newItems[index].quantity;
    }
    setEditForm({ ...editForm, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = editForm.items.filter((_, i) => i !== index);
    setEditForm({ ...editForm, items: newItems });
  };

  const handleDeleteBillClick = (bill: Bill) => {
    setDeleteConfirmBill(bill);
  };

  const handleConfirmDeleteBill = async () => {
    if (!deleteConfirmBill) return;
    setDeleting(true);
    try {
      await api.delete(`/bills/${deleteConfirmBill.id}`);
      setBills((prev) => prev.filter((b) => b.id !== deleteConfirmBill.id));
      setMessage({ type: 'success', text: `Bill ${formatBillNumber(deleteConfirmBill)} deleted.` });
      setDeleteConfirmBill(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete bill' });
    } finally {
      setDeleting(false);
    }
  };

  const handleScanForEdit = async (barcode: string) => {
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

      // Check if item already exists
      const existingItemIndex = editForm.items.findIndex((item) => item.barcode === normalizedBarcode);
      
      if (existingItemIndex >= 0) {
        // Increase quantity if item exists
        const newItems = [...editForm.items];
        newItems[existingItemIndex].quantity += 1;
        newItems[existingItemIndex].total = newItems[existingItemIndex].price * newItems[existingItemIndex].quantity;
        setEditForm({ ...editForm, items: newItems });
        setMessage({ type: 'success', text: `${product.design_number} - Quantity increased to ${newItems[existingItemIndex].quantity}` });
      } else {
        // Add new item
        const newItem = {
          design_number: product.design_number,
          color_description: product.color_description,
          quantity: 1,
          price: product.selling_price,
          total: product.selling_price,
          barcode: normalizedBarcode,
        };
        setEditForm({ 
          ...editForm, 
          items: [...editForm.items, newItem] 
        });
        setMessage({ type: 'success', text: `Product added: ${product.design_number} - ${product.color_description}` });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Product not found';
      setMessage({ type: 'error', text: `Barcode "${barcode}" ke liye product nahi mila. Error: ${errorMsg}` });
    } finally {
      setScanningProduct(false);
    }
  };

  const totalBills = bills.length;
  const totalAmount = bills.reduce((sum, bill) => sum + bill.total_amount, 0);
  const aaradhyaBills = bills.filter(b => b.bill_type === 'aaradhya_fashion');
  const afCreationBills = bills.filter(b => b.bill_type === 'af_creation');
  const aaradhyaTotal = aaradhyaBills.reduce((sum, bill) => sum + bill.total_amount, 0);
  const afCreationTotal = afCreationBills.reduce((sum, bill) => sum + bill.total_amount, 0);
  
  // Admin or staff with same PIN (hasBothCompanies) sees both company cards
  // Staff with different PINs sees only their company card
  const showBothCompanies = isAdmin || user?.hasBothCompanies === true;
  const staffCompany = user?.company; // 'aaradhya_fashion' or 'af_creation' for staff, null if both

  return (
    <Container maxWidth="lg">
      <Typography variant="h5" gutterBottom>
        Bills Ledger
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={showBothCompanies ? 4 : 6}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="h6">Total Bills</Typography>
            <Typography variant="h4">{totalBills}</Typography>
          </Paper>
        </Grid>
        {/* Admin or staff with same PIN (hasBothCompanies) sees both company cards */}
        {showBothCompanies && (
          <>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                <Typography variant="h6">Aaradhya Fashion</Typography>
                <Typography variant="h4">₹{aaradhyaTotal.toFixed(2)}</Typography>
                <Typography variant="body2">{aaradhyaBills.length} bills</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
                <Typography variant="h6">AF Creation</Typography>
                <Typography variant="h4">₹{afCreationTotal.toFixed(2)}</Typography>
                <Typography variant="body2">{afCreationBills.length} bills</Typography>
              </Paper>
            </Grid>
          </>
        )}
        {/* Staff with different PINs - aaradhya_fashion sees only their company card */}
        {!showBothCompanies && user?.company === 'aaradhya_fashion' && (
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <Typography variant="h6">Aaradhya Fashion</Typography>
              <Typography variant="h4">₹{aaradhyaTotal.toFixed(2)}</Typography>
              <Typography variant="body2">{aaradhyaBills.length} bills</Typography>
            </Paper>
          </Grid>
        )}
        {/* Staff with different PINs - af_creation sees only their company card */}
        {!showBothCompanies && user?.company === 'af_creation' && (
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
              <Typography variant="h6">AF Creation</Typography>
              <Typography variant="h4">₹{afCreationTotal.toFixed(2)}</Typography>
              <Typography variant="body2">{afCreationBills.length} bills</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Typography variant="h6" gutterBottom>
          All Bills
        </Typography>

        <TextField
          fullWidth
          size="small"
          placeholder="Search by bill number (AF-1001, AFC-11001), party name, or date..."
          value={billSearch}
          onChange={(e) => setBillSearch(e.target.value)}
          sx={{ mb: 2, maxWidth: 500 }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
          }}
        />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Bill No</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Party Name</TableCell>
                  <TableCell>Company</TableCell>
                  {isAdmin && <TableCell>Created By</TableCell>}
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell align="right">GST</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const q = billSearch.trim().toLowerCase();
                  const filteredBills = q
                    ? bills.filter(
                        (b) =>
                          formatBillNumber(b).toLowerCase().includes(q) ||
                          b.party_name.toLowerCase().includes(q) ||
                          format(new Date(b.bill_date), 'dd/MM/yyyy').includes(q) ||
                          format(new Date(b.bill_date), 'dd-MM-yyyy').toLowerCase().includes(q)
                      )
                    : bills;
                  return filteredBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 9 : 8} align="center">
                        {billSearch.trim() ? 'No bills match your search' : 'No bills found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>{formatBillNumber(bill)}</TableCell>
                      <TableCell>{format(new Date(bill.bill_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{bill.party_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={bill.bill_type === 'aaradhya_fashion' ? 'Aaradhya Fashion' : 'AF Creation'}
                          color={bill.bill_type === 'aaradhya_fashion' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Chip
                            label={bill.created_by_name || 'Admin'}
                            size="small"
                            variant="outlined"
                            color={bill.created_by_role === 'admin' ? 'default' : 'primary'}
                          />
                        </TableCell>
                      )}
                      <TableCell align="right">₹{bill.subtotal.toFixed(2)}</TableCell>
                      <TableCell align="right">₹{bill.gst_amount.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          ₹{bill.total_amount.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => handleEditClick(bill)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleViewBill(bill)}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDeleteBillClick(bill)}
                          >
                            Delete
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                    ))
                  );
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog 
        open={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            overflow: 'auto'
          }
        }}
      >
        <DialogTitle>
          Invoice Preview - {billPreview?.billType === 'aaradhya_fashion' ? 'Aaradhya Fashion' : 'AF Creation'}
        </DialogTitle>
        <DialogContent>
          {billPreview && (
            <Box>
              {billPreview.billType === 'aaradhya_fashion' ? (
                <TaxInvoiceTemplate data={convertBillDataToInvoiceData(billPreview)} />
              ) : (
                <AFCreationInvoiceTemplate data={convertBillDataToAFCreationInvoiceData(billPreview)} />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDownloadPDF} startIcon={<DownloadIcon />}>
            Download PDF
          </Button>
          <Button onClick={handleSharePDF} startIcon={<ShareIcon />} variant="outlined">
            Share (WhatsApp / Email)
          </Button>
          <Button onClick={handlePrintPDF} startIcon={<PrintIcon />} variant="contained">
            Print
          </Button>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Bill Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Bill - {editingBill?.bill_type === 'aaradhya_fashion' ? 'Aaradhya Fashion' : 'AF Creation'}</DialogTitle>
        <DialogContent>
          {editingBill && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              {message && (
                <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
                  {message.text}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Party Name"
                value={editForm.party_name}
                onChange={(e) => setEditForm({ ...editForm, party_name: e.target.value })}
                required
              />

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<QrCodeScannerIcon />}
                  onClick={() => setScannerOpen(true)}
                  size="medium"
                  disabled={scanningProduct}
                >
                  Scan Barcode
                </Button>
                <Button
                  variant="text"
                  onClick={() => {
                    const barcode = prompt('Enter Barcode (e.g., DNO101):');
                    if (barcode) {
                      handleScanForEdit(barcode);
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
              </Box>

              <Typography variant="h6" sx={{ mt: 2 }}>Items</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Design</TableCell>
                      <TableCell>Color</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {editForm.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.design_number}</TableCell>
                        <TableCell>{item.color_description}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                            inputProps={{ min: 1, style: { width: '70px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={item.price}
                            onChange={(e) => handleItemChange(idx, 'price', parseFloat(e.target.value) || 0)}
                            inputProps={{ min: 0, step: 0.01, style: { width: '100px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell align="right">₹{item.total.toFixed(2)}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleRemoveItem(idx)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 2, textAlign: 'right', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Total Quantity: {editForm.items.reduce((sum, item) => sum + item.quantity, 0)} pcs
                </Typography>
                <Typography>Subtotal: ₹{editForm.items.reduce((sum, item) => sum + item.total, 0).toFixed(2)}</Typography>
                {editingBill.bill_type === 'aaradhya_fashion' && (
                  <Typography>GST (5%): ₹{(editForm.items.reduce((sum, item) => sum + item.total, 0) * 0.05).toFixed(2)}</Typography>
                )}
                <Typography variant="h6" sx={{ mt: 1 }}>
                  Total: ₹{(
                    editForm.items.reduce((sum, item) => sum + item.total, 0) * 
                    (editingBill.bill_type === 'aaradhya_fashion' ? 1.05 : 1)
                  ).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditDialogOpen(false);
            setScannerOpen(false);
            setCurrentBarcode('');
            setScanningProduct(false);
          }}>Cancel</Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained"
            disabled={!editForm.party_name || editForm.items.length === 0}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barcode Scanner for Edit Bill */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScanForEdit}
      />
    </Container>
  );
}
