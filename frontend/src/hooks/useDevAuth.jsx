/**
 * Dev Mode Authentication Context
 * Provides a mock Clerk-like API for local testing without authentication
 */

import { createContext, useContext, useState, useEffect } from 'react';

const DevAuthContext = createContext(null);

export function DevAuthProvider({ children }) {
  const [devUser, setDevUser] = useState(() => {
    const stored = localStorage.getItem('dev_user');
    return stored ? JSON.parse(stored) : null;
  });

  const signIn = (userId, name) => {
    const user = {
      id: userId,
      firstName: name,
      username: name,
    };
    localStorage.setItem('dev_user', JSON.stringify(user));
    setDevUser(user);
  };

  const signOut = () => {
    localStorage.removeItem('dev_user');
    setDevUser(null);
  };

  // Add getToken function after hydration from localStorage
  const user = devUser ? {
    ...devUser,
    getToken: async () => 'dev-token',
  } : null;

  return (
    <DevAuthContext.Provider value={{
      user,
      isSignedIn: !!devUser,
      isLoaded: true,
      signIn,
      signOut,
    }}>
      {children}
    </DevAuthContext.Provider>
  );
}

export function useDevAuth() {
  const context = useContext(DevAuthContext);
  if (!context) {
    throw new Error('useDevAuth must be used within DevAuthProvider');
  }
  return context;
}

// Check if we're in dev mode
export const isDevMode = () => {
  return import.meta.env.VITE_DEV_MODE === 'true' || !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
};
