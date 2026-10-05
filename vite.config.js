// import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { execSync } from 'child_process'

// Release do Sentry: SHA do commit (Vercel expõe VERCEL_GIT_COMMIT_SHA no
// build); fallback para o git local; senão null.
function resolveRelease() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch {
    return null;
  }
}
const APP_RELEASE = resolveRelease();

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'info',
  define: {
    __APP_RELEASE__: JSON.stringify(APP_RELEASE),
  },
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
    // Code-splitting (v5.3): o manualChunks antigo jogava todo node_modules
    // restante em "vendor-misc", o que criava chunks circulares
    // (vendor-radix↔vendor-misc, vendor-misc↔vendor-d3) e fazia o entry
    // pré-carregar vendor-pdf (jsPDF) e vendor-recharts em TODA página.
    // Agora só o núcleo React (sempre necessário, muda pouco → cache longo)
    // e libs-folha pesadas sem dependências compartilhadas recebem chunk
    // nomeado; o resto fica com o particionamento automático do Rollup,
    // que agrupa cada lib conforme as rotas (dynamic imports) que a usam.
    // Assim jsPDF/xlsx/three/web-ifc/recharts/d3 só baixam nas rotas que
    // os importam.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          // Supabase SDK: grande e estável — chunk próprio para cache longo
          if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return 'vendor-supabase';
          // 3D / IFC — folhas sem dependências de outras libs; só MontexERP3DPage
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return 'vendor-three';
          if (/[\\/]node_modules[\\/]web-ifc[\\/]/.test(id)) return 'vendor-web-ifc';
          if (/[\\/]node_modules[\\/]xlsx[\\/]/.test(id)) return 'vendor-xlsx';
          return undefined;
        },
      },
    },
  },
});
