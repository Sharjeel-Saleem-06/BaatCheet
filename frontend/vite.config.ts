import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend URL - use environment variable or fallback to HuggingFace deployment
const BACKEND_URL = process.env.VITE_API_URL || 'https://sharry00010-baatcheet-backend.hf.space';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('Proxy error - trying production backend');
            // Silently handle errors - the frontend will use production API
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying:', req.method, req.url, '→', BACKEND_URL);
          });
        },
      },
    },
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(BACKEND_URL),
  },
});
