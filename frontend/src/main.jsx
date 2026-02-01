import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { DevAuthProvider } from './hooks/useDevAuth'
import App from './App'
import './index.css'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const devMode = import.meta.env.VITE_DEV_MODE === 'true' || !clerkPubKey;

if (devMode) {
  console.log('Running in DEV MODE - Authentication disabled');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {devMode ? (
        <DevAuthProvider>
          <App devMode={true} />
        </DevAuthProvider>
      ) : (
        <ClerkProvider publishableKey={clerkPubKey}>
          <App devMode={false} />
        </ClerkProvider>
      )}
    </BrowserRouter>
  </React.StrictMode>
)