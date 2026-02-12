#!/bin/bash

echo "🧹 Cleaning old build files..."
cd "$(dirname "$0")"
./gradlew clean

echo "📦 Building new APK..."
./gradlew assembleDebug

echo "📱 Uninstalling old app..."
adb uninstall com.aaradhyafashion

echo "📲 Installing new APK..."
adb install app/build/outputs/apk/debug/app-debug.apk

echo "✅ Done! New version installed successfully!"
echo "📱 Version: 1.0.1 (Build 2)"
