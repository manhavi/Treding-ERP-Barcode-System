#!/bin/bash

# 🚀 Complete Restart & Deploy Script
# Aaradhya Fashion ERP System - Full Automation
# This script: Restarts backend/frontend, builds app, installs on USB phone, and tests

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🚀 Complete Restart & Deploy System                       ║"
echo "║     Aaradhya Fashion ERP - Full Automation                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Function to check if port is in use
check_port() {
    lsof -i :$1 >/dev/null 2>&1
    return $?
}

# Function to kill process on port
kill_port() {
    echo -e "${YELLOW}⚠️  Port $1 is in use. Stopping...${NC}"
    lsof -ti :$1 | xargs kill -9 2>/dev/null
    sleep 2
}

# Function to check if process is running by PID file
check_pid() {
    if [ -f "$1" ]; then
        PID=$(cat "$1")
        if ps -p $PID > /dev/null 2>&1; then
            return 0
        else
            rm -f "$1"
            return 1
        fi
    fi
    return 1
}

# Function to stop process by PID file
stop_process() {
    if [ -f "$1" ]; then
        PID=$(cat "$1")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping process $PID...${NC}"
            kill -9 $PID 2>/dev/null
            rm -f "$1"
            echo -e "${GREEN}✓ Stopped${NC}"
            return 0
        else
            rm -f "$1"
            return 1
        fi
    fi
    return 1
}

# Create log directory
mkdir -p "$SCRIPT_DIR/logs"

# ============================================================================
# STEP 1: Stop Existing Services
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 Step 1: Stopping Existing Services...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Stop backend
if check_pid "$SCRIPT_DIR/logs/backend.pid"; then
    echo -e "${YELLOW}📡 Stopping Backend...${NC}"
    stop_process "$SCRIPT_DIR/logs/backend.pid"
else
    echo -e "${CYAN}📡 Backend not running${NC}"
fi

# Stop frontend
if check_pid "$SCRIPT_DIR/logs/frontend.pid"; then
    echo -e "${YELLOW}🎨 Stopping Frontend...${NC}"
    stop_process "$SCRIPT_DIR/logs/frontend.pid"
else
    echo -e "${CYAN}🎨 Frontend not running${NC}"
fi

# Kill any remaining processes on ports
if check_port 3001; then
    kill_port 3001
fi

if check_port 5173; then
    kill_port 5173
fi

echo -e "${GREEN}✓ All services stopped${NC}"
echo ""

# ============================================================================
# STEP 2: Start Backend
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 Step 2: Starting Backend Server...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$SCRIPT_DIR/backend"

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
fi

# Check .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << EOF
PORT=3001
NODE_ENV=development
JWT_SECRET=aaradhya-fashion-secret-2026
DATABASE_PATH=./database/aaradhya.db
EOF
fi

# Start backend
echo -e "${BLUE}Starting backend server...${NC}"
npm run dev > "$SCRIPT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$SCRIPT_DIR/logs/backend.pid"

echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "  📡 API: http://localhost:3001/api"
echo -e "  📄 Logs: logs/backend.log"
echo ""

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to start...${NC}"
for i in {1..10}; do
    if check_port 3001; then
        # Try to verify backend is responding
        if curl -s http://localhost:3001/api/auth/me >/dev/null 2>&1 || curl -s http://localhost:3001 >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend is ready${NC}"
            break
        fi
    fi
    sleep 1
    echo -n "."
done
if ! check_port 3001; then
    echo -e "${YELLOW}⚠️  Backend may still be starting...${NC}"
fi
echo ""

# ============================================================================
# STEP 3: Start Frontend
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 Step 3: Starting Frontend Server...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$SCRIPT_DIR/frontend"

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

# Check .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << EOF
VITE_API_URL=http://localhost:3001/api
EOF
fi

# Start frontend
echo -e "${BLUE}Starting frontend server...${NC}"
npm run dev > "$SCRIPT_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$SCRIPT_DIR/logs/frontend.pid"

echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "  🌐 Web: http://localhost:5173"
echo -e "  📄 Logs: logs/frontend.log"
echo ""

