import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App'
import ErrorBoundary from '@/components/ErrorBoundary'
import { apiUrl } from '@/lib/apiAuth'
import '@/i18n/i18n'
import './index.css'

if (import.meta.env.DEV) {
  // Never logs the token's value — only whether one is present. A native build bakes
  // VITE_* vars into the bundle at `vite build` time; a missing VITE_APP_API_TOKEN here
  // means every /api/* call from this build will 401. See docs/deploy.md "Native build
  // environment" for the full checklist.
  console.log(
    `[myJungle] startup diagnostics: native=${Capacitor.isNativePlatform()}, ` +
      `apiBaseUrl="${apiUrl('/api')}", ` +
      `VITE_APP_API_TOKEN=${(import.meta.env.VITE_APP_API_TOKEN as string | undefined)?.trim() ? 'present' : 'MISSING'}`,
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
