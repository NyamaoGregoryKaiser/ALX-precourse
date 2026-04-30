```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5000', // Ensure this matches your backend service
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'), // Keep /api prefix
      },
    },
  },
});
```