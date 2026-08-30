import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { registraServiceWorker } from './lib/notifiche'

// Il worker si registra all'avvio, in silenzio: il permesso si chiede
// dopo, all'ingresso in partita. Fuori da React per non rifarlo a ogni
// montaggio, e due volte per via di StrictMode.
registraServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
