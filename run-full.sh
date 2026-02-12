#!/bin/bash
#
# run-full.sh — Ek script: pehle sab band, phir sab start
# Backend, Frontend, Android Emulator, Metro, Android App
# Har bar run karne par purane process band hoke nayi latest state chalegi.
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
echo "║     🔄 Run Full — Stop All → Start All (Latest)              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# ─── STEP 1: SAB BAND KARO ─────────────────────────────────────────
echo -e "${YELLOW}━━━ STEP 1: Stopping everything ━━━${NC}"
echo ""

# PID files se kill
kill_pid() {
  local f="$1"
  local name="$2"
  if [ -f "$f" ]; then
    local pid=$(cat "$f" 2>/dev/null)
    if [ -n "$pid" ] && ps -p "$pid" >/dev/null 2>&1; then
      echo -e "${YELLOW}Stopping $name (PID $pid)...${NC}"
      kill -9 "$pid" 2>/dev/null || true
      echo -e "${GREEN}✓ $name stopped${NC}"
    fi
    rm -f "$f"
  fi
}

kill_pid "$SCRIPT_DIR/logs/backend.pid" "Backend"
kill_pid "$SCRIPT_DIR/logs/frontend.pid" "Frontend"
kill_pid "$SCRIPT_DIR/logs/metro.pid" "Metro"

# Ports kill
for port in 3001 3000 5173 8081; do
  if lsof -i :$port >/dev/null 2>&1; then
    echo -e "${YELLOW}Killing process on port $port...${NC}"
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✓ Port $port freed${NC}"
  fi
done

# Node/tsx/vite/metro processes (project related)
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*server.ts" 2>/dev/null || true
pkill -f "react-native start" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true

# Emulator band NA karein — dobara run par same emulator use hoga, install fail nahi hoga

sleep 2
echo -e "${GREEN}✓ Everything stopped${NC}"
echo ""

# ─── STEP 2: SAB START KARO ─────────────────────────────────────────
echo -e "${BLUE}━━━ STEP 2: Starting Backend, Frontend, Emulator, App ━━━${NC}"
echo ""

mkdir -p "$SCRIPT_DIR/logs"

# Backend setup & start
echo -e "${BLUE}📡 Backend...${NC}"
cd "$SCRIPT_DIR/backend"
[ ! -d "node_modules" ] && npm install
[ ! -f ".env" ] && {
  echo "PORT=3001
NODE_ENV=development
JWT_SECRET=aaradhya-fashion-secret-2026
DATABASE_PATH=./database/aaradhya.db" > .env
}
[ ! -d "database" ] && mkdir -p database
[ ! -f "database/aaradhya.db" ] && npm run migrate 2>/dev/null || true

npm run dev > "$SCRIPT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$SCRIPT_DIR/logs/backend.pid"
echo -e "${GREEN}✓ Backend started (PID $BACKEND_PID) — http://localhost:3001${NC}"
sleep 3

# Frontend setup & start
echo -e "${BLUE}🎨 Frontend...${NC}"
cd "$SCRIPT_DIR/frontend"
[ ! -d "node_modules" ] && npm install
[ ! -f ".env" ] && echo "VITE_API_URL=http://localhost:3001/api" > .env

npm run dev > "$SCRIPT_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$SCRIPT_DIR/logs/frontend.pid"
echo -e "${GREEN}✓ Frontend started (PID $FRONTEND_PID) — http://localhost:3000${NC}"
sleep 3

