// src/config/api.js
// During development (npm start), requests to /api/v1 are proxied to Railway via package.json "proxy"
// In production (Vercel), we will use the full URL directly (assuming CORS is fixed later or Vercel rewrites are used)

// We check if we are running on localhost to enable the proxy
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_URL = isLocalhost
    ? '/api/v1'
    : 'https://api-mvp-production.up.railway.app/api/v1';

export const BASE_URL = isLocalhost
    ? ''
    : 'https://api-mvp-production.up.railway.app';
