# 🚀 Production Deployment Guide
## Aaradhya Fashion ERP System

यह guide आपको mobile app और web application दोनों को production में चलाने में मदद करेगी।

---

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Mobile App Setup](#mobile-app-setup)
3. [Web Application Setup](#web-application-setup)
4. [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Start

### एक कमांड में सब कुछ setup करें:

```bash
./setup-production.sh
```

यह script automatically करेगा:
- ✅ Backend dependencies install
- ✅ Frontend dependencies install  
- ✅ Database migration
- ✅ Mobile app API configuration
- ✅ आपका local IP address detect

---

## 📱 Mobile App Setup

### Step 1: Mobile App में अपना IP Address Configure करें

अगर automatic setup ने काम नहीं किया, तो manually करें:

#### A. अपना IP Address पता करें:

**macOS:**
```bash
# Option 1: Network Settings
System Settings > Network > Wi-Fi > Details

# Option 2: Terminal
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Example IP:** `192.168.1.9`

#### B. Mobile App में IP Update करें:

File: `mobile/src/services/api.ts`

```typescript
const getBaseURL = () => {
  // अपना actual IP यहाँ डालें
  return 'http://192.168.1.9:3001/api';  // ⬅️ यहाँ अपना IP डालें
};
```

### Step 2: APK Build करें

```bash
cd mobile/android
./gradlew clean assembleDebug
```

**Build time:** ~2-5 minutes

### Step 3: APK Install करें

APK location:
```
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

**Phone में install करने के तरीके:**

**Option 1: USB Cable**
```bash
adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

**Option 2: Share करके**
1. APK file को Google Drive/WhatsApp से share करें
2. Phone में download करें
3. Install करें (Unknown sources को allow करें)

**Option 3: AirDrop (Mac to iPhone)**
1. APK को IPA में convert करें (iOS के लिए अलग build चाहिए)
2. या Android phone use करें

### Step 4: Network Configuration

**महत्वपूर्ण:** Phone और Computer दोनों **same Wi-Fi network** पर होने चाहिए!

---

## 🌐 Web Application Setup

### Step 1: Backend Start करें

```bash
./start-backend.sh
```

Backend चलेगा: `http://localhost:3001/api`

**Check करें:**
```bash
curl http://localhost:3001/api/auth/check
```

### Step 2: Frontend Start करें (New Terminal में)

```bash
./start-frontend.sh
```

Frontend चलेगा: `http://localhost:5173`

### Step 3: Browser में खोलें

```
http://localhost:5173
```

**Default Login:**
- Username: `admin`
- Password: `admin123`

---

## 🔧 Manual Setup (अगर automatic script काम न करे)

### Backend Manual Setup:

```bash
cd backend

# Dependencies install करें
npm install

# Environment variables setup करें
cat > .env << EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=aaradhya-fashion-secret-2026
DATABASE_PATH=./database/aaradhya.db
EOF

# Database migrate करें
npm run migrate

# Server start करें
npm run dev
```

### Frontend Manual Setup:

```bash
cd frontend

# Dependencies install करें
npm install

# Environment variables setup करें
cat > .env << EOF
VITE_API_URL=http://localhost:3001/api
EOF

# Server start करें
npm run dev
```

---

## 🐛 Troubleshooting

### Problem 1: Mobile App "Network Error" दिखाता है

**Solution:**
1. Computer का IP address check करें:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Mobile app में IP update करें (`mobile/src/services/api.ts`)

3. APK rebuild करें:
   ```bash
   cd mobile/android
   ./gradlew clean assembleDebug
   ```

4. Phone और Computer same Wi-Fi पर हैं verify करें

### Problem 2: Backend start नहीं होता

**Check करें:**
```bash
# Port 3001 free है?
lsof -i :3001

# अगर कुछ चल रहा है तो kill करें
kill -9 <PID>
```

**Database issue:**
```bash
cd backend
rm -rf database/aaradhya.db
npm run migrate
```

### Problem 3: Frontend "Cannot connect to backend" error

**Check करें:**
1. Backend चल रहा है?
   ```bash
   curl http://localhost:3001/api/auth/check
   ```

2. `.env` file सही है?
   ```bash
   cat frontend/.env
   # Should show: VITE_API_URL=http://localhost:3001/api
   ```

3. Browser console में error check करें (F12)

### Problem 4: Gradle Build Failed

**Solution 1: Clean करें**
```bash
cd mobile/android
./gradlew clean
./gradlew assembleDebug
```

**Solution 2: Cache clear करें**
```bash
cd mobile
rm -rf android/.gradle
rm -rf android/app/build
cd android
./gradlew clean assembleDebug
```

**Solution 3: Dependencies check करें**
```bash
cd mobile
npm install
```

### Problem 5: Port already in use

**Backend (3001):**
```bash
# Process find करें
lsof -i :3001

# Kill करें
kill -9 <PID>
```

**Frontend (5173):**
```bash
# Process find करें
lsof -i :5173

# Kill करें
kill -9 <PID>
```

---

## 📊 System Requirements

### Development Machine:
- ✅ macOS (आपका current system)
- ✅ Node.js (installed)
- ✅ Android SDK (installed)
- ✅ Java 17 (required for Gradle)

### Mobile Device:
- Android 5.0+ (API 21+)
- Same Wi-Fi network as computer

---

## 🔐 Security Notes

### Production के लिए जरूरी changes:

1. **JWT Secret बदलें:**
   ```bash
   # backend/.env
   JWT_SECRET=your-very-secure-random-secret-here
   ```

2. **Default admin password बदलें:**
   Login करके Settings > Change Password

3. **CORS configure करें (if needed):**
   ```typescript
   // backend/src/server.ts में
   app.use(cors({
     origin: ['http://your-domain.com']
   }));
   ```

---

## 📱 Testing Checklist

### Mobile App:
- [ ] Login work करता है
- [ ] Barcode scanning work करता है
- [ ] Data sync होता है
- [ ] Offline mode काम करता है

### Web App:
- [ ] Login work करता है
- [ ] All pages load होते हैं
- [ ] Forms submit होते हैं
- [ ] Printing work करती है

---

## 🎯 Next Steps

1. ✅ **Setup Complete होने के बाद:**
   - Test करें all features
   - Sample data डालें
   - Staff को train करें

2. 🚀 **Production Deployment के लिए:**
   - Cloud server setup करें (AWS, DigitalOcean, etc.)
   - Domain name configure करें
   - HTTPS enable करें
   - Regular backups setup करें

3. 📱 **Mobile App Release:**
   - Release build बनाएं
   - Play Store पर upload करें
   - या Direct APK distribute करें

---

## 📞 Support

Issues आने पर check करें:
1. Terminal में errors
2. Browser console (F12)
3. Mobile app logs (React Native debugger)

---

## 🎉 Success!

अगर सब कुछ काम कर रहा है:
- ✅ Backend: http://localhost:3001/api
- ✅ Frontend: http://localhost:5173
- ✅ Mobile App: Connected to your IP
- ✅ Database: Running and synced

**Happy Coding! 🚀**
