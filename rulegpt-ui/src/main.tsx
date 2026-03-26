import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppErrorBoundary } from '@/components/app/AppErrorBoundary'
import { installGlobalErrorHandlers } from '@/lib/monitoring'
import './index.css'
import App from './App'

const queryClient = new QueryClient()
installGlobalErrorHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AppErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)
