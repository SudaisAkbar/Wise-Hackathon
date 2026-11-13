import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the interface runs on :5173 and talks to the API on :3000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // the client imports parsers from ../shared
    fs: { allow: ['..'] },
    proxy: { '/api': 'http://localhost:3000' }
  }
});
