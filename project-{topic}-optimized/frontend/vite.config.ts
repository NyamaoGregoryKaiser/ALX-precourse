import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite configuration for the React frontend application.
 * Configures React plugin, path aliases, and development server settings.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Setup alias for easier imports
    },
  },
  server: {
    port: 5173, // Frontend development server port
    proxy: {
      // Proxy API requests to the backend server
      '/api/v1': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3000', // Default backend URL
        changeOrigin: true, // Needed for virtual hosted sites
        rewrite: (path) => path.replace(/^\/api\/v1/, '/api/v1'), // Ensure correct prefix
      },
    },
  },
});