import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const UPDATE_READY = 'antojitos:update-ready' // listened to in App.jsx

// The service worker keeps the app openable without signal (see sw/service-worker.js).
// A new deploy installs a new worker; the open page is told so it can offer a reload,
// since it keeps running the old code until then.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return
    window.antojitosUpdateReady = true
    window.dispatchEvent(new Event(UPDATE_READY))
  })
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').then(registration => {
    const check = () => registration.update().catch(() => {})
    setInterval(check, 30 * 60 * 1000)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
  }).catch(console.error))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
