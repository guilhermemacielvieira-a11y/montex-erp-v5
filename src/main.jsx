import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { initMonitoring } from '@/lib/monitoring'
if (typeof window !== "undefined") window.__MONTEX_VERSION = "2.1.1";
// Sentry: só inicializa quando VITE_SENTRY_DSN existe (no-op caso contrário).
// O SDK é carregado sob demanda para não pesar no bundle inicial.
initMonitoring();
import App from '@/App.jsx'
import '@/index.css'
import '@/i18n'

// ERP desktop é dark-first: default 'dark' (antes 'system' deixava os componentes
// ui/* — Card/Tabs/etc. — claros quando o SO estava em modo claro). Toggle continua.
ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </ThemeProvider>
)
