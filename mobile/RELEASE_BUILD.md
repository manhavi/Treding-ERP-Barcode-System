# Release APK Build — Aaradhya Fashion Mobile

## ⚠️ "No space left on device" fix

Agar build fail ho **"No space left on device"** / **"java.io.IOException: No space left on device"** dikhaye, disk full hai. Pehle space free karo:

1. **Gradle cache clear karo** (sabse zyada space ~2–5 GB):
   ```bash
   rm -rf ~/.gradle/caches/
   ```
   Next build par Gradle dubara download karega; build phir chalao.

2. **Project cleanup** (project root se):
   ```bash
   ./cleanup.sh
   CLEAN_ANDROID_BUILD=1 ./cleanup.sh
   ```
   Isse `mobile/android/app/build`, logs, Metro cache clear honge.

3. **Disk space check**:
   ```bash
   df -h .
   ```
   Kam se kam **3–5 GB free** hona chahiye release build ke liye.

4. **Optional:** Mac par bade folders hatao (Downloads, Trash, purane apps) ya **About This Mac → Storage** se dekho kya space le raha hai.

Space free hone ke baad phir:
```bash
cd mobile && npm run build:release
```

---

## Quick build (recommended)

Terminal mein project root se:

```bash
cd mobile
npm run build:release
```

**Time:** ~5–10 minutes (pehli baar zyada, baad mein kam)

APK location (build success ke baad):

```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## Step-by-step (optional)

1. **API URL set karo** (real device / production ke liye)  
   Edit: `mobile/src/config.ts`  
   - Emulator: `http://10.0.2.2:3001/api` (default)  
   - Same WiFi phone: `http://YOUR_MAC_IP:3001/api`  
   - Production: `https://your-domain.com/api`

2. **Libraries patch** (agar pehle kabhi nahi chala):
   ```bash
   cd mobile
   ./patch-libraries.sh
   ```

3. **Release APK build**:
   ```bash
   cd mobile
   npm run build:release
   ```
   Ya full script (API prompt ke sath):
   ```bash
   cd mobile
   ./build-release-apk.sh
   ```

4. **APK install**
   - USB: `adb install mobile/android/app/build/outputs/apk/release/app-release.apk`
   - Ya APK file share karke phone par install karo (Unknown sources allow karo)

---

## Troubleshooting

- **Java error:** `java -version` (Java 17 recommended)
- **Gradle error:** `cd mobile/android && ./gradlew clean && ./gradlew assembleRelease --stacktrace`
- **Metro / bundle slow:** First build slow hai; wait karo

### "jdkImage" / IllegalArgumentException (AsyncStorage compile fail)

Agar error aaye:
```text
Execution failed for task ':react-native-async-storage_async-storage:compileReleaseJavaWithJavac'.
> java.lang.IllegalArgumentException: .../.gradle/caches/transforms-3/.../transformed/output/jdkImage
```

Gradle ka transform cache corrupt ho sakta hai (especially cache clear ke baad). Fix:

1. **Corrupted transform hatao** (path mein jo hash hai woh use karo):
   ```bash
   rm -rf ~/.gradle/caches/transforms-3/789491f72d35e227c4d2d3bb4a2cce6b
   ```
   Ya **pura transforms-3** clear karo:
   ```bash
   rm -rf ~/.gradle/caches/transforms-3
   ```

2. **Gradle daemon band karo** (optional, stale path clear ke liye):
   ```bash
   cd mobile/android && ./gradlew --stop
   ```

3. **Phir release build chalao**:
   ```bash
   cd mobile && npm run build:release
   ```
