import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3010,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5010',
        changeOrigin: true,
      },
      '/data': {
        target: 'http://127.0.0.1:5010',
        changeOrigin: true,
      },
      // /storage is served by the AI service (FastAPI) on port 8001
      // It hosts formula crop images, snips, OMR images, etc.
      '/storage': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
});

