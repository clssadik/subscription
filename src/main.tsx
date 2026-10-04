import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Açılış ekranını (index.html #splash) en az ~1 sn gösterip soldurarak kaldır
const splash = document.getElementById('splash')
if (splash) {
  const wait = Math.max(0, 1000 - performance.now())
  window.setTimeout(() => {
    splash.classList.add('hide')
    window.setTimeout(() => splash.remove(), 400)
  }, wait)
}
