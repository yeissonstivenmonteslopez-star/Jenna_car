import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { getGoogleClientId } from './services/apiClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={getGoogleClientId()}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
