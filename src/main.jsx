import React from 'react'
window.__MX_BUILD="MARK95de261";
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { NotificationProvider } from '@/contexts/NotificationContext'
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
