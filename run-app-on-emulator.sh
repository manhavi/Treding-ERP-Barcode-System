#!/bin/bash
#
# run-app-on-emulator.sh — Sirf Android emulator pe app chalao
# Emulator start karega (agar band ho), Metro start karega, phir app install + run
#

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     📱 Run App on Android Emulator                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# ANDROID_HOME
if [ -z "$ANDROID_HOME" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"
fi

if [ -z "$ANDROID_HOME" ]; then
  echo -e "${RED}❌ ANDROID_HOME not set. Install Android SDK / Android Studio.${NC}"
  exit 1
fi

# Emulator already running?
EMU_READY=0
if command -v adb >/dev/null 2>&1; then
  if adb devices 2>/dev/null | grep -qE 'emulator-[0-9]+\s+device'; then
    echo -e "${GREEN}✓ Emulator already running${NC}"
    EMU_READY=1
  elif adb devices 2>/dev/null | grep -qE '\tdevice'; then
    echo -e "${GREEN}✓ Android device/emulator connected${NC}"
    EMU_READY=1
  fi
fi

# Start emulator if not running
if [ "$EMU_READY" = 0 ] && [ -x "$ANDROID_HOME/emulator/emulator" ]; then
  AVDS=$("$ANDROID_HOME/emulator/emulator" -list-avds 2>/dev/null || true)
  if [ -z "$AVDS" ]; then
    echo -e "${YELLOW}⚠ No AVD found. Create one in Android Studio → Device Manager → Create Device${NC}"
    exit 1
  fi
  AVD_NAME=$(echo "$AVDS" | head -1)
  echo -e "${BLUE}📱 Starting emulator: $AVD_NAME${NC}"
  mkdir -p "$SCRIPT_DIR/logs"
  "$ANDROID_HOME/emulator/emulator" -avd "$AVD_NAME" -no-snapshot-load > "$SCRIPT_DIR/logs/emulator.log" 2>&1 &
  echo "   Waiting for emulator to boot (up to ~2 min)..."
  WAIT=0
  while [ $WAIT -lt 120 ]; do
    if adb devices 2>/dev/null | grep -qE 'emulator-[0-9]+\s+device'; then
      for _ in 1 2 3 4 5 6 7 8 9 10; do
        status=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
        [ "$status" = "1" ] && break
        sleep 2
      done
      EMU_READY=1
      echo -e "${GREEN}✓ Emulator ready${NC}"
      break
    fi
    sleep 5
    WAIT=$((WAIT + 5))
  done
  if [ "$EMU_READY" = 0 ]; then
    echo -e "${YELLOW}⚠ Emulator did not become ready in time. Start it from Android Studio, then run:${NC}"
    echo "   cd $SCRIPT_DIR/mobile && npm run android"
    exit 1
  fi
fi

if [ "$EMU_READY" = 0 ]; then
  echo -e "${RED}❌ No emulator or device found. Start emulator from Android Studio (Device Manager).${NC}"
  exit 1
fi

# Metro — port 8081 check, start if needed
if ! lsof -i :8081 >/dev/null 2>&1; then
  echo -e "${BLUE}📦 Starting Metro bundler...${NC}"
  cd "$SCRIPT_DIR/mobile"
  [ ! -d "node_modules" ] && npm install
  npx react-native start --reset-cache > "$SCRIPT_DIR/logs/metro.log" 2>&1 &
  echo $! > "$SCRIPT_DIR/logs/metro.pid"
  echo -e "${GREEN}✓ Metro started${NC}"
  sleep 8
else
  echo -e "${GREEN}✓ Metro already running (port 8081)${NC}"
fi

# Run app on emulator
echo -e "${BLUE}🚀 Building and running app on emulator...${NC}"
cd "$SCRIPT_DIR/mobile"
npm run android

echo ""
echo -e "${GREEN}✅ App should now be open on the emulator.${NC}"
echo ""
echo "Backend chahiye to: ./start-backend.sh  ya  cd backend && npm run dev"
echo ""
