#!/bin/bash

# ============================================================================
# Android Development Environment Setup Script
# For: Aaradhya Fashion ERP - Mobile App
# ============================================================================

set -e  # Exit on any error

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║     Android Development Environment Setup for macOS                        ║"
echo "║     Aaradhya Fashion ERP - Mobile App                                      ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# ============================================================================
# STEP 1: Check and Install Homebrew
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Checking Homebrew Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v brew &> /dev/null; then
    print_success "Homebrew is already installed"
    brew --version
else
    print_warning "Homebrew is not installed. Installing now..."
    print_info "This may take a few minutes..."
    
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    
    print_success "Homebrew installed successfully"
fi

echo ""

# ============================================================================
# STEP 2: Install Java (OpenJDK 17)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Installing Java Development Kit (JDK 17)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if java -version 2>&1 | grep -q "version \"17"; then
    print_success "Java 17 is already installed"
    java -version
else
    print_info "Installing OpenJDK 17..."
    brew install openjdk@17
    
    # Create symlink for system Java wrappers
    sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk 2>/dev/null || true
    
    print_success "Java 17 installed successfully"
fi

# Set JAVA_HOME
JAVA_HOME_PATH=$(/usr/libexec/java_home -v 17 2>/dev/null || echo "/opt/homebrew/opt/openjdk@17")

# Add Java to shell profile
if ! grep -q "JAVA_HOME" ~/.zshrc; then
    echo "" >> ~/.zshrc
    echo "# Java Configuration (Added by setup script)" >> ~/.zshrc
    echo "export JAVA_HOME=\$(/usr/libexec/java_home -v 17)" >> ~/.zshrc
    echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> ~/.zshrc
    print_success "Java environment variables added to ~/.zshrc"
else
    print_info "Java environment variables already configured in ~/.zshrc"
fi

export JAVA_HOME="$JAVA_HOME_PATH"
export PATH="$JAVA_HOME/bin:$PATH"

echo ""
print_success "Current Java version:"
java -version

echo ""

# ============================================================================
# STEP 3: Download Android Studio
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Android Studio Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "/Applications/Android Studio.app" ]; then
    print_success "Android Studio is already installed"
else
    print_warning "Android Studio is NOT installed"
    print_info "Installing Android Studio via Homebrew Cask..."
    
    brew install --cask android-studio
    
    print_success "Android Studio installed successfully"
fi

echo ""

# ============================================================================
# STEP 4: Configure Android SDK Environment Variables
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Configuring Android SDK Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ANDROID_SDK_PATH="$HOME/Library/Android/sdk"

if [ -d "$ANDROID_SDK_PATH" ]; then
    print_success "Android SDK found at: $ANDROID_SDK_PATH"
else
    print_warning "Android SDK directory not found (will be created by Android Studio)"
    print_info "You'll need to run Android Studio setup wizard after this script completes"
fi

# Add Android SDK to shell profile
if ! grep -q "ANDROID_HOME" ~/.zshrc; then
    echo "" >> ~/.zshrc
    echo "# Android SDK Configuration (Added by setup script)" >> ~/.zshrc
    echo "export ANDROID_HOME=\$HOME/Library/Android/sdk" >> ~/.zshrc
    echo "export PATH=\$PATH:\$ANDROID_HOME/emulator" >> ~/.zshrc
    echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools" >> ~/.zshrc
    echo "export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin" >> ~/.zshrc
    echo "export PATH=\$PATH:\$ANDROID_HOME/tools/bin" >> ~/.zshrc
    print_success "Android SDK environment variables added to ~/.zshrc"
else
    print_info "Android SDK environment variables already configured in ~/.zshrc"
fi

export ANDROID_HOME="$ANDROID_SDK_PATH"
export PATH="$PATH:$ANDROID_HOME/platform-tools"

echo ""

# ============================================================================
# STEP 5: Install Node Dependencies
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5: Installing Node.js Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -d "$SCRIPT_DIR/node_modules" ]; then
    print_success "Node modules already installed"
else
    print_info "Installing Node dependencies..."
    npm install
    print_success "Node dependencies installed successfully"
fi

echo ""

# ============================================================================
# Summary and Next Steps
# ============================================================================
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                     ✅ INSTALLATION COMPLETE!                              ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

print_success "Environment Setup Summary:"
echo ""
echo "  ✅ Java 17 (OpenJDK) installed"
echo "  ✅ Android Studio installed"
echo "  ✅ Environment variables configured"
echo "  ✅ Node dependencies installed"
echo ""

print_warning "IMPORTANT - Next Steps Required:"
echo ""
echo "  1️⃣  Apply environment variables:"
echo "      source ~/.zshrc"
echo ""
echo "  2️⃣  Launch Android Studio and complete initial setup:"
echo "      - Open Android Studio from Applications"
echo "      - Complete the setup wizard"
echo "      - Install these SDK components:"
echo "        • Android SDK Platform 33"
echo "        • Android SDK Build-Tools 33.0.0"
echo "        • Android Emulator"
echo "        • NDK version 23.1.7779620"
echo ""
echo "  3️⃣  After Android Studio setup, verify installation:"
echo "      cd $(dirname "$0")"
echo "      ./verify-installation.sh"
echo ""
echo "  4️⃣  Build and run the app:"
echo "      npm run android"
echo ""

print_info "Documentation available at:"
echo "  • Quick Start: QUICK_REFERENCE.md"
echo "  • Detailed Guide: ANDROID_BUILD_GUIDE.md"
echo "  • Fix Summary: ANDROID_FIX_SUMMARY.md"
echo ""

print_success "Setup script completed successfully! 🎉"
echo ""
