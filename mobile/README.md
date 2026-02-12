# Aaradhya Fashion Mobile App

---

## 🚀 QUICK START - Android Build (FIXED!)

**Android build issue has been RESOLVED!** All required files are now in place.

### ⚡ Option 1: Automated Installation (Recommended!)

```bash
cd mobile
./setup-android-dev.sh
```

This script automatically installs:
- ✅ Java 17 (OpenJDK)
- ✅ Android Studio
- ✅ All environment variables
- ✅ Node dependencies

**Time:** ~15-20 minutes

### 📖 Option 2: Manual Installation

See: **[EASY_INSTALLATION_GUIDE.md](./EASY_INSTALLATION_GUIDE.md)** for step-by-step instructions.

---

## 📚 Android Build Documentation

- **[EASY_INSTALLATION_GUIDE.md](./EASY_INSTALLATION_GUIDE.md)** - 🎯 Start here! Complete setup guide
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick commands & fixes
- **[ANDROID_BUILD_GUIDE.md](./ANDROID_BUILD_GUIDE.md)** - Detailed technical guide
- **[ANDROID_FIX_SUMMARY.md](./ANDROID_FIX_SUMMARY.md)** - What was fixed and why
- **[../ANDROID_BUILD_FIXED.md](../ANDROID_BUILD_FIXED.md)** - Main summary
- **[../INSTALLATION_CHECKLIST.md](../INSTALLATION_CHECKLIST.md)** - Interactive checklist

---

## 📱 Original Documentation (iOS & Android)

React Native mobile application for iOS and Android.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- For iOS: Xcode (Mac only) and CocoaPods
- For Android: Android Studio with Android SDK

## Setup Instructions

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 1.5. Install CocoaPods (iOS only, if not already installed)

If you get a "command not found: pod" error, install CocoaPods first.

**Option 1: Using Homebrew (Recommended)**
```bash
# First install Homebrew if you don't have it:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install CocoaPods:
brew install cocoapods
```

**Option 2: Using Ruby gem (requires Ruby >= 3.0)**
```bash
sudo gem install cocoapods
```

**Note:** If you get a Ruby version error (e.g., "requires Ruby version >= 3.0"), see the Troubleshooting section below.

Verify installation:
```bash
pod --version
```

### 2. Install iOS Dependencies (iOS only)

**Note:** Make sure you have internet connectivity as `pod install` needs to download dependencies.

```bash
cd ios
export LANG=en_US.UTF-8  # Fix UTF-8 encoding if needed
pod install
cd ..
```

If you see "Could not automatically select an Xcode project", the Podfile has been configured to use `AaradhyaFashion/AaradhyaFashion.xcodeproj`. If issues persist, see Troubleshooting section below.

### 3. Configure API URL

**IMPORTANT:** Before running the app, update the API URL in `src/services/api.ts`:

```typescript
const getBaseURL = () => {
  // Replace YOUR_COMPUTER_IP with your computer's IP address
  // Find your IP: 
  // - Mac: System Settings > Network > Wi-Fi > Details
  // - Or run: ifconfig | grep "inet " | grep -v 127.0.0.1
  return 'http://YOUR_COMPUTER_IP:3001/api';
};
```

Example: `return 'http://192.168.1.9:3001/api';`

### 4. Run the App

#### For iOS:
```bash
npm run ios
```

#### For Android:
```bash
npm run android
```

## Building for Production

### iOS

1. Open `ios/AaradhyaFashion.xcworkspace` in Xcode
2. Select your device or simulator
3. Product > Archive
4. Follow the App Store submission process

### Android

1. Generate a keystore (if not already done):
```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Update `android/app/build.gradle` with your keystore configuration

3. Build release APK:
```bash
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## Features

- ✅ Purchase Management
- ✅ Inventory Management
- ✅ Dispatch Management
- ✅ Billing Management
- ✅ Party Management
- ✅ Staff Management
- ✅ Barcode Scanning
- ✅ PDF Generation

## Troubleshooting

### Network Connection Issues

- Make sure your mobile device and computer are on the same Wi-Fi network
- Check that the backend server is running on port 3001
- Verify the IP address in `src/services/api.ts` is correct

### Camera Permission Issues

- iOS: Check Settings > Privacy > Camera
- Android: Check App Settings > Permissions > Camera

### Build Issues

- Clear cache: `npm start -- --reset-cache`
- Clean build folders:
  - iOS: `cd ios && rm -rf build && pod install`
  - Android: `cd android && ./gradlew clean`

### CocoaPods Installation Issues

#### "command not found: pod"
Install CocoaPods using one of the methods in step 1.5 above.

#### "command not found: brew"
Install Homebrew first:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After installation, add Homebrew to your PATH:
```bash
echo >> ~/.zprofile
echo 'eval "$(/opt/homebrew/bin/brew shellenv zsh)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv zsh)"
```

