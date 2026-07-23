import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../lib/api';

const AuthContext = createContext(null);

/**
 * Storage abstraction: registered users use localStorage (persists across tabs/sessions),
 * anonymous users use sessionStorage (destroyed when the tab closes).
 */
const STORAGE_KEYS = {
  token: 'knowrizon_token',
  user: 'knowrizon_user',
  anonymous: 'knowrizon_anonymous',
};

function getStorage(anonymous) {
  return anonymous ? sessionStorage : localStorage;
}

function readStoredSession() {
  // Try localStorage first (registered users)
  let store = localStorage;
  let storedToken = store.getItem(STORAGE_KEYS.token);
  let storedUser = store.getItem(STORAGE_KEYS.user);
  let storedIsAnonymous = store.getItem(STORAGE_KEYS.anonymous);

  // Fall back to sessionStorage (anonymous users)
  if (!storedToken || !storedUser) {
    store = sessionStorage;
    storedToken = store.getItem(STORAGE_KEYS.token);
    storedUser = store.getItem(STORAGE_KEYS.user);
    storedIsAnonymous = store.getItem(STORAGE_KEYS.anonymous);
  }

  return { storedToken, storedUser, storedIsAnonymous };
}

function clearAllStorages() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs to access current state inside event listeners without stale closures
  const tokenRef = useRef(token);
  const isAnonymousRef = useRef(isAnonymous);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { isAnonymousRef.current = isAnonymous; }, [isAnonymous]);

  // Check for existing session on mount and validate token
  useEffect(() => {
    const validateSession = async () => {
      const { storedToken, storedUser, storedIsAnonymous } = readStoredSession();

      if (storedToken && storedUser) {
        try {
          const response = await fetch(`${API_BASE}/auth/validate`, {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });

          if (response.ok) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setIsAnonymous(storedIsAnonymous === 'true');
          } else {
            console.log('Session expired or invalid, clearing...');
            clearAllStorages();
          }
        } catch (err) {
          console.warn('Could not validate session:', err);
          clearAllStorages();
        }
      }
      setIsLoading(false);
    };

    validateSession();
  }, []);

  // Destroy anonymous session when the browser tab is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isAnonymousRef.current && tokenRef.current) {
        // Use sendBeacon for reliable fire-and-forget logout on tab close
        const logoutUrl = `${API_BASE}/auth/logout`;
        const payload = JSON.stringify({ token: tokenRef.current });
        navigator.sendBeacon(logoutUrl, new Blob([payload], { type: 'application/json' }));

        // Clear session storage immediately
        clearAllStorages();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const saveSession = useCallback((userData, sessionToken, anonymous = false) => {
    const store = getStorage(anonymous);
    store.setItem(STORAGE_KEYS.token, sessionToken);
    store.setItem(STORAGE_KEYS.user, JSON.stringify(userData));
    store.setItem(STORAGE_KEYS.anonymous, String(anonymous));
    setToken(sessionToken);
    setUser(userData);
    setIsAnonymous(anonymous);
  }, []);

  const clearSession = useCallback(() => {
    clearAllStorages();
    setToken(null);
    setUser(null);
    setIsAnonymous(false);
  }, []);

  const register = async (email, password, name) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      saveSession(data.user, data.token, false);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      saveSession(data.user, data.token, false);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const continueAnonymously = async () => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/anonymous`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create anonymous session');
      }

      saveSession(data.user, data.sessionId, true);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        // Ignore logout errors, clear session anyway
      }
    }
    clearSession();
  };

  const value = {
    user,
    token,
    isAnonymous,
    isLoading,
    isAuthenticated: !!user,
    error,
    register,
    login,
    continueAnonymously,
    logout,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
