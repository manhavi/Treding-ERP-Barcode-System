#!/bin/bash

# 📱 Release APK Builder (Production Ready)
# Aaradhya Fashion Mobile App

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🚀 Building Release APK (Production)                      ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Step 1: Check API Configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 Step 1: Checking API Configuration...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get current API URL from config
CURRENT_API=$(grep "return 'http" src/services/api.ts | sed "s/.*'\(.*\)'.*/\1/")
echo -e "Current API URL: ${YELLOW}${CURRENT_API}${NC}"

if [[ "$CURRENT_API" == *"YOUR_COMPUTER_IP"* ]]; then
    echo -e "${RED}⚠️  WARNING: API URL not configured!${NC}"
    echo ""
    echo "Release APK के लिए proper API URL जरूरी है."
    echo ""
    
    # Try to get IP
    LOCAL_IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
    
    if [ ! -z "$LOCAL_IP" ]; then
        echo -e "Detected IP: ${GREEN}${LOCAL_IP}${NC}"
        echo ""
        echo "Options:"
        echo "1. Use local IP (for testing): http://${LOCAL_IP}:3001/api"
        echo "2. Enter production URL: https://your-domain.com/api"
        echo ""
        read -p "Enter choice (1 or 2): " CHOICE
        
        if [ "$CHOICE" == "1" ]; then
            sed -i.bak "s|http://YOUR_COMPUTER_IP:3001/api|http://${LOCAL_IP}:3001/api|g" src/services/api.ts
            rm -f src/services/api.ts.bak
            echo -e "${GREEN}✓ API URL updated to: http://${LOCAL_IP}:3001/api${NC}"
        elif [ "$CHOICE" == "2" ]; then
            read -p "Enter production API URL: " PROD_URL
            sed -i.bak "s|http://YOUR_COMPUTER_IP:3001/api|${PROD_URL}|g" src/services/api.ts
            rm -f src/services/api.ts.bak
            echo -e "${GREEN}✓ API URL updated to: ${PROD_URL}${NC}"
        fi
    else
        echo "Enter your API URL:"
        echo "  • For local testing: http://YOUR_IP:3001/api"
        echo "  • For production: https://your-domain.com/api"
        echo ""
        read -p "API URL: " API_URL
        sed -i.bak "s|http://YOUR_COMPUTER_IP:3001/api|${API_URL}|g" src/services/api.ts
        rm -f src/services/api.ts.bak
        echo -e "${GREEN}✓ API URL updated to: ${API_URL}${NC}"
    fi
else
    echo -e "${GREEN}✓ API URL is configured: ${CURRENT_API}${NC}"
fi

echo ""

# Step 2: Check Dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📦 Step 2: Checking Dependencies...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

echo ""

# Step 3: Patch Libraries
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🔧 Step 3: Patching Libraries...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

./patch-libraries.sh

echo ""

# Step 4: Clean Build
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🧹 Step 4: Cleaning Previous Build...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd android

# Clean gradle
./gradlew clean

echo -e "${GREEN}✓ Clean successful${NC}"
echo ""

# Step 5: Build Release APK
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🏗️  Step 5: Building Release APK...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}⚡ This is optimized build, may take 3-7 minutes...${NC}"
echo ""

./gradlew assembleRelease

BUILD_STATUS=$?

echo ""

if [ $BUILD_STATUS -eq 0 ]; then
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║            ✅ Release APK Built Successfully!                  ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    APK_FULL_PATH="$SCRIPT_DIR/android/$APK_PATH"
    
    if [ -f "$APK_FULL_PATH" ]; then
        APK_SIZE=$(du -h "$APK_FULL_PATH" | cut -f1)
        echo -e "${GREEN}🎉 Release APK Ready!${NC}"
        echo ""
        echo -e "${GREEN}📱 APK Location:${NC}"
        echo -e "   ${YELLOW}$APK_FULL_PATH${NC}"
        echo ""
        echo -e "${GREEN}📊 APK Size:${NC} $APK_SIZE"
        echo ""
        echo -e "${GREEN}✨ Features:${NC}"
        echo "   • Production optimized"
        echo "   • Smaller size (minified)"
        echo "   • Better performance"
        echo "   • Ready for distribution"
        echo ""
        echo -e "${BLUE}📲 Installation Options:${NC}"
        echo ""
        echo "Option 1: USB Cable"
        echo "   ${YELLOW}adb install \"$APK_FULL_PATH\"${NC}"
        echo ""
        echo "Option 2: Share File"
        echo "   • Send APK via WhatsApp/Email/Google Drive"
        echo "   • Download on phone"
        echo "   • Enable 'Install from Unknown Sources'"
        echo "   • Install APK"
        echo ""
        echo "Option 3: Open Folder"
        echo "   ${YELLOW}open \"$SCRIPT_DIR/android/app/build/outputs/apk/release\"${NC}"
        echo ""
        
        read -p "Open APK folder now? (y/n): " OPEN_FOLDER
        if [ "$OPEN_FOLDER" == "y" ]; then
            open "$SCRIPT_DIR/android/app/build/outputs/apk/release"
        fi
        
        echo ""
        echo -e "${GREEN}✅ Release APK is ready to distribute!${NC}"
        echo ""
    fi
else
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║            ❌ Build Failed!                                    ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${RED}Build failed with error code: $BUILD_STATUS${NC}"
    echo ""
    echo -e "${YELLOW}Common Solutions:${NC}"
    echo ""
    echo "1. Check Java installation:"
    echo "   ${YELLOW}java -version${NC}"
    echo ""
    echo "2. Clean and retry:"
    echo "   ${YELLOW}./gradlew clean${NC}"
    echo "   ${YELLOW}./gradlew assembleRelease${NC}"
    echo ""
    echo "3. View full error log:"
    echo "   ${YELLOW}./gradlew assembleRelease --stacktrace${NC}"
    echo ""
fi

cd "$SCRIPT_DIR"
