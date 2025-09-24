import type { 
  LoginForm, 
  RegisterForm, 
  AuthResponse, 
  CaptchaResponse, 
  VerificationCodeResponse,
  User,
  CreditTransaction,
  ChargeOrder
} from '../types/auth';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-api.com/api' 
  : 'http://localhost:3001/api';

class AuthService {
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('auth_token');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async login(loginData: LoginForm): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      if (response.success && response.token) {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('current_user', JSON.stringify(response.user));
      }

      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '登录失败'
      };
    }
  }

  async register(registerData: RegisterForm): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerData),
      });

      if (response.success && response.token) {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('current_user', JSON.stringify(response.user));
      }

      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '注册失败'
      };
    }
  }

  async sendVerificationCode(phone: string, type: 'login' | 'register'): Promise<VerificationCodeResponse> {
    try {
      const response = await this.makeRequest<VerificationCodeResponse>('/auth/send-verification-code', {
        method: 'POST',
        body: JSON.stringify({ phone, type }),
      });

      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '发送验证码失败'
      };
    }
  }

  async getUserProfile(): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; user: User }>('/user/profile');
      
      // 更新localStorage中的用户信息
      if (response.success && response.user) {
        localStorage.setItem('current_user', JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '获取用户信息失败'
      };
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
  }

  async validateToken(): Promise<boolean> {
    try {
      const response = await this.getUserProfile();
      return response.success;
    } catch (error) {
      return false;
    }
  }

  getStoredUser(): User | null {
    try {
      const storedUser = localStorage.getItem('current_user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getStoredUser();
  }

  // 积分相关 API
  async consumeCredits(amount: number, description: string): Promise<{ success: boolean; message?: string; balance?: number }> {
    try {
      const response = await this.makeRequest<{ success: boolean; balance: number }>('/credits/consume', {
        method: 'POST',
        body: JSON.stringify({ amount, description }),
      });
      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '积分消费失败'
      };
    }
  }

  async getCreditTransactions(): Promise<{ success: boolean; data?: CreditTransaction[]; transactions?: CreditTransaction[]; message?: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; data?: CreditTransaction[]; transactions?: CreditTransaction[] }>('/credits/transactions');
      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '获取积分明细失败'
      };
    }
  }

  async createChargeOrder(amount: number, credits: number, paymentMethod: 'alipay' | 'wechat'): Promise<{ success: boolean; orderId?: string; paymentUrl?: string; qrCodeUrl?: string; message?: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; orderId: string; paymentUrl?: string; qrCodeUrl?: string }>('/credits/charge', {
        method: 'POST',
        body: JSON.stringify({ amount, credits, paymentMethod }),
      });
      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '创建充值订单失败'
      };
    }
  }

  async getOrderStatus(orderId: string): Promise<{ success: boolean; order?: any; message?: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; order: any }>(`/payment/order/${orderId}`);
      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '查询订单状态失败'
      };
    }
  }

  async updateUserProfile(userData: { username?: string; phone?: string }): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; user: User }>('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      
      if (response.success && response.user) {
        localStorage.setItem('current_user', JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '更新用户信息失败'
      };
    }
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>('/user/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '修改密码失败'
      };
    }
  }
}

export const authService = new AuthService();