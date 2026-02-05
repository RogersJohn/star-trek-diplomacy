import { Routes, Route, Navigate } from 'react-router-dom'
import { SignIn, SignUp, useUser, UserButton } from '@clerk/clerk-react'
import Home from './components/Home'
import Lobby from './components/Lobby'
import Game from './components/Game'

function App() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-space-dark text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space-dark text-white">
      {/* User Button in top right */}
      {isSignedIn && (
        <div className="absolute top-4 right-4 z-50">
          <UserButton afterSignOutUrl="/" />
        </div>
      )}

      <Routes>
        <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
        <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />
        <Route
          path="/"
          element={isSignedIn ? <Home /> : <Navigate to="/sign-in" />}
        />
        <Route
          path="/lobby/:lobbyId"
          element={isSignedIn ? <Lobby /> : <Navigate to="/sign-in" />}
        />
        <Route
          path="/game/:gameId"
          element={isSignedIn ? <Game /> : <Navigate to="/sign-in" />}
        />
      </Routes>
    </div>
  )
}

export default App
