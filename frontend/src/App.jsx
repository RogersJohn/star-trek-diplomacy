import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react'
import Home from './components/Home'
import Lobby from './components/Lobby'
import Game from './components/Game'
import MapDemo from './components/MapDemo'

function AuthenticatedApp() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-space-dark text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space-dark text-white">
      <SignedIn>
        <div className="absolute top-4 right-4 z-50">
          <UserButton />
        </div>
      </SignedIn>

      <SignedOut>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-4xl font-bold text-lcars-orange mb-8">Star Trek Diplomacy</h1>
          <p className="text-xl mb-8">Sign in to start playing</p>
          <SignInButton mode="modal">
            <button className="lcars-button text-xl px-8 py-4">
              Sign In
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby/:lobbyId" element={<Lobby />} />
          <Route path="/game/:gameId" element={<Game />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </SignedIn>
    </div>
  )
}

function App() {
  const location = useLocation();

  if (location.pathname === '/map-demo') {
    return <MapDemo />
  }

  return <AuthenticatedApp />
}

export default App
