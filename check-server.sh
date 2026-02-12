#!/bin/bash
# EC2 / Ubuntu par chalayein - sab kuch check karta hai (backend, frontend, nginx, port)
# Use: chmod +x check-server.sh && ./check-server.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "=============================================="
echo "  Server Check - Backend, Frontend, Nginx"
echo "=============================================="
echo ""

# 1. Project path
echo -e "${BLUE}[1] Project path:${NC} $SCRIPT_DIR"
if [ ! -d "$SCRIPT_DIR/backend" ] || [ ! -d "$SCRIPT_DIR/frontend" ]; then
    echo -e "${RED}  FAIL: backend/ ya frontend/ folder nahi mila${NC}"
else
    echo -e "${GREEN}  OK: backend + frontend folders hai${NC}"
fi
echo ""

# 2. Backend
echo -e "${BLUE}[2] Backend:${NC}"
if [ ! -f "$SCRIPT_DIR/backend/dist/server.js" ]; then
    echo -e "${RED}  FAIL: backend/dist/server.js nahi hai - pehle 'cd backend && npm run build' chalao${NC}"
else
    echo -e "${GREEN}  OK: dist/server.js hai${NC}"
fi
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
    echo -e "${RED}  FAIL: backend/.env nahi hai${NC}"
else
    echo -e "${GREEN}  OK: backend/.env hai${NC}"
fi
echo ""

# 3. PM2 / Backend process
echo -e "${BLUE}[3] Backend process (port 3001):${NC}"
if command -v pm2 &>/dev/null; then
    pm2 list 2>/dev/null | head -20
    if ! pm2 describe aaradhya-backend &>/dev/null; then
        echo -e "${RED}  FAIL: PM2 me aaradhya-backend nahi chalta - start karo${NC}"
    else
        echo -e "${GREEN}  OK: aaradhya-backend PM2 me hai${NC}"
    fi
else
    echo -e "${YELLOW}  pm2 install nahi hai: sudo npm install -g pm2${NC}"
fi
if ss -tlnp 2>/dev/null | grep -q ':3001 ' || netstat -tlnp 2>/dev/null | grep -q ':3001'; then
    echo -e "${GREEN}  OK: Port 3001 par kuch chal raha hai${NC}"
else
    echo -e "${RED}  FAIL: Port 3001 par koi process nahi - backend start karo${NC}"
fi
echo ""

# 4. Backend health
echo -e "${BLUE}[4] Backend API health:${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health 2>/dev/null | grep -q 200; then
    echo -e "${GREEN}  OK: curl http://127.0.0.1:3001/api/health => 200${NC}"
else
    echo -e "${RED}  FAIL: Backend respond nahi kar raha (curl http://127.0.0.1:3001/api/health)${NC}"
fi
echo ""

# 5. Frontend build
echo -e "${BLUE}[5] Frontend build:${NC}"
if [ ! -d "$SCRIPT_DIR/frontend/dist" ] || [ ! -f "$SCRIPT_DIR/frontend/dist/index.html" ]; then
    echo -e "${RED}  FAIL: frontend/dist/index.html nahi hai - pehle 'cd frontend && npm run build' chalao${NC}"
else
    echo -e "${GREEN}  OK: frontend/dist hai${NC}"
fi
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${YELLOW}  Warning: root .env nahi hai (VITE_API_URL chahiye frontend build ke liye)${NC}"
elif ! grep -q "VITE_API_URL=" "$SCRIPT_DIR/.env"; then
    echo -e "${YELLOW}  Warning: .env me VITE_API_URL nahi hai${NC}"
else
    echo -e "${GREEN}  OK: .env me VITE_API_URL hai${NC}"
fi
echo ""

# 6. Nginx
echo -e "${BLUE}[6] Nginx:${NC}"
if ! command -v nginx &>/dev/null; then
    echo -e "${RED}  FAIL: nginx install nahi - sudo apt install nginx${NC}"
else
    echo -e "${GREEN}  nginx installed${NC}"
    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo -e "${GREEN}  OK: nginx service chal rahi hai${NC}"
    else
        echo -e "${RED}  FAIL: nginx service nahi chal rahi - sudo systemctl start nginx${NC}"
    fi
    if [ -f /etc/nginx/sites-enabled/aaradhya ]; then
        echo -e "${GREEN}  OK: sites-enabled/aaradhya hai${NC}"
        ROOT=$(grep -E "^\s*root\s+" /etc/nginx/sites-enabled/aaradhya 2>/dev/null | head -1 | awk '{print $2}' | tr -d ';')
        if [ -n "$ROOT" ] && [ -d "$ROOT" ]; then
            echo -e "${GREEN}  OK: Nginx root path exist: $ROOT${NC}"
        elif [ -n "$ROOT" ]; then
            echo -e "${RED}  FAIL: Nginx root path exist nahi karta: $ROOT${NC}"
            echo -e "  Fix: nginx config me root ko yahan karo: $SCRIPT_DIR/frontend/dist"
        fi
    else
        echo -e "${RED}  FAIL: sites-enabled/aaradhya nahi - config enable karo${NC}"
    fi
fi
echo ""

# 7. Port 80
echo -e "${BLUE}[7] Port 80:${NC}"
if ss -tlnp 2>/dev/null | grep -q ':80 ' || netstat -tlnp 2>/dev/null | grep -q ':80 '; then
    echo -e "${GREEN}  OK: Port 80 par kuch chal raha hai (nginx)${NC}"
else
    echo -e "${RED}  FAIL: Port 80 par koi process nahi${NC}"
fi
echo ""

echo "=============================================="
echo "  Summary: Agar koi FAIL hai to fix karo, phir:"
echo "  ./deploy-aws-server.sh  ya  AWS_DEPLOY.md follow karo"
echo "=============================================="
echo ""
