import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // proxy: { // Example proxy, if backend is on a different origin
    //   '/api': {
    //     target: 'http://localhost:3000',
    //     changeOrigin: true,
    //     secure: false,
    //   },
    // },
  },
  define: {
    // Inject environment variables into the client-side code
    'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:3000/api'),
  },
});
```