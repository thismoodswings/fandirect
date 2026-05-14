import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '@/App.jsx'
import '@/index.css'
import { queryClientInstance } from '@/lib/query-client'

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClientInstance}>
    <App />
  </QueryClientProvider>
)
