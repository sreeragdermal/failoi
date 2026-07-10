import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, setAccessToken } from '../services/api.js';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  isImpersonated?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<any>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  returnFromImpersonation: () => Promise<void>;
  verify2FALogin: (tempToken: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth state on mount (silent refresh)
  const checkAuth = async () => {
    try {
      const data = await apiRequest('/auth/refresh', { method: 'POST' });
      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch (err) {
      // Not logged in or expired
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // Listen for custom event triggered by api client on session expiration
    const handleAuthExpired = () => {
      setUser(null);
      setAccessToken(null);
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe }),
      });
      if (data.status === '2FA_REQUIRED') {
        return data;
      }
      setAccessToken(data.accessToken);
      setUser(data.user);
      return data;
    } catch (err) {
      setAccessToken(null);
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    setLoading(true);
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      await login(email, password);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setAccessToken(null);
      setUser(null);
      setLoading(false);
    }
  };

  const returnFromImpersonation = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/admin/impersonate/return', { method: 'POST' });
      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch (err) {
      console.error('Failed to revert to admin session:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verify2FALogin = async (tempToken: string, code: string) => {
    setLoading(true);
    try {
      const data = await apiRequest('/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({ tempToken, code }),
      });
      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch (err) {
      setAccessToken(null);
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth, returnFromImpersonation, verify2FALogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
