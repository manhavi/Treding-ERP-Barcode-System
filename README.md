# Aaradhya Fashion - Lehenga Choli Business Management System

A comprehensive inventory and billing system for lehenga choli business with purchase management, barcode generation/scanning, dispatch tracking, and dual billing modes (with/without GST).

## Features

- **Purchase Management**: Add purchases with design numbers, colors, and selling prices
- **Barcode System**: Auto-generate unique barcodes based on design numbers
- **Inventory Management**: Track stock levels and search products
- **Dispatch Management**: Scan barcodes to add products to dispatch with party names
- **Dual Billing Modes**: 
  - Aaradhya Fashion: With 5% GST
  - AF Fashion: Without GST
- **PDF Bill Generation**: Generate and print bills
- **Mobile-Friendly**: Responsive PWA with offline support
- **Barcode Scanning**: Camera-based barcode scanning on mobile devices

## Tech Stack

- **Frontend**: React + TypeScript + Vite + PWA
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (development)
- **UI**: Material-UI
- **Barcode**: jsbarcode (generation) + html5-qrcode (scanning)
- **PDF**: jsPDF

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Backend Setup

```bash
cd backend
npm install

# Create .env file (copy from .env.example if needed)
# Set JWT_SECRET and other environment variables

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:3000`

### Mobile App on Android Emulator

App ko **emulator pe chalane** ke liye:

**Option 1 – Sab ek saath (backend + frontend + emulator + app):**
```bash
./run-full.sh
```

**Option 2 – Sirf emulator pe app (emulator + Metro + app):**
```bash
./run-app-on-emulator.sh
```

**Option 3 – Emulator pehle se chal raha ho:**
```bash
cd mobile && npm run android
```

**Requirements:** Android Studio with SDK, ek AVD (Device Manager se create karein). `ANDROID_HOME` set ho ya `~/Library/Android/sdk` use ho.

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the dist/ folder with a web server
```

## Project Structure

```
aaradhya-fashion/
├── frontend/          # React PWA frontend
├── backend/           # Node.js/Express backend
└── README.md
```

## Usage

1. **Register/Login**: Create an account or login to access the system
2. **Add Purchase**: 
   - Enter design number (e.g., "Dno 101")
   - Add color/description and prices
   - Barcode is auto-generated
   - Print barcode label to attach to product
3. **View Inventory**: Browse all products, search by design number, color, or barcode
4. **Create Dispatch**:
   - Enter party name
   - Scan barcodes to add products
   - Multiple products can be added
5. **Generate Bill**:
   - Select a dispatch
   - Choose bill type (Aaradhya Fashion with GST or AF Fashion without GST)
   - Download or print PDF bill

## Mobile Usage

- The app is a Progressive Web App (PWA)
- Install it on your mobile device for app-like experience
- Use camera to scan barcodes directly from the app
- Works offline - data syncs when connection is restored

## Notes

- Barcode format: Generated from design number (spaces removed, uppercase)
- GST: 5% applied only for "Aaradhya Fashion" bill type
- Offline mode: Purchases and dispatches are saved locally when offline and synced automatically when online

## License

ISC
