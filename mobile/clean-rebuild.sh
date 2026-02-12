#!/bin/bash

# 🧹 Complete Clean Rebuild Script for React Native App
# This ensures all UI changes are properly included

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🧹 Complete Clean Rebuild - UI Changes                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd "$(dirname "$0")"

# Step 1: Clear Metro Bundler Cache
echo -e "${BLUE}📋 Step 1: Clearing Metro Bundler Cache...${NC}"
rm -rf /tmp/metro-* 2>/dev/null
rm -rf /tmp/haste-* 2>/dev/null
npx react-native start --reset-cache &
METRO_PID=$!
sleep 3
kill $METRO_PID 2>/dev/null
echo -e "${GREEN}✓ Metro cache cleared${NC}"
echo ""

# Step 2: Clear Node Modules Cache
echo -e "${BLUE}📋 Step 2: Clearing Node Cache...${NC}"
rm -rf node_modules/.cache 2>/dev/null
rm -rf $TMPDIR/react-* 2>/dev/null
rm -rf $TMPDIR/metro-* 2>/dev/null
echo -e "${GREEN}✓ Node cache cleared${NC}"
echo ""

# Step 3: Clean Android Build
echo -e "${BLUE}📋 Step 3: Cleaning Android Build...${NC}"
cd android

# Clean Gradle
./gradlew clean
echo -e "${GREEN}✓ Gradle clean done${NC}"

# Clean build directories
rm -rf app/build 2>/dev/null
rm -rf build 2>/dev/null
rm -rf .gradle 2>/dev/null
echo -e "${GREEN}✓ Build directories cleaned${NC}"

# Clear only transforms cache (not entire Gradle cache)
rm -rf ~/.gradle/caches/transforms-3 2>/dev/null || true
echo -e "${GREEN}✓ Gradle transforms cache cleared${NC}"
echo ""

# Step 4: Rebuild APK
echo -e "${BLUE}📋 Step 4: Building Fresh APK...${NC}"
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
    exit 1
fi
