import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { version } from './package.json';   // ⬅️ import version

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),   // ⬅️ make version available in code
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString().split('T')[0]) // e.g. "2025-08-21"
  }
});