import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../features/auth/types';
import { CONFIG } from '../config';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    roleCode?: string;
  }) => Promise<{ success: boolean; message: string; errors?: any[] }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          setUser(resData.data);
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (error) {
        console.error('Failed to load user profile on startup:', error);
        // Keep token but stop loading if server is offline
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [token]);

  const handleLogin = async (usernameOrEmail: string, password: string) => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        const newToken = resData.data.token;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(resData.data.user);
        return { success: true, message: 'Logged in successfully!' };
      } else {
        return { success: false, message: resData.message || 'Login failed.' };
      }
    } catch (error) {
      console.error('Login request error:', error);
      return { success: false, message: 'Cannot connect to backend server.' };
    }
  };

  const handleRegister = async (data: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    roleCode?: string;
  }) => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        return { success: true, message: 'Registration successful!' };
      } else {
        return { 
          success: false, 
          message: resData.message || 'Registration failed.',
          errors: resData.errors 
        };
      }
    } catch (error) {
      console.error('Registration request error:', error);
      return { success: false, message: 'Cannot connect to backend server.' };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
