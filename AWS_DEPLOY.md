# 🚀 AWS पर Aaradhya Fashion ERP Live करने का पूरा गाइड

आपने **Ubuntu 24.04.3 LTS** EC2 instance launch कर लिया है। अब नीचे दिए स्टेप्स फॉलो करें।

---

## ⚡ Quick Command List (कॉपी-पेस्ट के लिए)

**एक बार EC2 पर SSH करने के बाद ये क्रम से चलाएं (पहली बार सेटअप):**

```bash
# System + Node + Nginx + PM2
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

प्रोजेक्ट क्लोन/कॉपी के बाद (IP की जगह अपना EC2 IP use करें):

```bash
cd ~/Treding-ERP-Barcode-System

# Backend
cd backend
npm install
echo -e "PORT=3001\nNODE_ENV=production\nJWT_SECRET=change-this-secret-2026\nDATABASE_PATH=./database/aaradhya.db" > .env
npm run migrate && npm run build
pm2 start dist/server.js --name aaradhya-backend && pm2 save && pm2 startup

# Frontend (root .env में VITE_API_URL=http://YOUR_IP/api सेट करें)
cd ..
echo "VITE_API_URL=http://YOUR_EC2_IP/api" >> .env
cd frontend && npm install && npm run build
```

फिर Nginx कॉन्फिग (नीचे भाग 5) करें और Security Group में port 80 open करें।

---

## 📋 जरूरी चीजें (पहले से तैयार रखें)

- EC2 instance का **Public IP** (जैसे: `13.xxx.xxx.xxx`)
- **.pem key file** (SSH के लिए)
- (Optional) Domain name अगर HTTPS चाहिए

---

## भाग 1: पहली बार EC2 पर SSH और बेसिक सेटअप

### 1.1 अपने कंप्यूटर से EC2 पर SSH

```bash
# Key की permission ठीक करें (एक बार)
chmod 400 /path/to/your-key.pem

# SSH से कनेक्ट (अपना IP और key path बदलें)
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

उदाहरण: `ssh -i ~/Downloads/my-key.pem ubuntu@13.234.56.78`

### 1.2 सिस्टम अपडेट और जरूरी सॉफ्टवेयर

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

### 1.3 Node.js 20 LTS इंस्टॉल करें

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Check
node -v   # v20.x.x
npm -v
```

### 1.4 Nginx इंस्टॉल (frontend + reverse proxy के लिए)

```bash
sudo apt install -y nginx
```

### 1.5 PM2 इंस्टॉल (backend हमेशा चले, ऑटो रीस्टार्ट)

```bash
sudo npm install -g pm2
```

---

## भाग 2: प्रोजेक्ट सर्वर पर लाना

### ऑप्शन A: Git से क्लोन (अगर repo GitHub/GitLab पर है)

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/Treding-ERP-Barcode-System.git
cd Treding-ERP-Barcode-System
```

### ऑप्शन B: अपने कंप्यूटर से SCP से फाइलें भेजना

**अपने लैपटॉप/PC पर** (नई टर्मिनल में):

```bash
cd /path/to/Treding-ERP-Barcode-System-main

# पूरा फोल्डर सर्वर पर भेजें (key और IP बदलें)
scp -i /path/to/your-key.pem -r . ubuntu@YOUR_EC2_IP:~/Treding-ERP-Barcode-System
```

फिर EC2 पर:

```bash
cd ~/Treding-ERP-Barcode-System
```

---

## भाग 3: Backend सेटअप (EC2 पर)

```bash
cd ~/Treding-ERP-Barcode-System/backend
```

### 3.1 Dependencies इंस्टॉल

```bash
npm install
```

### 3.2 .env फाइल बनाएं

**अपने EC2 के Public IP या Domain use करें।**  
मान लो EC2 IP है: `13.234.56.78`

```bash
nano .env
```

अंदर ये डालें (IP/domain अपने हिसाब से बदलें):

```env
PORT=3001
NODE_ENV=production
JWT_SECRET=apna-bahut-strong-secret-key-yahan-dalein-2026
DATABASE_PATH=./database/aaradhya.db
```

Save: `Ctrl+O`, Enter, फिर `Ctrl+X`।

### 3.3 Database migrate

```bash
npm run migrate
```

### 3.4 Backend build

```bash
npm run build
```

### 3.5 PM2 से Backend चलाएं

```bash
cd ~/Treding-ERP-Barcode-System/backend
pm2 start dist/server.js --name aaradhya-backend
pm2 save
pm2 startup
# जो कमांड आउटपुट में आए वो रन करें (sudo env PATH=...)
```

Check:

```bash
pm2 status
curl http://localhost:3001/api/health
```

अगर `{"status":"ok"}` आए तो backend ठीक चल रहा है।

---

## भाग 4: Frontend बिल्ड (EC2 पर)

Frontend को **API URL** बिल्ड टाइम पर चाहिए। अपना EC2 IP या domain use करें।

### 4.1 .env बनाएं (प्रोजेक्ट रूट पर)

```bash
cd ~/Treding-ERP-Barcode-System
nano .env
```

अंदर:

