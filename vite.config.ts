import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
    server: {
      host: true,
      port: 4000,
      hmr: {
        host: 'dev.blue-pill.ai',
        port: 4001,           // The public port your browser connects to
        protocol: 'ai',       // Or 'wss' if using HTTPS
        clientPort: 4001      // Ensures the client connects to the right port
      }
    }  
});
