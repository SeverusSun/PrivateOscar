import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import './index.css'
import App from './App.tsx'
import { StoreProvider } from './store.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <App />
        <Toaster position="top-center" richColors />
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
)
