# 📱 Mobile App – AWS Server के साथ Final APK Build

यह ऐप **http://13.201.67.96** (AWS backend) से बात करेगा। APK अपने **Mac/PC** पर बनाएं (AWS सर्वर पर नहीं)।

---

## ✅ पहले ही किया गया

- **mobile/src/config.ts** में `API_URL = 'http://13.201.67.96/api'` सेट कर दिया गया है।  
  अगर बाद में IP/domain बदलें तो वही फाइल में बदलें।

---

## 1. जरूरी चीजें (Mac/PC पर)

- **Node.js** (v18 या v20)
- **Java 17** (Android build के लिए)
- **Android Studio** या **Android SDK** (command line से build के लिए)

Java check:
```bash
java -version
# 17.x होना चाहिए
```

---

## 2. प्रोजेक्ट में जाएं

```bash
cd /path/to/Treding-ERP-Barcode-System-main/mobile
```

(अपना actual path use करें।)

---

## 3. Dependencies इंस्टॉल करें

```bash
npm install
```

---

## 4. APK बिल्ड करें

**Option A – स्क्रिप्ट से (आसान):**

```bash
chmod +x build-release-apk.sh
./build-release-apk.sh
```

स्क्रिप्ट API URL चेक करेगी; अभी config में AWS URL है तो सीधे build चलेगा।

**Option B – मैन्युअल:**

```bash
cd android
./gradlew clean
./gradlew assembleRelease
cd ..
```

Build में लगभग **3–7 मिनट** लग सकते हैं।

---

## 5. APK कहाँ मिलेगा

Build सफल होने के बाद:

```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

यही फाइल फाइनल APK है जो AWS server से बात करेगी।

---

## 6. फोन पर इंस्टॉल करें

**USB से:**
```bash
adb install mobile/android/app/build/outputs/apk/release/app-release.apk
```

**बिना USB:**
1. `app-release.apk` को WhatsApp / Email / Google Drive से अपने फोन पर भेजें।
2. फोन पर डाउनलोड करके खोलें।
3. जरूरत हो तो **Unknown sources** / **Install unknown apps** allow करें।
4. Install करें।

---

## 7. लॉगिन

ऐप खोलने के बाद:

- **Login code:** `admin` (या जो backend पर सेट है)
- फोन पर **internet (Wi‑Fi / mobile data)** चालू होना चाहिए ताकि AWS (13.201.67.96) तक पहुँच सके।

---

## 8. API URL बदलना (बाद में)

अगर AWS IP या domain बदलें:

1. **mobile/src/config.ts** खोलें।
2. `API_URL` को नए address पर सेट करें, जैसे:
   - `export const API_URL = 'http://NEW_IP/api';`
   - या `export const API_URL = 'https://yourdomain.com/api';`
3. फिर दोबारा APK build करें (Step 4)।

---

## ⚠️ अगर Build फेल हो

- **Java 17** install करें और `java -version` से चेक करें।
- पहले clean करके दोबारा चलाएं:
  ```bash
  cd mobile/android
  ./gradlew clean
  ./gradlew assembleRelease --stacktrace
  ```
- Error message पूरा copy करके भेजें तो exact fix बता सकता हूँ।

---

## Short summary

| Step | Command / Action |
|------|-------------------|
| 1 | `cd mobile` |
| 2 | `npm install` |
| 3 | `./build-release-apk.sh` या `cd android && ./gradlew assembleRelease` |
| 4 | APK: `android/app/build/outputs/apk/release/app-release.apk` |
| 5 | फोन पर install करें, internet on रखें, login करें |

इस APK को जिस भी फोन पर install करेंगे, वह **http://13.201.67.96** वाले AWS server से चलेगा।
