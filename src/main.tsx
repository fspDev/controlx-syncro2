import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // SW unificado: instalabilidad PWA + notificaciones FCM. Un solo SW en el
    // scope evita que un push llegue a un worker sin handler de notificaciones.
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}firebase-messaging-sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(console.error)
  })
}
