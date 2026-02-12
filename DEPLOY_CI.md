# CI/CD: GitHub push → Auto deploy AWS EC2

`main` branch पर push करते ही (या Actions से manually run करने पर) code EC2 पर pull होकर backend/frontend build और PM2 restart हो जाता है।

---

## 1. GitHub पर Secrets सेट करें

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret name         | Value | जरूरी |
|---------------------|--------|--------|
| `EC2_HOST`          | EC2 का public IP या hostname (जैसे `13.201.67.96`) | हाँ |
| `EC2_USER`          | SSH user, आमतौर पर `ubuntu` | हाँ |
| `EC2_SSH_KEY`       | EC2 की `.pem` key का **पूरा content** (चाबी की बॉडी कॉपी करें) | हाँ |
| `EC2_PROJECT_PATH`  | सर्वर पर project folder path (जैसे `/home/ubuntu/Treding-ERP-Barcode-System`) | नहीं (न डालें तो `/home/ubuntu/Treding-ERP-Barcode-System` use होगा) |

SSH port हमेशा 22 use होता है (बदलने के लिए workflow में `port` जोड़ सकते हैं)।

### EC2_SSH_KEY कैसे लें

अपने कंप्यूटर पर:

```bash
cat /path/to/your-key.pem
```

पूरा आउटपुट (`-----BEGIN ... KEY-----` से `-----END ... KEY-----` तक) कॉपी करके GitHub secret **EC2_SSH_KEY** में paste करें।

---

## 2. EC2 पर पहली बार repo क्लोन

EC2 पर SSH करके project folder वही रखें जो आप `EC2_PROJECT_PATH` में देंगे (या default path):

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
cd ~
git clone https://github.com/YOUR_USERNAME/Treding-ERP-Barcode-System.git
cd Treding-ERP-Barcode-System
```

Root पर `.env` और `backend/.env` बनाएं (एक बार), जैसा `AWS_DEPLOY.md` में बताया है। फिर एक बार हाथ से deploy चला कर चेक कर लें:

```bash
chmod +x deploy-aws-server.sh && ./deploy-aws-server.sh
```

---

## 3. अब push = deploy

- कोई भी **push to `main`** → workflow चलेगा और EC2 पर:
  - `git pull` (या `git fetch` + `git reset --hard origin/main`)
  - `./deploy-aws-server.sh` (backend install/build, PM2 restart, frontend build, nginx reload)
- **Manual run:** GitHub → **Actions** → **Deploy to AWS** → **Run workflow**

---

## 4. Troubleshooting

- **SSH fail:** `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` सही हैं? Security Group में EC2 के लिए port 22 (या जो port use कर रहे हैं) open है?
- **Permission denied (publickey):** `.pem` का पूरा content बिना कटे **EC2_SSH_KEY** में है?
- **cd /path fails:** EC2 पर project वही path पर है जो `EC2_PROJECT_PATH` में दिया (या default path)?
- **deploy-aws-server.sh fail:** EC2 पर हाथ से चला कर error देखें; `backend/.env` और root `.env` (जिसमें `VITE_API_URL` हो) जरूर होने चाहिए।
