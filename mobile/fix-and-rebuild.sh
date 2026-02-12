#!/bin/bash

# 🔧 Fix Gradle Cache Issues and Rebuild

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🔧 Fixing Gradle Cache & Rebuilding App                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd "$(dirname "$0")"

# Step 1: Fix Gradle lock files
echo -e "${BLUE}📋 Step 1: Fixing Gradle Lock Files...${NC}"
rm -f ~/.gradle/wrapper/dists/gradle-8.1.1-all/*/gradle-8.1.1-all.zip.lck 2>/dev/null
rm -f ~/.gradle/wrapper/dists/gradle-8.1.1-all/*/*.lck 2>/dev/null
echo -e "${GREEN}✓ Lock files cleared${NC}"
echo ""

# Step 2: Remove corrupted transform cache
echo -e "${BLUE}📋 Step 2: Fixing Corrupted Cache...${NC}"
rm -rf ~/.gradle/caches/transforms-3/4ecc625171a8d407867c64c609cc59f1 2>/dev/null
echo -e "${GREEN}✓ Corrupted cache removed${NC}"
echo ""

# Step 3: Clean Android build
echo -e "${BLUE}📋 Step 3: Cleaning Android Build...${NC}"
cd android
./gradlew clean --no-daemon
echo -e "${GREEN}✓ Clean done${NC}"
echo ""

# Step 4: Build APK
echo -e "${BLUE}📋 Step 4: Building APK...${NC}"
echo -e "${YELLOW}This will take 3-5 minutes...${NC}"
echo ""

./gradlew assembleDebug --no-daemon

if [ $? -eq 0 ]; then
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK_PATH" ]; then
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        echo ""
        echo -e "${GREEN}✅ APK Built Successfully!${NC}"
        echo -e "  📱 Location: $(pwd)/$APK_PATH"
        echo -e "  📊 Size: $APK_SIZE"
        echo ""
        
        # Step 5: Install on device
        if command -v adb &> /dev/null; then
            DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
            if [ "$DEVICES" -gt 0 ]; then
                echo -e "${BLUE}📋 Step 5: Installing on Device...${NC}"
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
    echo ""
    echo -e "${YELLOW}💡 Try this:${NC}"
    echo "  1. Wait a few seconds and try again"
    echo "  2. Or manually run: cd android && ./gradlew assembleDebug"
    exit 1
fi
