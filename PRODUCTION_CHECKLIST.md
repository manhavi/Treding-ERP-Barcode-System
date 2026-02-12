# Production Checklist – Aaradhya Fashion ERP

## Jo kaam ho chuka hai (Done)

### 1. Bekar / dev-only files hata diye
- **MD docs (24 files):** ANDROID_EMULATOR_SETUP, APP_LOGIN_FIX, BACKUP_RESTORE_GUIDE, BARCODE_SCANNER_FIX, CLEAN_REBUILD_GUIDE, DATABASE-INFO, DEBUG_SUMMARY, ENV_SETUP, GOOGLE_DRIVE_SETUP_STEPS, LOGIN_*_FIX, PROFESSIONAL_UI_REDESIGN, QUICK_*, README_DEPLOY, REALTIME_SYNC_SETUP, REBUILD_UI_SIMPLE, START-HERE, SYNC-DATABASE, TESTING_GUIDE, UI_IMPROVEMENTS_SUMMARY, WEBSOCKET_FIX, backend/GOOGLE_DRIVE_SETUP, mobile/APP_ICON_GUIDE
- **Shell scripts (11):** cleanup.sh, first-time-setup.sh, fix-and-start-backend.sh, kill-all-ports.sh, rebuild-app.sh, run-full.sh, start-all.sh, start-android-emulator.sh, start-project.sh, stop-all.sh, test-login.sh
- **Logs:** logs/backend.log, emulator.log, frontend.log, metro.log
- **Backup certs:** certs_backup/cert.pem, key.pem

### 2. Jo rakha hai (Kept for production)
- **README.md** – project overview
- **PRODUCTION_GUIDE.md** – deployment steps
- **Scripts:** BUILD_AND_INSTALL.sh, restart-and-deploy.sh, setup-production.sh, start-backend.sh, start-frontend.sh
- **.env.example** – env template (production me JWT_SECRET change karein)

### 3. Security / production hardening
- **Auth:** Login pe request body, code, admin code ab log nahi hote (sensitive data leak fix).
- **Backend auth:** Sirf development me console.error; production me generic “Internal server error”.
- **Frontend:** AuthContext se login code/URL logs hata diye.
- **BarcodeScanner:** Debug console.log hata diye; errors sirf DEV me log.
- **WebSocket:** Logs sirf `import.meta.env.DEV` me.

### 4. Code fixes (build / types)
- **vite-env.d.ts** – `import.meta.env` ke liye type support.
- **App.tsx** – useEffect cleanup return type fix.
- **DispatchPage** – setNewPartyForm me transport, station, agent add kiye.
- **StaffPage** – setForm me can_access_parties add kiya.
- **BackupPage** – message type me `'warning'` add kiya.
- **BarcodeScanner** – unused vars/imports hata diye, TextField size medium.

---

## Production se pehle zaroor karein

1. **.env:** Copy `.env.example` → `.env`, aur **JWT_SECRET** strong random value se change karein.
2. **Admin code:** `backend/src/routes/auth.ts` me `ADMIN_CODE` ko production value se change karein (ya env me move karein).
3. **API URL:** Production server IP/host ke hisaab se `VITE_API_URL` / `API_URL` set karein.
4. **HTTPS:** Production me certs (certs/cert.pem, key.pem) ya reverse proxy (nginx) se HTTPS use karein.
5. **Database:** SQLite file path (`DATABASE_PATH`) aur backups folder permissions check karein.
6. **PWA build:** Agar `npm run build` me service worker error aaye to `vite.config.ts` me PWA plugin options / workbox version check karein (ye tooling issue ho sakta hai).

---

## Production readiness score

| Area              | Score | Note |
|-------------------|-------|------|
| Cleanup (no junk) | 9/10  | Dev-only docs/scripts/logs hata diye; .env.example clear. |
| Security          | 8/10  | Sensitive logs fix; JWT + admin code ab bhi env/code me set karna baaki. |
| Code quality      | 8/10  | Auth/scanner/websocket logs production-safe; TS build pass. |
| Config / deploy   | 8/10  | PRODUCTION_GUIDE + scripts maujood; env + HTTPS steps clear. |
| Build             | 7/10  | Backend build OK; frontend TS + Vite build chal raha hai, PWA SW step pe plugin error possible. |

**Overall: 8/10** – Project production ke kaafi kareeb hai; upar wale “Production se pehle zaroor karein” steps karne ke baad deploy kiya ja sakta hai.

---

*Last updated: cleanup + security + build fixes ke baad.*
