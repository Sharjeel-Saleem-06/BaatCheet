import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use the HuggingFace deployed backend
const BACKEND_URL = 'https://sharry121-baatcheet.hf.space';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path, // Keep the path as-is
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying:', req.method, req.url, '→', BACKEND_URL + req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Response:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  define: {
    // Make the backend URL available to the app
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify(BACKEND_URL),
  },
});
