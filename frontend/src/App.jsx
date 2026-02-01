import { Routes, Route, Navigate } from 'react-router-dom'
import { SignIn, SignUp, useUser, UserButton } from '@clerk/clerk-react'
import { useDevAuth } from './hooks/useDevAuth'
import Home from './components/Home'
import Lobby from './components/Lobby'
import Game from './components/Game'
import DevSignIn from './components/DevSignIn'

function App({ devMode }) {
  // Use appropriate auth hook based on mode
  const clerkAuth = devMode ? null : useUser();
  const devAuth = devMode ? useDevAuth() : null;

  const isSignedIn = devMode ? devAuth.isSignedIn : clerkAuth?.isSignedIn;
  const isLoaded = devMode ? devAuth.isLoaded : clerkAuth?.isLoaded;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-space-dark text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space-dark text-white">
      {/* User Button in top right (Clerk mode only) */}
      {!devMode && isSignedIn && (
        <div className="absolute top-4 right-4 z-50">
          <UserButton afterSignOutUrl="/" />
        </div>
      )}

      {/* Dev mode indicator and sign out */}
      {devMode && isSignedIn && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
          <span className="text-xs bg-yellow-600 px-2 py-1 rounded">DEV MODE</span>
          <button
            onClick={() => devAuth.signOut()}
            className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
          >
            Sign Out
          </button>
        </div>
      )}

      <Routes>
        {devMode ? (
          // Dev mode routes
          <>
            <Route path="/sign-in" element={<DevSignIn />} />
            <Route
              path="/"
              element={isSignedIn ? <Home devMode={true} /> : <Navigate to="/sign-in" />}
            />
            <Route
              path="/lobby/:lobbyId"
              element={isSignedIn ? <Lobby devMode={true} /> : <Navigate to="/sign-in" />}
            />
            <Route
              path="/game/:gameId"
              element={isSignedIn ? <Game devMode={true} /> : <Navigate to="/sign-in" />}
            />
          </>
        ) : (
          // Clerk mode routes
          <>
            <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
            <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />
            <Route
              path="/"
              element={isSignedIn ? <Home devMode={false} /> : <Navigate to="/sign-in" />}
            />
            <Route
              path="/lobby/:lobbyId"
              element={isSignedIn ? <Lobby devMode={false} /> : <Navigate to="/sign-in" />}
            />
            <Route
              path="/game/:gameId"
              element={isSignedIn ? <Game devMode={false} /> : <Navigate to="/sign-in" />}
            />
          </>
        )}
      </Routes>
    </div>
  )
}

export default App