# Android Emulator start (background) — sirf jab koi device/emulator already na ho
echo -e "${BLUE}📱 Android Emulator...${NC}"
if [ -z "$ANDROID_HOME" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"
fi

EMU_STARTED=0
if [ -n "$ANDROID_HOME" ] && [ -x "$ANDROID_HOME/emulator/emulator" ]; then
  # Sirf tab skip karo jab koi emulator ready state mein ho (device), nahi to start karo
  if command -v adb >/dev/null 2>&1 && adb devices 2>/dev/null | grep -qE 'emulator-[0-9]+\s+device'; then
    echo -e "${GREEN}✓ Emulator already running & ready${NC}"
    EMU_STARTED=1
  else
    AVDS=$("$ANDROID_HOME/emulator/emulator" -list-avds 2>/dev/null || true)
    if [ -n "$AVDS" ]; then
      AVD_NAME=$(echo "$AVDS" | head -1)
      echo "   Starting AVD: $AVD_NAME"
      "$ANDROID_HOME/emulator/emulator" -avd "$AVD_NAME" -no-snapshot-load > "$SCRIPT_DIR/logs/emulator.log" 2>&1 &
      EMU_PID=$!
      EMU_STARTED=1
      echo -e "${GREEN}✓ Emulator starting in background (PID $EMU_PID)${NC}"
    else
      echo -e "${YELLOW}⚠ No AVD found. Create one in Android Studio → Device Manager${NC}"
    fi
  fi
else
  echo -e "${YELLOW}⚠ ANDROID_HOME not set or emulator not found. Skip emulator.${NC}"
fi

# Emulator boot ka wait — device "device" state + boot_completed tak wait; sirf tab hi app install chalayenge
EMU_READY=0
if [ "$EMU_STARTED" = 1 ] && command -v adb >/dev/null 2>&1; then
  if adb devices 2>/dev/null | grep -qE 'emulator-[0-9]+\s+device'; then
    echo "   Device ready, checking boot..."
    for _ in 1 2 3 4 5; do
      status=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
      [ "$status" = "1" ] && break
      sleep 2
    done
    EMU_READY=1
    echo -e "${GREEN}✓ Proceeding to Metro & App${NC}"
  else
    # Humein emulator start kiya — device "device" state tak wait (max ~3 min), phir boot_completed
    echo "   Waiting for emulator to be ready (max ~3 min)..."
    WAIT_DEVICE=0
    while [ $WAIT_DEVICE -lt 180 ]; do
      if adb devices 2>/dev/null | grep -qE 'emulator-[0-9]+\s+device'; then
        break
      fi
      sleep 2
      WAIT_DEVICE=$((WAIT_DEVICE + 2))
    done
    if adb devices 2>/dev/null | grep -qE 'emulator-[0-9]+\s+device'; then
      EMU_READY=1
      echo "   Device connected, waiting for boot..."
      for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
        status=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
        if [ "$status" = "1" ]; then
          echo -e "${GREEN}✓ Emulator booted${NC}"
          break
        fi
        sleep 2
      done
      echo -e "${GREEN}✓ Proceeding to Metro & App${NC}"
    else
      echo -e "${YELLOW}⚠ Emulator did not become ready in time. App install will be skipped to avoid double-launch error.${NC}"
      echo -e "${YELLOW}   Start emulator manually (Android Studio → Device Manager), then run: ${NC}cd $SCRIPT_DIR/mobile && npm run android"
    fi
  fi
fi
# Physical device connected ho to bhi app chalane do
if [ "$EMU_READY" = 0 ] && command -v adb >/dev/null 2>&1 && adb devices 2>/dev/null | grep -qE '\tdevice'; then
  EMU_READY=1
  echo -e "${GREEN}✓ Android device/emulator detected, proceeding to Metro & App${NC}"
fi

# Metro + Android App (mobile folder)
echo -e "${BLUE}📦 Metro + Android App...${NC}"
cd "$SCRIPT_DIR/mobile"
[ ! -d "node_modules" ] && npm install

# Metro background mein start karo
npx react-native start --reset-cache > "$SCRIPT_DIR/logs/metro.log" 2>&1 &
METRO_PID=$!
echo $METRO_PID > "$SCRIPT_DIR/logs/metro.pid"
echo -e "${GREEN}✓ Metro started (PID $METRO_PID)${NC}"
sleep 8

# App run — sirf jab emulator ready ho (taaki react-native dubara launch na kare)
if [ "$EMU_READY" = "1" ]; then
  echo -e "${BLUE}🚀 Building and running Android app (latest code)...${NC}"
  npm run android
  echo ""
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║            ✅ Run complete — App should be on emulator       ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
else
  echo ""
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║  ⚠ Backend, Frontend & Metro running — Emulator not ready   ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo ""
  echo -e "Emulator start karo (Android Studio → Device Manager), phir:"
  echo -e "  ${YELLOW}cd mobile && npm run android${NC}"
  echo ""
fi
echo ""
echo -e "${GREEN}🌐 Web:    ${YELLOW}http://localhost:3000${NC}"
echo -e "${GREEN}📡 API:    ${YELLOW}http://localhost:3001/api${NC}"
echo -e "${GREEN}🔐 Login:  ${YELLOW}admin / admin123${NC}"
echo ""
echo -e "Sab band karke dubara start: ${YELLOW}./run-full.sh${NC}"
echo "Sirf band: ${YELLOW}./stop-all.sh${NC}"
echo ""
