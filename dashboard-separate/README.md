# لوحة التحكم المنفصلة (Dashboard Separate)

## 🎯 الغرض
- **استضافة منفصلة تماماً** عن الفرونت إند (www.yasmeen.com ← admin.yasmeen.com)
- **الـ API مشترك** (server/index.js → your-api.onrender.com) - البيانات تتدفق كما هي
- **الصوت جاهز** - يرن تلقائياً عند أي تسجيل جديد/حركة مستخدم (Web Audio)

## 🚀 التشغيل المحلي (اختبار)
1. شغّل الخادم: `cd server && npm install && npm start` (port 3000)
2. افتح dashboard: `npx live-server dashboard-separate` (port 8080)
3. سجّل من frontend → الصوت يرن في dashboard!

## 🌐 الاستضافة الإنتاج
### 1. الفرونت إند (النماذج)
```
Netlify.com / Vercel → www.yasmeen.com
- رفع كل الملفات عدا dashboard-separate/
- تحديث api-config.js → SERVER_URL = 'https://api.yasmeen.com'
```

### 2. الداشبورد (منفصل)
```
Netlify.com / Vercel → admin.yasmeen.com
- رفع مجلد dashboard-separate/
- تحديث dashboard-separate/api-config.js → SERVER_URL = 'https://api.yasmeen.com'
```

### 3. الخادم (API مشترك)
```
Render.com / Fly.io → api.yasmeen.com
- رفع مجلد server/
- .env:
  MONGODB_URI=mongodb+srv://...
  DASHBOARD_ADMIN_PASSWORD=your-strong-password
  PUBLIC_SITE_URL=www.yasmeen.com,admin.yasmeen.com
  PUBLIC_API_URL=https://api.yasmeen.com
```

## ✅ التحقق
1. Frontend → تسجيل → بيانات في الـ API
2. Dashboard → تحديث تلقائي (1.5s) + صوت + إشعار
3. **كلمة مرور الداشبورد الافتراضية:** `qqwe@22` (غيّرها!)

## 🔧 api-config.js (مهم!)
```
const SERVER_URL = 'https://api.yasmeen.com';  // خادمك!
```

## 🎵 الصوت
- **يعمل بدون ملفات** (Web Audio API)
- **يرن عند:** تسجيل جديد، حركة مستخدم، أي /api/submissions جديد
- **تلقائي** من checkNewSubmissionsAfterRefresh()

**تم الفصل بنجاح - جاهز للاستضافة المنفصلة!**