```env
# अपना EC2 Public IP या domain डालें (http या https)
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP/api
API_URL=http://YOUR_EC2_PUBLIC_IP/api
```

उदाहरण: `VITE_API_URL=http://13.234.56.78/api`

Save करके बंद करें।

### 4.2 Frontend बिल्ड

```bash
cd ~/Treding-ERP-Barcode-System/frontend
npm install
npm run build
```

बिल्ड के बाद फाइलें `frontend/dist` में आएंगी।

---

## भाग 5: Nginx कॉन्फिगर (Frontend + API proxy)

### 5.1 साइट कॉन्फिग फाइल बनाएं

```bash
sudo nano /etc/nginx/sites-available/aaradhya
```

अंदर पूरा ये ब्लॉक डालें। **`YOUR_EC2_PUBLIC_IP`** की जगह अपना IP लिखें:

```nginx
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP;
    # Domain use कर रहे हों तो: server_name yourdomain.com www.yourdomain.com;

    root /home/ubuntu/Treding-ERP-Barcode-System/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Save: `Ctrl+O`, Enter, `Ctrl+X`।

### 5.2 साइट enable करें और Nginx रीस्टार्ट

```bash
sudo ln -sf /etc/nginx/sites-available/aaradhya /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## भाग 6: Firewall (Security Group + UFW)

### AWS Security Group (Console में)

EC2 → Security Group → Inbound rules में ये रूल जोड़ें:

| Type   | Port | Source    |
|--------|------|-----------|
| SSH    | 22   | My IP (या सुरक्षित IP) |
| HTTP   | 80   | 0.0.0.0/0 |
| Custom | 3001 | 0.0.0.0/0 (अगर सीधे API चलाना हो) |

ज्यादातर केस में सिर्फ **80** और **22** काफी है (Nginx 80 पर सब serve करेगा)।

### सर्वर पर UFW (optional लेकिन अच्छा)

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw enable
sudo ufw status
```

---

## भाग 7: चेक करें

1. ब्राउजर में खोलें: `http://YOUR_EC2_PUBLIC_IP`
2. Login: **admin** / **admin123**
3. अगर लॉगिन हो जाए और पेज लोड हों तो लाइव है।

---

## 🔄 आगे से कोड अपडेट करने पर (Deploy again)

```bash
cd ~/Treding-ERP-Barcode-System

# अगर Git use कर रहे हैं
git pull

# Backend
cd backend && npm install && npm run build && npm run migrate
pm2 restart aaradhya-backend

# Frontend (फिर से .env में VITE_API_URL सही हो)
cd ../frontend && npm install && npm run build
sudo systemctl reload nginx
```

---

## 📌 एक स्क्रिप्ट से सब करना (आसान तरीका)

प्रोजेक्ट में `deploy-aws-server.sh` स्क्रिप्ट है। सर्वर पर प्रोजेक्ट क्लोन/कॉपी करने के बाद:

```bash
cd ~/Treding-ERP-Barcode-System
chmod +x deploy-aws-server.sh
# पहले .env और IP/domain सेट करें, फिर:
./deploy-aws-server.sh
```

यह backend build, migrate, PM2 और frontend build कर देगा। Nginx कॉन्फिग आपको एक बार ऊपर वाले स्टेप से करना होगा।

---

## 🔐 HTTPS (Optional – Domain हो तो)

1. Domain का A record EC2 Public IP पर point करें।
2. Nginx कॉन्फिग में `server_name yourdomain.com;` use करें।
3. Certbot से SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

4. Frontend फिर से बिल्ड करें: `VITE_API_URL=https://yourdomain.com/api`

---

## ❗ समस्या निवारण

| समस्या | क्या करें |
|--------|------------|
| पेज नहीं खुलता | Security Group में port 80 open है? `curl http://localhost` सर्वर पर चलाएं। |
| API error / Network error | Frontend में `VITE_API_URL` सही है? फिर से `npm run build` करें। |
| 502 Bad Gateway | `pm2 status` और `curl http://localhost:3001/api/health` चेक करें। |
| Login नहीं होता | Backend लॉग: `pm2 logs aaradhya-backend`। Database: `npm run migrate` दोबारा। |

---

## ✅ संक्षेप में कमांड ऑर्डर

1. SSH → `ssh -i key.pem ubuntu@IP`
2. Update + Node + Nginx + PM2 इंस्टॉल (ऊपर दिए कमांड)
3. प्रोजेक्ट क्लोन या SCP से भेजें
4. Backend: `cd backend` → `.env` बनाएं → `npm install` → `npm run migrate` → `npm run build` → `pm2 start dist/server.js --name aaradhya-backend` → `pm2 save` → `pm2 startup`
5. Root पर `.env` में `VITE_API_URL=http://YOUR_IP/api`
6. Frontend: `cd frontend` → `npm install` → `npm run build`
7. Nginx कॉन्फिग लिखें, enable करें, `sudo nginx -t` → `sudo systemctl restart nginx`
8. Security Group में 80 (और 22) open करें
9. ब्राउजर में `http://YOUR_IP` खोलें

इसके बाद आपका ERP **AWS पर लाइव** होगा।
