#!/bin/bash
# =============================================================================
# start-live.sh - Ek script se Backend + Frontend dono live (AWS / Ubuntu)
# Use: chmod +x start-live.sh && ./start-live.sh
# =============================================================================
set -e
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Aaradhya Fashion ERP - Start Live (Backend + Frontend)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# --- Backend ---
echo -e "${BLUE}[1/4] Backend: install, migrate, build${NC}"
cd "$SCRIPT_DIR/backend"
if [ ! -f ".env" ]; then
  [ -f "../.env.example" ] && cp ../.env.example .env && echo -e "${YELLOW}  Created backend/.env from .env.example${NC}"
fi
npm install --production=false
npm run migrate
npm run build
echo -e "${GREEN}  Backend build done.${NC}"
echo ""

# --- PM2 Backend ---
echo -e "${BLUE}[2/4] PM2: start/restart backend (port 3001)${NC}"
if ! command -v pm2 &>/dev/null; then
  echo -e "${YELLOW}  Installing PM2 globally...${NC}"
  sudo npm install -g pm2
fi
if pm2 describe aaradhya-backend &>/dev/null; then
  pm2 restart aaradhya-backend
  echo -e "${GREEN}  PM2 restarted aaradhya-backend${NC}"
else
  pm2 start dist/server.js --name aaradhya-backend --cwd "$SCRIPT_DIR/backend"
  pm2 save
  echo -e "${GREEN}  PM2 started aaradhya-backend${NC}"
fi
echo ""

# --- Frontend ---
echo -e "${BLUE}[3/4] Frontend: install, build${NC}"
cd "$SCRIPT_DIR/frontend"
if [ ! -f ".env" ]; then
  [ -f "../.env.example" ] && cp ../.env.example .env && echo -e "${YELLOW}  Created frontend/.env${NC}"
fi
npm install
npm run build
echo -e "${GREEN}  Frontend build done → frontend/dist${NC}"
echo ""

# --- Serve Frontend (PM2 ya Nginx) ---
echo -e "${BLUE}[4/4] Frontend serve (port 3000)${NC}"
if command -v nginx &>/dev/null && [ -f /etc/nginx/sites-enabled/aaradhya ] 2>/dev/null; then
  if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    echo -e "${GREEN}  Nginx reloaded - frontend via Nginx${NC}"
  else
    echo -e "${YELLOW}  Nginx config invalid, starting frontend with PM2...${NC}"
    if pm2 describe aaradhya-frontend &>/dev/null; then
      pm2 restart aaradhya-frontend
    else
      (cd "$SCRIPT_DIR/frontend" && pm2 start "npx --yes serve -s dist -l 3000" --name aaradhya-frontend)
      pm2 save
    fi
  fi
else
  if pm2 describe aaradhya-frontend &>/dev/null; then
    pm2 restart aaradhya-frontend
    echo -e "${GREEN}  PM2 restarted aaradhya-frontend${NC}"
  else
    (cd "$SCRIPT_DIR/frontend" && pm2 start "npx --yes serve -s dist -l 3000" --name aaradhya-frontend)
    pm2 save
    echo -e "${GREEN}  PM2 started aaradhya-frontend (port 3000)${NC}"
  fi
fi

pm2 save 2>/dev/null || true
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Live: Backend → http://localhost:3001  |  Frontend → http://localhost:3000${NC}"
echo -e "${GREEN}  AWS: Replace localhost with your EC2 public IP${NC}"
echo -e "${GREEN}  PM2: pm2 list | pm2 logs${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
