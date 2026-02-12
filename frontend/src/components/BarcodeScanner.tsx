import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [initializing, setInitializing] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const scannerId = 'html5qr-code-full-region';

  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   (window.innerWidth <= 768);

  // Check if camera API is supported
  const isCameraSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  // Check if HTTPS or localhost (required for camera on mobile)
  const isSecureContext = () => {
    return window.isSecureContext || 
           window.location.protocol === 'https:' || 
           window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
  };

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopScanner();
      setManualMode(false);
      setManualBarcode('');
      setError('');
      setInitializing(false);
      setScanning(false);
      setPermissionRequested(false);
    }
  }, [open]);

  // Start camera when dialog opens (only on desktop, mobile needs button click)
  useEffect(() => {
    if (!open || manualMode || isMobile) return;

    // Wait for dialog to fully render
    const timer = setTimeout(() => {
      startScanner();
    }, 500);

    return () => clearTimeout(timer);
  }, [open, manualMode, isMobile]);

  const startScanner = async () => {
    if (manualMode) return;

    // Clean up existing scanner
    await stopScanner();

    // Wait for element to exist and be ready
    const waitForElement = (): Promise<HTMLElement> => {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 30;
        
        const check = () => {
          const element = document.getElementById(scannerId);
          if (element) {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            // Check if element is visible and has dimensions
            if (rect.width > 50 && rect.height > 50 && 
                style.display !== 'none' && 
                style.visibility !== 'hidden' &&
                element.offsetParent !== null) {
              resolve(element);
              return;
            }
          }
          
          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error('Element not ready after waiting'));
            return;
          }
          
          setTimeout(check, 150);
        };
        
        check();
      });
    };

    try {
      await waitForElement();

      // Double check element is still in DOM
      if (!document.getElementById(scannerId)) {
        throw new Error('Element removed from DOM');
      }
      
      setInitializing(true);
      setError('');
      setScanning(false);

      // Verify element is still accessible
      const verifyElement = document.getElementById(scannerId);
      if (!verifyElement) {
        throw new Error('Element not found in DOM');
      }
      
      const finalRect = verifyElement.getBoundingClientRect();
      if (finalRect.width === 0 || finalRect.height === 0) {
        throw new Error('Element has no dimensions');
      }

      // Create scanner instance - element must exist and be ready
      scannerRef.current = new Html5Qrcode(scannerId);
      
      // Get cameras
      let cameraId: string | { facingMode: string } = { facingMode: 'environment' };
      
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          // Prefer back camera
          const backCam = cameras.find((cam: any) => {
            const label = (cam.label || '').toLowerCase();
            return label.includes('back') || label.includes('rear') || label.includes('environment');
          });
          cameraId = backCam ? backCam.id : cameras[0].id;
        }
      } catch (camErr) {
        cameraId = { facingMode: 'environment' };
      }

      // Double check element before starting - critical check
      const elementBeforeStart = document.getElementById(scannerId);
      if (!elementBeforeStart) {
        throw new Error('Element disappeared before starting scanner');
      }
      
      // Force a reflow to ensure element is fully rendered
      elementBeforeStart.offsetHeight;
      
      // Verify element has dimensions
      const finalCheck = elementBeforeStart.getBoundingClientRect();
      if (finalCheck.width === 0 || finalCheck.height === 0) {
        throw new Error(`Element has invalid dimensions: ${finalCheck.width}x${finalCheck.height}`);
      }

      // Start scanning - element is guaranteed to exist now
      // Use dynamic qrbox function for better compatibility
      await scannerRef.current.start(
        cameraId,
        {
          fps: 30, // Higher FPS for better detection
          qrbox: function(viewfinderWidth, viewfinderHeight) {
            // Use 85% of the smaller dimension for scanning box
            const minEdgePercentage = 0.85;
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            return {
              width: qrboxSize,
              height: qrboxSize
            };
          },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          // Immediately stop scanning to prevent multiple scans
          stopScanner().then(() => {
            handleBarcodeScanned(decodedText);
          }).catch(() => {
            handleBarcodeScanned(decodedText);
          });
        },
        (errorMessage) => {
          // These are normal scanning messages - scanner is looking for codes
          // Only log if it's an actual error
          if (errorMessage && 
              !errorMessage.includes('NotFoundException') && 
              !errorMessage.includes('No MultiFormat Readers') &&
              !errorMessage.includes('QR code parse error') &&
              !errorMessage.includes('No QR code found')) {
            // Normal scanning, ignore
          }
        }
      );

      setInitializing(false);
      setScanning(true);
      setError('');

    } catch (err: any) {
      if (import.meta?.env?.DEV) console.error('Scanner error:', err);
      setInitializing(false);
      setScanning(false);

      let errorMsg = 'Camera start nahi ho rahi.';
      const errMsg = (err.message || '').toLowerCase();
      const errName = err.name || '';

      if (errMsg.includes('permission') || errMsg.includes('notallowed') || errName === 'NotAllowedError') {
        errorMsg = 'Camera permission chahiye. Neeche "Request Permission" button click karein.';
      } else if (errMsg.includes('notfound') || errName === 'NotFoundError') {
        errorMsg = 'Camera nahi mili. Camera connect karein.';
      } else if (errMsg.includes('notreadable') || errName === 'NotReadableError') {
        errorMsg = 'Camera already use ho rahi hai. Dusre apps band karein.';
      } else if (errMsg.includes('element not ready')) {
        errorMsg = 'Scanner element not ready. Please close and try again.';
      } else {
        errorMsg = `Error: ${err.message || errMsg}`;
      }

      setError(errorMsg);
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    const normalizedBarcode = barcode.trim().toUpperCase().replace(/\s+/g, '');
    if (!normalizedBarcode) return;
    try {
      onScan(normalizedBarcode);
    } catch (_) {}
    setTimeout(() => onClose(), 200);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        // Ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setInitializing(false);
  };

  const handleClose = async () => {
    await stopScanner();
    setManualBarcode('');
    setManualMode(false);
    setError('');
    onClose();
  };

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim().toUpperCase());
      setManualBarcode('');
      handleClose();
    }
  };

  const requestPermission = async () => {
    setInitializing(true);
    setError('');
    setPermissionRequested(true);

    try {
      // Check if camera API is available
      if (!isCameraSupported()) {
        if (isMobile && !isSecureContext()) {
          throw new Error('HTTPS_REQUIRED');
        }
        throw new Error('Camera API not supported on this browser. Chrome, Firefox, or Safari use karein.');
      }

      // Check HTTPS requirement for mobile
      if (isMobile && !isSecureContext()) {
        throw new Error('HTTPS_REQUIRED');
      }

      // Request permission with explicit user interaction
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      }).catch(() => {
        return navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
      }).catch(() => {
        return navigator.mediaDevices.getUserMedia({ video: true });
      });

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      setInitializing(false);
      setTimeout(() => startScanner(), 300);

    } catch (permErr: any) {
      if (import.meta?.env?.DEV) console.error('Permission error:', permErr);
      setInitializing(false);
      const errMsg = (permErr.message || '').toLowerCase();
      const errName = permErr.name || '';
      
      if (errMsg.includes('https_required') || permErr.message === 'HTTPS_REQUIRED') {
        setError('Mobile browsers me camera ke liye HTTPS chahiye. Aap HTTPS setup kar sakte hain ya same network me computer ka IP use karein. Alternative: Manual Entry button use karein.');
      } else if (errMsg.includes('permission') || errMsg.includes('notallowed') || errName === 'NotAllowedError') {
        setError('Camera permission denied. Browser settings me manually allow karein. Settings > Site Settings > Camera > Allow');
      } else if (errMsg.includes('notfound') || errName === 'NotFoundError') {
        setError('Camera nahi mili. Camera connect karein.');
      } else if (errMsg.includes('api not supported')) {
        setError('Camera API not supported. Chrome, Firefox, ya Safari browser use karein.');
      } else {
        setError(`Error: ${permErr.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      fullScreen
      PaperProps={{
        sx: { backgroundColor: '#000' }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'rgba(0,0,0,0.95)', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography component="div" variant="h6">
          {manualMode ? 'Manual Entry' : 'Barcode Scanner'}
        </Typography>
        <Box>
          {!manualMode && (
            <IconButton onClick={() => { stopScanner(); setManualMode(true); }} sx={{ color: 'white', mr: 1 }}>
              <KeyboardIcon />
            </IconButton>
          )}
          {manualMode && (
            <IconButton onClick={() => { setManualMode(false); }} sx={{ color: 'white', mr: 1 }}>
              <QrCodeScannerIcon />
            </IconButton>
          )}
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
        {manualMode ? (
          <Box sx={{ p: 3, bgcolor: 'background.paper', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <TextField
              fullWidth
              label="Barcode Enter Karein"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="DNO101"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
              sx={{ mb: 2 }}
              size="medium"
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleManualSubmit}
              disabled={!manualBarcode.trim()}
              size="large"
            >
              Add Product
            </Button>
          </Box>
        ) : (
          <Box 
            data-scanner-container
            sx={{ 
              width: '100%', 
              height: '100%', 
              position: 'relative',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {error ? (
              <Box sx={{ p: 3, textAlign: 'center', maxWidth: '90%' }}>
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                <Button variant="contained" onClick={() => { setManualMode(true); }} sx={{ mb: 2 }} fullWidth size="large">
                  Manual Entry
                </Button>
                <Button variant="outlined" onClick={requestPermission} sx={{ mb: 2, color: 'white', borderColor: 'white' }} fullWidth size="large">
                  Request Permission Again
                </Button>
                <Button variant="text" onClick={startScanner} sx={{ color: 'rgba(255,255,255,0.7)' }} size="large">
                  Retry
                </Button>
              </Box>
            ) : !permissionRequested && isMobile ? (
              <Box sx={{ p: 3, textAlign: 'center', maxWidth: '90%', color: 'white' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  📷 Barcode Scanner
                </Typography>
                {!isSecureContext() && (
                  <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(33,150,243,0.2)', color: 'white', textAlign: 'left' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Mobile Camera Access:
                    </Typography>
                    <Typography variant="body2" component="div">
                      Mobile browsers me camera ke liye HTTPS chahiye. Abhi HTTP use ho raha hai.
                      <br /><br />
                      <strong>Solution:</strong> Manual Entry button use karein - yeh sabse easy hai!
                    </Typography>
                  </Alert>
                )}
                <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255,255,255,0.8)' }}>
                  Camera try karein ya directly Manual Entry use karein
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={() => { setManualMode(true); }} 
                  size="large"
                  fullWidth
                  sx={{ mb: 2, color: 'white', borderColor: 'white', py: 1.5, fontSize: '1.1rem' }}
                >
                  📝 Manual Entry (Recommended)
                </Button>
                <Button 
                  variant="contained" 
                  onClick={requestPermission} 
                  size="large"
                  fullWidth
                  disabled={!isCameraSupported() || (isMobile && !isSecureContext())}
                  sx={{ py: 1.5, fontSize: '1.1rem' }}
                >
                  📷 Try Camera (HTTPS Required)
                </Button>
                {!isSecureContext() && (
                  <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'rgba(255,255,255,0.6)' }}>
                    Camera ke liye HTTPS setup karna hoga
                  </Typography>
                )}
              </Box>
            ) : (
              <>
                {/* Always render element in DOM, even when initializing */}
                <Box
                  id={scannerId}
                  sx={{
                    width: '100%',
                    height: '100%',
                    minHeight: '400px',
                    position: 'relative',
                    backgroundColor: '#000',
                    display: 'block',
                    visibility: initializing ? 'hidden' : 'visible',
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '400px',
                  }}
                />
                {initializing && (
                  <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: 'white',
                    zIndex: 20
                  }}>
                    <CircularProgress sx={{ color: 'white', mb: 2 }} size={60} />
                    <Typography variant="h6">Camera start ho rahi hai...</Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.7)' }}>
                      Permission allow karein
                    </Typography>
                  </Box>
                )}
                {scanning && !initializing && (
                  <Box sx={{
                    position: 'absolute',
                    bottom: 100,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    p: 2,
                    borderRadius: 2,
                    textAlign: 'center',
                    maxWidth: '90%',
                    zIndex: 10
                  }}>
                    <Typography component="div" variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                      📷 Camera Active - Scanning...
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Barcode/QR Code ko camera ke saamne rakhein
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.7)' }}>
                      Auto-detect ho jayega jab barcode dikhega
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ bgcolor: 'rgba(0,0,0,0.95)', p: 2 }}>
        <Button onClick={handleClose} variant="outlined" sx={{ color: 'white', borderColor: 'white' }} size="large">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
