# TODO: تنفيذ الخطة - خاصية عدم النشاط + Env Vars + Mobile Responsive

## الخطوات المتبقية (سيتم تحديثها عند الإنجاز)

### 1. ✅ خطة تمت الموافقة عليها
### 2. إنشاء TODO.md [تم]

### 3. ✅ تعديل server/index.js
   - إضافة POST /api/heartbeat
   - تعديل GET /api/submissions لدعم ?online=true (حساب is_online بناءً على last_heartbeat < 5 دقائق)

### 4. ✅ تعديل api-client.js (مشترك بين الصفحات)
   - إضافة heartbeat كل 30 ثانية + on mousemove/keydown
   - بدء تلقائي عند تحميل الصفحة
   - تضمين client_session_id + page + last_activity

### 5. ✅ تعديل dashboard-separate/dashboard.js
   - دعم refresh(online=true)
   - loadDashboard يستخدم online mode

### 6. ✅ تعديل dashboard-separate/dashboard.css
   - أنماط .status-badge (أخضر/أحمر، responsive)


### 6. تعديل dashboard-separate/dashboard.css
   - أنماط .status-badge (أخضر/أحمر، responsive)

### 7. تحديث CSS للـ Mobile (8 ملفات)
   - login.css, otp.css, otp2.css, address.css, personal.css, card-data.css, watches.css, messege.css
   - تقليل font clamp max، صور أصغر على الهواتف

### 8. اختبار محلي
   - cd server && npm i && npm start
   - فتح صفحات frontend → تحقق heartbeat في dashboard
   - عدم نشاط 5+ دقائق → 'غير متصل'

### 9. نشر على Render + اختبار Env Vars
   - PUBLIC_SITE_URL=https://your-frontend.onrender.com
   - PUBLIC_API_URL=https://your-api.onrender.com (اختياري)

### 10. إنهاء [attempt_completion]

**حالة: جاري التنفيذ خطوة بخطوة**