If you get permission errors when installing CocoaPods, fix Homebrew directory ownership:
```bash
sudo chown -R $(whoami) /Users/$(whoami)/Library/Caches/Homebrew /opt/homebrew
```

Then install CocoaPods:
```bash
brew install cocoapods
```

#### Ruby Version Error (e.g., "requires Ruby version >= 3.0")

If you see an error like "ffi requires Ruby version >= 3.0. The current ruby version is 2.6.x", you have a few options:

**Option A: Install Homebrew and use it (Easiest)**
```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install CocoaPods via Homebrew (bypasses Ruby version issues)
brew install cocoapods
```

**Option B: Update Ruby using rbenv**
```bash
# Install rbenv
brew install rbenv ruby-build

# Install Ruby 3.0+
rbenv install 3.2.0
rbenv global 3.2.0

# Install CocoaPods
gem install cocoapods
```

**Option C: Use an older compatible version (Not recommended)**
```bash
# Install compatible ffi version first
sudo gem install ffi -v 1.17.3
# Then try installing CocoaPods again
sudo gem install cocoapods
```

#### "Could not automatically select an Xcode project" or "No Podfile found"

This means the iOS project structure is incomplete. You need to initialize the React Native iOS project:

**Option 1: Using React Native CLI (Recommended)**
```bash
cd mobile
# This will create the iOS project structure
npx @react-native-community/cli init AaradhyaFashion --skip-install --directory temp
# Copy the ios folder from temp to your project
cp -r temp/ios/* ios/
rm -rf temp
```

**Option 2: Using Xcode (If you have Xcode installed)**
1. Open Xcode
2. Create a new project: File > New > Project
3. Select "App" under iOS
4. Product Name: `AaradhyaFashion`
5. Save it in the `mobile/ios` directory
6. Then run `pod install`

**Option 3: Manual Setup (Advanced)**
If the above don't work, you may need to copy the iOS project structure from a working React Native 0.72.6 project or use the React Native template.

After creating the Xcode project, make sure:
- The project name matches `AaradhyaFashion` (as specified in `app.json`)
- The Podfile target name matches the Xcode project name
- Then run `pod install` again

#### UTF-8 Encoding Warning

If you see a UTF-8 encoding warning, add this to your `~/.zprofile`:
```bash
echo 'export LANG=en_US.UTF-8' >> ~/.zprofile
source ~/.zprofile
```

#### Boost Checksum Error (Network Issue)

If you see "Verification checksum was incorrect" for boost library with error:
```
expected f0397ba6e982c4450f27bf32a2a83292aba035b827a5623a14636ea583318c41, 
got 1c162b579a423fa6876c6c5bc16d39ab4bc05e28898977a0a6af345f523f6357
```

This is caused by **network connectivity issues** - the boost download server (`boostorg.jfrog.io`) cannot be reached, resulting in a corrupted or incomplete download.

**Solutions:**

1. **Check Network Connectivity:**
   ```bash
   # Test if you can reach the boost server
   curl -I https://boostorg.jfrog.io/artifactory/main/release/1.76.0/source/boost_1_76_0.tar.bz2
   ```

2. **If behind a firewall/proxy:**
   - Configure proxy settings for CocoaPods
   - Use a VPN if corporate firewall is blocking
   - Try from a different network

3. **Clear cache and retry when network is stable:**
   ```bash
   # Clear all CocoaPods caches
   rm -rf ~/Library/Caches/CocoaPods
   rm -rf ~/Library/Caches/CocoaPods/Pods
   
   # Clean project
   cd ios
   rm -rf Pods Podfile.lock
   
   # Retry with UTF-8 encoding
   export LANG=en_US.UTF-8
   pod install
   ```

4. **Wait and retry:** Sometimes CDN servers have temporary issues. Wait a few minutes and try again.

**Note:** Boost is a critical dependency for React Native. The installation cannot complete without it. Ensure you have stable internet connectivity before running `pod install`.

#### CocoaPods Cache Permission Error

If you see "Operation not permitted @ rb_sysopen" for CocoaPods cache:

```bash
# Fix permissions on CocoaPods cache directory
sudo chown -R $(whoami) ~/Library/Caches/CocoaPods
chmod -R u+w ~/Library/Caches/CocoaPods
```

#### Network Connectivity Issues

If you see "Could not resolve host" errors for GitHub or CocoaPods CDN:
- Check your internet connection
- Verify DNS settings
- Try using a VPN if behind a firewall
- Wait and retry - sometimes CDN servers have temporary issues

## Notes

- The app requires the backend server to be running
- Camera permission is required for barcode scanning
- PDF generation requires file system permissions
