import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import './index.css'
import App from './App.tsx'
import { StoreProvider } from './store.tsx'
import { CommunityAuthProvider } from '@/lib/communityAuth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <CommunityAuthProvider>
          <App />
          <Toaster position="bottom-center" richColors duration={2000} />
        </CommunityAuthProvider>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
)
