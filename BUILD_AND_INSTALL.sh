#!/bin/bash

echo "🚀 Building and Installing Aaradhya Fashion App..."
echo ""

# Navigate to mobile directory
cd "$(dirname "$0")/mobile/android"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build release APK
echo "🔨 Building release APK..."
./gradlew assembleRelease

# Check if build was successful
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo "✅ Build successful!"
    echo ""
    
    # Copy APK to main directory
    cp app/build/outputs/apk/release/app-release.apk ../../aaradhya-fashion-FINAL.apk
    echo "📦 APK copied to: aaradhya-fashion-FINAL.apk"
    echo ""
    
    # Install on connected device
    echo "📱 Installing on connected device..."
    adb devices
    adb install -r ../../aaradhya-fashion-FINAL.apk
    
    if [ $? -eq 0 ]; then
        echo "✅ Installation successful!"
        echo ""
        echo "🚀 Launching app..."
        adb shell am start -n com.aaradhyafashion/.MainActivity
        echo ""
        echo "✅ App launched! Please test on your phone."
    else
        echo "❌ Installation failed. Please check USB connection and try:"
        echo "   adb install -r aaradhya-fashion-FINAL.apk"
    fi
else
    echo "❌ Build failed. Please check errors above."
    exit 1
fi