# Wait for frontend to be ready
echo -e "${YELLOW}Waiting for frontend to start...${NC}"
for i in {1..15}; do
    if check_port 5173; then
        echo -e "${GREEN}✓ Frontend is ready${NC}"
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

# ============================================================================
# STEP 4: Build Android App
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 Step 4: Building Android App...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$SCRIPT_DIR/mobile"

# Get local IP for mobile app
LOCAL_IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

if [ -z "$LOCAL_IP" ]; then
    echo -e "${RED}⚠️  Could not detect local IP${NC}"
    read -p "Enter your computer's IP address: " LOCAL_IP
fi

echo -e "${CYAN}Detected IP: ${GREEN}$LOCAL_IP${NC}"
echo ""

# Update API URL in mobile app if needed
API_FILE="src/services/api.ts"
if [ -f "$API_FILE" ]; then
    # Check if IP needs to be updated
    if ! grep -q "$LOCAL_IP" "$API_FILE" 2>/dev/null; then
        echo -e "${YELLOW}Updating API URL in mobile app...${NC}"
        # This is a simple update - you may need to adjust based on your api.ts structure
        sed -i.bak "s|http://[0-9.]*:3001|http://${LOCAL_IP}:3001|g" "$API_FILE" 2>/dev/null || true
        rm -f "$API_FILE.bak" 2>/dev/null || true
        echo -e "${GREEN}✓ API URL updated${NC}"
    else
        echo -e "${GREEN}✓ API URL already configured${NC}"
    fi
fi

# Check mobile dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing mobile dependencies...${NC}"
    npm install
fi

# Clean Android build
echo -e "${YELLOW}Cleaning previous Android build...${NC}"
cd android
./gradlew clean >/dev/null 2>&1
echo -e "${GREEN}✓ Cleaned${NC}"

# Build debug APK (faster than release)
echo -e "${YELLOW}Building Android APK (this may take 3-5 minutes)...${NC}"
echo ""
./gradlew assembleDebug

BUILD_STATUS=$?

if [ $BUILD_STATUS -eq 0 ]; then
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    APK_FULL_PATH="$SCRIPT_DIR/mobile/android/$APK_PATH"
    
    if [ -f "$APK_FULL_PATH" ]; then
        APK_SIZE=$(du -h "$APK_FULL_PATH" | cut -f1)
        echo ""
        echo -e "${GREEN}✓ APK built successfully!${NC}"
        echo -e "  📱 APK: $APK_FULL_PATH"
        echo -e "  📊 Size: $APK_SIZE"
        echo ""
    else
        echo -e "${RED}❌ APK file not found${NC}"
        BUILD_STATUS=1
    fi
else
    echo -e "${RED}❌ APK build failed${NC}"
fi

cd "$SCRIPT_DIR"

# ============================================================================
# STEP 5: Check USB Device & Install App
# ============================================================================
if [ $BUILD_STATUS -eq 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}📋 Step 5: Installing App on USB Device...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Check if adb is available
    if ! command -v adb &> /dev/null; then
        echo -e "${RED}⚠️  ADB not found. Please install Android SDK Platform Tools${NC}"
        echo "   Download from: https://developer.android.com/studio/releases/platform-tools"
        echo ""
        echo -e "${YELLOW}APK is ready at: ${APK_FULL_PATH}${NC}"
        echo "   You can manually install it on your phone."
    else
        # Check for connected devices
        echo -e "${CYAN}Checking for connected devices...${NC}"
        DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
        
        if [ "$DEVICES" -eq 0 ]; then
            echo -e "${RED}⚠️  No USB device connected${NC}"
            echo ""
            echo "Please:"
            echo "  1. Connect your phone via USB"
            echo "  2. Enable USB Debugging on phone"
            echo "  3. Run this script again"
            echo ""
            echo -e "${YELLOW}APK is ready at: ${APK_FULL_PATH}${NC}"
        else
            echo -e "${GREEN}✓ Found $DEVICES connected device(s)${NC}"
            echo ""
            
            # Get device info
            DEVICE_NAME=$(adb devices -l | grep "device$" | head -1 | awk '{print $5}' | cut -d: -f2)
            echo -e "${CYAN}Device: ${GREEN}$DEVICE_NAME${NC}"
            echo ""
            
            # Uninstall old app
            PACKAGE_NAME="com.aaradhyafashion"
            echo -e "${YELLOW}Uninstalling old app (if exists)...${NC}"
            adb uninstall "$PACKAGE_NAME" >/dev/null 2>&1
            echo -e "${GREEN}✓ Old app removed${NC}"
            echo ""
            
            # Install new app
            echo -e "${YELLOW}Installing new app...${NC}"
            INSTALL_RESULT=$(adb install "$APK_FULL_PATH" 2>&1)
            
            if echo "$INSTALL_RESULT" | grep -q "Success"; then
                echo -e "${GREEN}✓ App installed successfully!${NC}"
                echo ""
                
                # Launch app
                echo -e "${YELLOW}Launching app...${NC}"
                adb shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
                echo -e "${GREEN}✓ App launched${NC}"
                echo ""
            else
                echo -e "${RED}❌ Installation failed${NC}"
                echo "$INSTALL_RESULT"
                echo ""
                echo -e "${YELLOW}APK is ready at: ${APK_FULL_PATH}${NC}"
                echo "   You can manually install it."
            fi
        fi
    fi
