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
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
  },
  build: {
    // Code-splitting de vendors pesados. Isso reduz o chunk inicial (index-*.js)
    // de ~1.3MB para ~600KB e permite que rotas que não usam Three.js/charts/etc
    // não baixem esses bundles. TTI menor em mobile e desktop.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Core framework — sempre necessário
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]node_modules[\\/]react-router/.test(id)) return 'vendor-router';
          // 3D / IFC — só usado em MontexERP3DPage
          if (/[\\/]node_modules[\\/](three|web-ifc)/.test(id)) return 'vendor-three';
          // Charts — usado em vários dashboards
          if (/[\\/]node_modules[\\/]recharts/.test(id)) return 'vendor-recharts';
          if (/[\\/]node_modules[\\/]chart\.js/.test(id)) return 'vendor-chartjs';
          if (/[\\/]node_modules[\\/]d3/.test(id)) return 'vendor-d3';
          // PDF / Excel — usado em exports e importações
          if (/[\\/]node_modules[\\/](jspdf|html2canvas|html2pdf)/.test(id)) return 'vendor-pdf';
          if (/[\\/]node_modules[\\/](xlsx|exceljs|sheetjs)/.test(id)) return 'vendor-xlsx';
          // Supabase / data
          if (/[\\/]node_modules[\\/](@supabase|@tanstack)/.test(id)) return 'vendor-data';
          // Animation
          if (/[\\/]node_modules[\\/]framer-motion/.test(id)) return 'vendor-motion';
          // UI primitivas (Radix + lucide + dnd)
          if (/[\\/]node_modules[\\/]@radix-ui/.test(id)) return 'vendor-radix';
          if (/[\\/]node_modules[\\/](lucide-react|@hello-pangea|react-dnd|react-day-picker|react-hot-toast|react-quill|embla-carousel)/.test(id)) return 'vendor-ui';
          // Restante (lodash, utils etc): bundle padrão de vendor
          return 'vendor-misc';
        },
      },
    },
  },
});
