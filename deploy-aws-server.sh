#!/bin/bash
# AWS / Ubuntu Server par run karein - Backend + Frontend build & PM2 restart
# Use: chmod +x deploy-aws-server.sh && ./deploy-aws-server.sh

set -e
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Aaradhya Fashion ERP - AWS Server Deploy${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check root .env for VITE_API_URL (required for frontend build)
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${RED}Error: Root .env missing. Create it with VITE_API_URL=http://YOUR_EC2_IP/api${NC}"
    exit 1
fi
if ! grep -q "VITE_API_URL=" "$SCRIPT_DIR/.env"; then
    echo -e "${YELLOW}Warning: VITE_API_URL not set in .env - frontend may point to wrong API${NC}"
fi

# --- Backend ---
echo -e "${BLUE}[1/4] Backend: install, migrate, build${NC}"
cd "$SCRIPT_DIR/backend"
if [ ! -f ".env" ]; then
    echo -e "${RED}backend/.env missing. Create it (see AWS_DEPLOY.md)${NC}"
    exit 1
fi
npm install --production=false
npm run migrate
npm run build
echo -e "${GREEN}  Backend build done.${NC}"
echo ""

# --- PM2 ---
echo -e "${BLUE}[2/4] PM2: restart backend${NC}"
if command -v pm2 &>/dev/null; then
    if pm2 describe aaradhya-backend &>/dev/null; then
        pm2 restart aaradhya-backend
        echo -e "${GREEN}  PM2 restarted aaradhya-backend${NC}"
    else
        pm2 start dist/server.js --name aaradhya-backend
        pm2 save
        echo -e "${GREEN}  PM2 started aaradhya-backend (first time)${NC}"
    fi
else
    echo -e "${YELLOW}  pm2 not found. Install: sudo npm install -g pm2${NC}"
    echo -e "${YELLOW}  Then run: cd $SCRIPT_DIR/backend && pm2 start dist/server.js --name aaradhya-backend && pm2 save && pm2 startup${NC}"
fi
echo ""

# --- Frontend ---
echo -e "${BLUE}[3/4] Frontend: install, build${NC}"
cd "$SCRIPT_DIR/frontend"
npm install
npm run build
echo -e "${GREEN}  Frontend build done → frontend/dist${NC}"
echo ""

# --- Nginx reload (if nginx and config exist)
echo -e "${BLUE}[4/4] Nginx reload${NC}"
if command -v nginx &>/dev/null && [ -f /etc/nginx/sites-enabled/aaradhya ] 2>/dev/null; then
    if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx
        echo -e "${GREEN}  Nginx reloaded${NC}"
    else
        echo -e "${YELLOW}  Nginx config invalid, skip reload${NC}"
    fi
else
    echo -e "${YELLOW}  Nginx not configured for aaradhya - configure manually (see AWS_DEPLOY.md)${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deploy complete. Open http://YOUR_EC2_IP in browser.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