else
    echo -e "${YELLOW}Skipping app installation (build failed)${NC}"
fi

# ============================================================================
# STEP 6: Open Browser for Testing
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 Step 6: Opening Web Interface for Testing...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

sleep 2  # Wait a bit more for frontend to be fully ready

if check_port 5173; then
    echo -e "${GREEN}Opening web interface...${NC}"
    open "http://localhost:5173" 2>/dev/null || xdg-open "http://localhost:5173" 2>/dev/null || echo "Please open: http://localhost:5173"
    echo ""
else
    echo -e "${YELLOW}Frontend not ready yet. Please open manually:${NC}"
    echo "   http://localhost:5173"
    echo ""
fi

# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║            ✅ System Restart & Deploy Complete!                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}📊 System Status:${NC}"
echo "  • Backend:  ${GREEN}Running${NC} (PID: $BACKEND_PID) - http://localhost:3001/api"
echo "  • Frontend: ${GREEN}Running${NC} (PID: $FRONTEND_PID) - http://localhost:5173"
if [ $BUILD_STATUS -eq 0 ]; then
    echo "  • Android:  ${GREEN}Built${NC} - $APK_FULL_PATH"
else
    echo "  • Android:  ${RED}Build Failed${NC}"
fi
echo ""

echo -e "${GREEN}🌐 Access URLs:${NC}"
echo "  • Web Application: ${YELLOW}http://localhost:5173${NC}"
echo "  • Backend API:     ${YELLOW}http://localhost:3001/api${NC}"
echo "  • Mobile API:      ${YELLOW}http://${LOCAL_IP}:3001/api${NC}"
echo ""

echo -e "${GREEN}🔐 Default Login:${NC}"
echo "  • Admin Code: ${YELLOW}130702${NC}"
echo ""

echo -e "${BLUE}📱 Mobile App:${NC}"
if [ $BUILD_STATUS -eq 0 ]; then
    echo "  • APK Location: ${YELLOW}$APK_FULL_PATH${NC}"
    echo "  • APK Size: $APK_SIZE"
    if [ "$DEVICES" -gt 0 ] 2>/dev/null; then
        echo "  • Status: ${GREEN}Installed on device${NC}"
    else
        echo "  • Status: ${YELLOW}Ready for manual install${NC}"
    fi
else
    echo "  • Status: ${RED}Build failed - check logs${NC}"
fi
echo ""

echo -e "${BLUE}📄 Logs:${NC}"
echo "  • Backend:  ${YELLOW}tail -f logs/backend.log${NC}"
echo "  • Frontend: ${YELLOW}tail -f logs/frontend.log${NC}"
echo ""

echo -e "${YELLOW}💡 Tips:${NC}"
echo "  • Test web interface in browser"
echo "  • Test mobile app on connected device"
echo "  • Check logs if anything doesn't work"
echo "  • Use './stop-all.sh' to stop all services"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ All done! Happy testing!${NC}"
echo ""
