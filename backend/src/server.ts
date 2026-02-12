import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { runMigrations } from './database/migrate';
import authRoutes from './routes/auth';
import purchaseRoutes from './routes/purchases';
import inventoryRoutes from './routes/inventory';
import dispatchRoutes from './routes/dispatch';
import billRoutes from './routes/bills';
import staffRoutes from './routes/staff';
import partyRoutes from './routes/parties';
import backupRoutes from './routes/backup';
import { startScheduledBackups } from './utils/scheduler';
import { initializeWebSocket } from './utils/websocket';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const USE_HTTPS = process.env.USE_HTTPS !== 'false'; // Default to true

// Middleware
app.use(cors());
// Increase body size limit to 50MB for PDF data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Run migrations
runMigrations().catch(console.error);

// Start scheduled backups
startScheduledBackups();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/staff', staffRoutes);
// Sample XL download (no auth – template only, no sensitive data) – must be before partyRoutes
app.get('/api/parties/export-sample', (_req, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Name', 'Address', 'GSTIN', 'Phone', 'Alternate Phone', 'Place of Supply', 'Transport', 'Station', 'Agent'],
      ['Sample Party', '123 Main St, City', '24AABCU9603R1ZM', '9876543210', '', '24-Gujarat', '', '', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Parties');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=parties-upload-sample.xlsx');
    res.send(buf);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Sample export failed' });
  }
});
app.use('/api/parties', partyRoutes);
app.use('/api/backup', backupRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// HTTPS setup
const certPath = path.join(__dirname, '../../certs');
const keyPath = path.join(certPath, 'key.pem');
const certFilePath = path.join(certPath, 'cert.pem');

if (USE_HTTPS && fs.existsSync(keyPath) && fs.existsSync(certFilePath)) {
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certFilePath),
  };

  const httpsServer = https.createServer(httpsOptions, app);
  initializeWebSocket(httpsServer);
  
  httpsServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ HTTPS Server running on port ${PORT}`);
    console.log(`🏠 Local access: https://localhost:${PORT}`);
    console.log(`🌐 Network access: https://YOUR_IP:${PORT}`);
    console.log(`🔌 WebSocket enabled for real-time updates`);
  });
} else {
  // Fallback to HTTP if certificates not found
  const httpServer = http.createServer(app);
  initializeWebSocket(httpServer);
  
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ HTTP Server running on port ${PORT}`);
    console.log(`🏠 Local access: http://localhost:${PORT}`);
    console.log(`🌐 Network access: http://YOUR_IP:${PORT}`);
    console.log(`🔌 WebSocket enabled for real-time updates`);
    if (USE_HTTPS) {
      console.log(`💡 To enable HTTPS, ensure certificates exist at: ${certPath}`);
    }
  });
}
