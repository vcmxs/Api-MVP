const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        '/api/v1',
        createProxyMiddleware({
            target: 'https://api-mvp-production.up.railway.app/api/v1',
            changeOrigin: true,
            secure: false,
            headers: {
                Origin: 'http://localhost:3000'
            }
        })
    );
};
