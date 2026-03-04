// import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'info',
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'web-ifc': path.resolve(__dirname, './node_modules/web-ifc/web-ifc-api.js'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
  },
});
