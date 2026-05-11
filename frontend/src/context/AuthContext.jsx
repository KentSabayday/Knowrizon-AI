import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount and validate token
  useEffect(() => {
    const validateSession = async () => {
      const storedToken = localStorage.getItem('knowrizon_token');
      const storedUser = localStorage.getItem('knowrizon_user');
      const storedIsAnonymous = localStorage.getItem('knowrizon_anonymous');

      if (storedToken && storedUser) {
        // Validate token by making a test API call
        try {
          const response = await fetch(`${API_BASE}/auth/validate`, {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });

          if (response.ok) {
            // Token is valid
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setIsAnonymous(storedIsAnonymous === 'true');
          } else {
            // Token is invalid, clear session
            console.log('Session expired or invalid, clearing...');
            localStorage.removeItem('knowrizon_token');
            localStorage.removeItem('knowrizon_user');
            localStorage.removeItem('knowrizon_anonymous');
          }
        } catch (err) {
          // Network error or server down, try to use cached session
          console.warn('Could not validate session:', err);
          // Clear session to be safe
          localStorage.removeItem('knowrizon_token');
          localStorage.removeItem('knowrizon_user');
          localStorage.removeItem('knowrizon_anonymous');
        }
      }
      setIsLoading(false);
    };

    validateSession();
  }, []);

  const saveSession = (userData, sessionToken, anonymous = false) => {
    localStorage.setItem('knowrizon_token', sessionToken);
    localStorage.setItem('knowrizon_user', JSON.stringify(userData));
    localStorage.setItem('knowrizon_anonymous', String(anonymous));
    setToken(sessionToken);
    setUser(userData);
    setIsAnonymous(anonymous);
  };

  const clearSession = () => {
    localStorage.removeItem('knowrizon_token');
    localStorage.removeItem('knowrizon_user');
    localStorage.removeItem('knowrizon_anonymous');
    setToken(null);
    setUser(null);
    setIsAnonymous(false);
  };

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
