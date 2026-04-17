// api-config.js - قم بتحديث SERVER_URL بـ domain الخادم (Render/Fly/Heroku)
// مثال: const SERVER_URL = 'https://your-api.onrender.com';
const SERVER_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:3000'
    : 'https://servv-jjc6.onrender.com';

// حقن للمتصفح عند الحاجة (استضافة منفصلة)) 
function getApiHeaders(extra) {
    return Object.assign({}, extra || {}, {
        'x-app-key': window.API_APP_KEY || ''
    });
}

