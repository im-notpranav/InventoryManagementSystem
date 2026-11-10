import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Transform the entry, shell and login files as soon as the dev server starts,
    // so the first page load does not wait for them one request at a time.
    warmup: {
      clientFiles: [
        './src/main.jsx',
        './src/App.jsx',
        './src/router.jsx',
        './src/pages/auth/Login.jsx',
        './src/components/DashboardLayout.jsx',
        './src/components/Sidebar.jsx',
        './src/components/Topbar.jsx',
        './src/pages/dashboard/Dashboard.jsx',
      ],
    },
  },
  // Pre-bundle every dependency up front. Otherwise Vite finds some only when a
  // lazy page first imports them, re-optimises and reloads the whole page.
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', 'axios', 'lucide-react', 'motion/react', 'zustand'],
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['motion'],
        },
      },
    },
  },
});
