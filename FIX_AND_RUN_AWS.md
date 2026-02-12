# 🔧 http://13.201.67.96 Open Nahi Ho Raha – Fix Step by Step

EC2 पर SSH करके नीचे के स्टेप्स **क्रम से** चलाएं। हर स्टेप के बाद दोबारा `http://13.201.67.96` खोलकर चेक करें।

---

## पहले ये चेक करो (Diagnose)

EC2 पर प्रोजेक्ट फोल्डर में जाओ। **Tumhare server par folder name:** `Treding-ERP-Barcode-System` (bina -main).

```bash
cd ~
ls
# Server par usually: Treding-ERP-Barcode-System (no -main)
cd Treding-ERP-Barcode-System
```

फिर चेक स्क्रिप्ट चलाओ:

```bash
chmod +x check-server.sh
./check-server.sh
```

जो **FAIL** दिखे, उसी के हिसाब से नीचे वाले स्टेप करो।

---

## Step 1: Backend .env और build

```bash
cd ~/Treding-ERP-Barcode-System
cd backend
```

**backend/.env बनाओ (nano से):**

```bash
nano .env
```

अंदर ये डालो (copy-paste):

```env
PORT=3001
NODE_ENV=production
JWT_SECRET=aaradhya-secret-change-this-2026
DATABASE_PATH=./database/aaradhya.db
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

**Dependencies + migrate + build:**

```bash
npm install
npm run migrate
npm run build
```

**PM2 से backend start करो:**

```bash
pm2 start dist/server.js --name aaradhya-backend
pm2 save
pm2 startup
# Jo command output me aaye (sudo env PATH=...) woh copy karke chalao
```

**Check:**

```bash
curl http://127.0.0.1:3001/api/health
```

Agar `{"status":"ok"}` aaye to backend sahi chal raha hai.

---

## Step 2: Root .env (Frontend ke liye)

```bash
cd ~/Treding-ERP-Barcode-System
nano .env
```

अंदर ये होना चाहिए (IP tumhara 13.201.67.96):

```env
VITE_API_URL=http://13.201.67.96/api
API_URL=http://13.201.67.96/api
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

---

## Step 3: Frontend build

```bash
cd ~/Treding-ERP-Barcode-System/frontend
npm install
npm run build
```

**Check:** `frontend/dist` folder me `index.html` hona chahiye:

```bash
ls -la dist/
```

---

## Step 4: Nginx config (path sahi hona chahiye)

**Important:** Nginx की `root` वाली path वही होनी चाहिए जहाँ सर्वर पर प्रोजेक्ट है।

अगर प्रोजेक्ट यहाँ है: `/home/ubuntu/Treding-ERP-Barcode-System`  
तो root होना चाहिए: `/home/ubuntu/Treding-ERP-Barcode-System/frontend/dist`

**Apna actual path dekhne ke liye:**

```bash
cd ~/Treding-ERP-Barcode-System-main
pwd
# Output hoga: /home/ubuntu/Treding-ERP-Barcode-System-main
```

**Nginx config edit karo:**

```bash
sudo nano /etc/nginx/sites-available/aaradhya
```

**Pura content aisa hona chahiye** (tumhare server par folder **Treding-ERP-Barcode-System** hai):

```nginx
server {
    listen 80;
    server_name _;

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

**root path:** Tumhare server par: `root /home/ubuntu/Treding-ERP-Barcode-System/frontend/dist;`

Save: `Ctrl+O`, Enter, `Ctrl+X`

**Enable karke restart:**

```bash
sudo ln -sf /etc/nginx/sites-available/aaradhya /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 5: AWS Security Group (port 80 open)

1. AWS Console → EC2 → apna instance select karo  
2. Security tab → Security group par click  
3. Inbound rules → Edit inbound rules  
4. Add rule:
   - Type: **HTTP**
   - Port: **80**
   - Source: **0.0.0.0/0**
5. Save

---

## Step 6: Firewall (UFW) – agar on hai to

```bash
sudo ufw allow 80
sudo ufw allow 22
sudo ufw status
# Agar inactive hai to: sudo ufw enable
```

---

## Final check

**Server par:**

```bash
curl -I http://127.0.0.1
# 200 OK aana chahiye

curl http://127.0.0.1:3001/api/health
# {"status":"ok"}
```

**Apne computer ke browser me:**

```
http://13.201.67.96
```

Login: **admin** / **admin123**

---

## Agar ab bhi nahi khulta

**1. Backend error dekhne ke liye:**

```bash
pm2 logs aaradhya-backend
```

**2. Nginx error log:**

```bash
sudo tail -50 /var/log/nginx/error.log
```

**3. Nginx root path sahi hai?**

```bash
ls -la /home/ubuntu/Treding-ERP-Barcode-System/frontend/dist/
# index.html hona chahiye
```

---

## Short summary – ek baar sab theek karne ke liye

```bash
cd ~/Treding-ERP-Barcode-System

# Backend
cd backend
nano .env   # PORT=3001, NODE_ENV=production, JWT_SECRET=..., DATABASE_PATH=./database/aaradhya.db
npm install && npm run migrate && npm run build
pm2 start dist/server.js --name aaradhya-backend
pm2 save
pm2 startup

# Root .env
cd ..
echo 'VITE_API_URL=http://13.201.67.96/api
API_URL=http://13.201.67.96/api' > .env

# Frontend
cd frontend && npm install && npm run build

# Nginx – root path (tumhare server par folder: Treding-ERP-Barcode-System)
sudo nano /etc/nginx/sites-available/aaradhya
# root /home/ubuntu/Treding-ERP-Barcode-System/frontend/dist;
sudo ln -sf /etc/nginx/sites-available/aaradhya /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

Phir browser me **http://13.201.67.96** open karo.
