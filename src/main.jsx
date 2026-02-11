import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { NotificationProvider } from '@/contexts/NotificationContext'
import App from '@/App.jsx'
import '@/index.css'
import '@/i18n'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </ThemeProvider>
)
