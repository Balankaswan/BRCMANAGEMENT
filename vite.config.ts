import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow access from other devices on the network (LAN mode)
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
