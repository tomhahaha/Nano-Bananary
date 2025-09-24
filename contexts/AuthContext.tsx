import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, AuthResponse, LoginForm, RegisterForm } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginData: LoginForm) => Promise<AuthResponse>;
  register: (registerData: RegisterForm) => Promise<AuthResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token and validate it
    const initAuth = async () => {
      try {
        const token = authService.getToken();
        const storedUser = authService.getStoredUser();
        
        if (token && storedUser) {
          // Validate token with API
          const isValid = await authService.validateToken();
          if (isValid) {
            setUser(storedUser);
          } else {
            // Token is invalid, clear storage
            authService.logout();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (loginData: LoginForm): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const result = await authService.login(loginData);
      
      if (result.success && result.user) {
        setUser(result.user);
      }
      
      return result;
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : '登录失败，请重试' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (registerData: RegisterForm): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const result = await authService.register(registerData);
      
      if (result.success && result.user) {
        setUser(result.user);
      }
      
      return result;
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : '注册失败，请重试' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const result = await authService.getUserProfile();
      if (result.success && result.user) {
        setUser(result.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};