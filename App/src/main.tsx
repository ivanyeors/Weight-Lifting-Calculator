import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthCallbackHandler } from '@/auth/AuthCallbackHandler'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthCallbackHandler />
    <App />
  </StrictMode>,
)
