#!/bin/bash

# 🎨 Simple Rebuild Script for UI Changes
# This rebuilds the app without clearing Gradle cache

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🎨 Rebuilding App with UI Changes                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd "$(dirname "$0")/android"

# Step 1: Clean build
echo -e "${BLUE}📋 Step 1: Cleaning Build...${NC}"
./gradlew clean
echo -e "${GREEN}✓ Clean done${NC}"
echo ""

# Step 2: Build APK
echo -e "${BLUE}📋 Step 2: Building APK...${NC}"
echo -e "${YELLOW}This will take 3-5 minutes...${NC}"
echo ""

./gradlew assembleDebug

if [ $? -eq 0 ]; then
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK_PATH" ]; then
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        echo ""
        echo -e "${GREEN}✅ APK Built Successfully!${NC}"
        echo -e "  📱 Location: $(pwd)/$APK_PATH"
        echo -e "  📊 Size: $APK_SIZE"
        echo ""
        
        # Step 3: Install on device
        if command -v adb &> /dev/null; then
            DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
            if [ "$DEVICES" -gt 0 ]; then
                echo -e "${BLUE}📋 Step 3: Installing on Device...${NC}"
                PACKAGE_NAME="com.aaradhyafashion"
                
                # Uninstall old app
                echo -e "${YELLOW}Uninstalling old app...${NC}"
                adb uninstall "$PACKAGE_NAME" >/dev/null 2>&1
                
                # Install new app
                echo -e "${YELLOW}Installing new app...${NC}"
                adb install -r "$APK_PATH"
                
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✅ App Installed!${NC}"
                    echo ""
                    echo -e "${YELLOW}Launching app...${NC}"
                    adb shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1
                    echo -e "${GREEN}✅ App Launched!${NC}"
                    echo ""
                    echo -e "${GREEN}✨ All done! Check your phone for UI changes.${NC}"
                    echo ""
                    echo -e "${BLUE}💡 UI Changes to Check:${NC}"
                    echo "  • Professional blue color scheme (#1976d2)"
                    echo "  • Proper text contrast (no white on white)"
                    echo "  • Card layouts with shadows"
                    echo "  • Consistent spacing and typography"
                else
                    echo -e "${RED}❌ Installation failed${NC}"
                    echo -e "${YELLOW}APK is ready at: $(pwd)/$APK_PATH${NC}"
                fi
            else
                echo -e "${YELLOW}⚠️  No USB device connected${NC}"
                echo -e "${YELLOW}APK is ready at: $(pwd)/$APK_PATH${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  ADB not found${NC}"
            echo -e "${YELLOW}APK is ready at: $(pwd)/$APK_PATH${NC}"
        fi
    else
        echo -e "${RED}❌ APK file not found${NC}"
    fi
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
