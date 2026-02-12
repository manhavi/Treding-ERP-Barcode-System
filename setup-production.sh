#!/bin/bash

# 🚀 Complete Production Setup Script
# For Aaradhya Fashion ERP System

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🎯 Aaradhya Fashion - Production Setup                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get local IP address
echo -e "${BLUE}🔍 Detecting your computer's IP address...${NC}"
if command -v ipconfig &> /dev/null; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
elif command -v hostname &> /dev/null; then
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
fi

if [ -z "$LOCAL_IP" ]; then
    echo -e "${YELLOW}⚠️  Could not auto-detect IP address${NC}"
    echo -e "${YELLOW}Please find your IP manually:${NC}"
    echo "  • macOS: System Settings > Network > Wi-Fi > Details"
    echo "  • Or open Network Utility"
    echo ""
    read -p "Enter your computer's IP address: " LOCAL_IP
fi

echo -e "${GREEN}✓ Using IP address: ${LOCAL_IP}${NC}"
echo ""

# Step 1: Setup Backend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📦 Step 1: Setting up Backend...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Build backend
echo "Building backend..."
npm run build

# Run database migration
echo "Running database migrations..."
npm run migrate

echo -e "${GREEN}✓ Backend setup complete!${NC}"
echo ""

# Step 2: Setup Frontend
cd ../frontend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🎨 Step 2: Setting up Frontend...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Build frontend
echo "Building frontend for production..."
npm run build

echo -e "${GREEN}✓ Frontend build complete!${NC}"
echo ""

# Step 3: Setup Mobile App
cd ../mobile
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📱 Step 3: Configuring Mobile App...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Update API URL in mobile app
echo "Updating mobile app API configuration..."
sed -i.bak "s|http://YOUR_COMPUTER_IP:3001/api|http://${LOCAL_IP}:3001/api|g" src/services/api.ts
rm -f src/services/api.ts.bak

echo -e "${GREEN}✓ Mobile app configured with IP: ${LOCAL_IP}${NC}"
echo ""

# Go back to root
cd ..

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║            ✅ Setup Complete!                                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}📋 Next Steps:${NC}"
echo ""
echo "1️⃣  Start Backend:"
echo "   ${YELLOW}./start-backend.sh${NC}"
echo ""
echo "2️⃣  Start Frontend (in new terminal):"
echo "   ${YELLOW}./start-frontend.sh${NC}"
echo ""
echo "3️⃣  Rebuild Mobile App with new API URL:"
echo "   ${YELLOW}cd mobile/android${NC}"
echo "   ${YELLOW}./gradlew clean assembleDebug${NC}"
echo ""
echo "4️⃣  Install new APK on your phone:"
echo "   APK location: ${YELLOW}mobile/android/app/build/outputs/apk/debug/app-debug.apk${NC}"
echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo "   • Web: http://localhost:5173"
echo "   • Backend API: http://localhost:3001/api"
echo "   • Mobile API: http://${LOCAL_IP}:3001/api"
echo ""
echo -e "${GREEN}Default Login:${NC}"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
