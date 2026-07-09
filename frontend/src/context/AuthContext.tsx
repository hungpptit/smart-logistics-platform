import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../features/auth/types';
import { CONFIG } from '../config';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    roleCode?: string;
  }) => Promise<{ success: boolean; message: string; errors?: any[] }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const handleSilentRefresh = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        const newToken = resData.data.accessToken;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        
        const profileResponse = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${newToken}`,
          },
        });
        const profileData = await profileResponse.json();
        if (profileResponse.ok && profileData.success) {
          setUser(profileData.data);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Silent token refresh error:', error);
      return false;
    }
  };

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
        } else if (response.status === 401) {
          // Access token expired, attempt silent refresh
          const success = await handleSilentRefresh();
          if (!success) {
            handleLogout();
          }
        } else {
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

  // Silent refresh timer: Runs every 10 minutes if user is logged in
  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(() => {
      console.log('Initiating silent token refresh...');
      handleSilentRefresh();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(intervalId);
  }, [token]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        const newToken = resData.data.accessToken;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(resData.data.user);
        return { success: true, message: 'Đăng nhập thành công!' };
      } else {
        return { success: false, message: resData.message || 'Đăng nhập thất bại.' };
      }
    } catch (error) {
      console.error('Login request error:', error);
      return { success: false, message: 'Không thể kết nối đến máy chủ backend.' };
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
        return { success: true, message: 'Đăng ký tài khoản thành công!' };
      } else {
        return { 
          success: false, 
          message: resData.message || 'Đăng ký tài khoản thất bại.',
          errors: resData.errors 
        };
      }
    } catch (error) {
      console.error('Registration request error:', error);
      return { success: false, message: 'Không thể kết nối đến máy chủ backend.' };
    }
  };

  const handleVerifyOtp = async (email: string, otp: string) => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, otp }),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        const newToken = resData.data.accessToken;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(resData.data.user);
        return { success: true, message: 'Xác thực OTP và đăng nhập thành công!' };
      } else {
        return { success: false, message: resData.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.' };
      }
    } catch (error) {
      console.error('OTP Verification request error:', error);
      return { success: false, message: 'Không thể kết nối đến máy chủ backend.' };
    }
  };

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    try {
      if (!token) {
        return { success: false, message: 'Bạn chưa đăng nhập.' };
      }

      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        return { success: true, message: 'Đổi mật khẩu thành công!' };
      } else {
        return { success: false, message: resData.message || 'Đổi mật khẩu thất bại.' };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: 'Không thể kết nối đến máy chủ backend.' };
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch(`${CONFIG.API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Failed to logout on server:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        verifyOtp: handleVerifyOtp,
        changePassword: handleChangePassword,
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
