#!/bin/bash
#
# Emulator se purani app uninstall karo, phir fresh install + run
#

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

APP_PACKAGE="com.aaradhyafashion"

echo "📱 Uninstalling old app from emulator/device..."
adb uninstall "$APP_PACKAGE" 2>/dev/null && echo "✅ Old app uninstalled" || echo "⚠ App was not installed (ok for first install)"

echo ""
echo "🚀 Installing and running app..."
npm run android

echo ""
echo "✅ Fresh app installed and running on emulator."
