// api-config.js - قم بتحديث SERVER_URL بـ domain الخادم (Render/Fly/Heroku)
// مثال: const SERVER_URL = 'https://your-api.onrender.com';
const SERVER_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:3000'
    : 'https://servv-jjc6.onrender.com';

// حقن للمتصفح عند الحاجة (استضافة منفصلة)
window.API_BASE_URL = SERVER_URL;
// يجب أن يطابق DEFAULT_APP_KEY على الخادم؛ أحرف ASCII فقط (لا علامات اقتباس ذكية).
window.API_APP_KEY = 'Mohaa';

// مساعد URL للـ dashboard المنفصل
window.resolveYasmeenApiUrl = function(relPath) {
    return SERVER_URL.replace(/\/$/, '') + '/' + (relPath || '').replace(/^\//, '');
};

function getApiBase() {
    return window.API_BASE_URL || '';
}

function getApiHeaders(extra) {
    return Object.assign({}, extra || {}, {
        'x-app-key': window.API_APP_KEY || ''
    });
}

