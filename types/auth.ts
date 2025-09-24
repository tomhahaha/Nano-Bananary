export interface User {
  id: string;
  username: string;
  phone: string;
  email?: string;
  avatar?: string;
  credits: number; // 用户积分
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'charge' | 'consume' | 'refund'; // 充值、消费、退款
  amount: number; // 积分变动数量
  balance: number; // 变动后余额
  description: string; // 交易描述
  orderId?: string; // 订单号（充值时）
  createdAt: string; // 修改为字符串类型，匹配后端返回的格式
}

export interface ChargeOrder {
  id: string;
  userId: string;
  amount: number; // 充值金额（元）
  credits: number; // 获得积分
  paymentMethod: 'alipay' | 'wechat'; // 支付方式
  status: 'pending' | 'paid' | 'failed' | 'cancelled'; // 订单状态
  createdAt: Date;
  paidAt?: Date;
}

export interface ChargePackage {
  id: string;
  name: string;
  amount: number; // 金额（元）
  credits: number; // 积分
  isCustom?: boolean; // 是否自定义
}

export interface RegisterForm {
  username: string;
  phone: string;
  password: string;
  confirmPassword: string;
  captcha: string;
}

export interface LoginForm {
  loginType: 'phone' | 'username';
  identifier: string; // phone number or username
  password?: string;
  verificationCode?: string;
  captcha?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface CaptchaResponse {
  success: boolean;
  captchaImage?: string;
  captchaId?: string;
  message?: string;
}

export interface VerificationCodeResponse {
  success: boolean;
  message?: string;
}