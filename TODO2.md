# TODO2: تحسين "تسجيل خروج جميع الأجهزة"

## الخطة الجديدة

**Server:**
- GET /api/admin/dashboard-auth/epoch → {epoch, last_change_time}
- POST /api/admin/dashboard-auth/revoke-all → set pending_revoke_notice + timestamp

**Dashboard JS:**
- localStorage.session_epoch, last_login_time
- checkPassword(): poll epoch, if mismatch → show "تم تغيير قبل X دقائق"
- ensureAdminSession(): periodic poll, reload if changed
- adminChangePasswordSubmit(): if revokeAll → local reload after save

**HTML:** login modal + warning div

**1. Fix dashboard.js corruption**
**2. Add epoch logic**
**3. Test**

