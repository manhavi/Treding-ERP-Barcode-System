#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     📺 Setup Screen Mirroring (Phone → Mac)                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Homebrew is installed
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Step 1: Checking Homebrew..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command_exists brew; then
    echo -e "${RED}✗ Homebrew not found!${NC}"
    echo ""
    echo "Install Homebrew first:"
    echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    exit 1
fi

echo -e "${GREEN}✓ Homebrew found${NC}"
echo ""

# Check if scrcpy is installed
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Step 2: Checking scrcpy..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command_exists scrcpy; then
    echo -e "${YELLOW}scrcpy not installed. Installing...${NC}"
    echo ""
    brew install scrcpy
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ scrcpy installed successfully!${NC}"
    else
        echo ""
        echo -e "${RED}✗ Installation failed!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ scrcpy already installed${NC}"
fi

echo ""

# Check ADB
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Step 3: Checking ADB..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command_exists adb; then
    echo -e "${YELLOW}ADB not installed. Installing Android Platform Tools...${NC}"
    echo ""
    brew install --cask android-platform-tools
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Android Platform Tools installed successfully!${NC}"
    else
        echo ""
        echo -e "${RED}✗ Installation failed!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ ADB found${NC}"
fi

echo ""

# Check connected devices
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Step 4: Checking connected devices..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DEVICES=$(adb devices | grep -w "device" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo -e "${YELLOW}⚠ No device connected!${NC}"
    echo ""
    echo "Please connect your Android phone via USB:"
    echo ""
    echo "  1. Go to Settings → About Phone"
    echo "  2. Tap 'Build Number' 7 times"
    echo "  3. Go to Settings → Developer Options"
    echo "  4. Enable 'USB Debugging'"
    echo "  5. Connect phone via USB"
    echo "  6. Allow USB debugging"
    echo ""
    read -p "Press Enter after connecting your phone..."
    
    # Check again
    DEVICES=$(adb devices | grep -w "device" | wc -l)
    if [ "$DEVICES" -eq 0 ]; then
        echo -e "${RED}✗ Still no device detected!${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Device connected!${NC}"
echo ""
adb devices
echo ""

# Start scrcpy
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Step 5: Starting Screen Mirror..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}Launching scrcpy...${NC}"
echo ""
echo "Tips:"
echo "  • Your phone screen will appear on Mac"
echo "  • You can control phone from Mac"
echo "  • Press Ctrl+C to stop mirroring"
echo ""

# Start scrcpy with optimal settings
scrcpy --max-size 1024 --bit-rate 8M --stay-awake

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Screen mirroring ended"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
