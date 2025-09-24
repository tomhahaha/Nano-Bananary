import React, { useState } from 'react';
import { useTranslation } from '../i18n/context';
import { authService } from '../services/authService';

interface ForgotPasswordProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ isOpen, onClose, onBackToLogin }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'phone' | 'verify' | 'success'>('phone');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  React.useEffect(() => {
    if (!isOpen) {
      // 重置状态
      setStep('phone');
      setPhone('');
      setVerificationCode('');
      setNewPassword('');
      setConfirmPassword('');
      setCountdown(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendCode = async () => {
    if (!phone) {
      alert('请输入手机号');
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      alert('请输入正确的手机号');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.sendForgotPasswordCode(phone);
      if (result.success) {
        alert(result.message || '验证码已发送');
        if (result.code) {
          console.log('开发环境验证码:', result.code);
        }
        setStep('verify');
        setCountdown(60);
      } else {
        alert(result.message || '发送验证码失败');
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      alert('发送验证码失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!verificationCode) {
      alert('请输入验证码');
      return;
    }

    if (!newPassword) {
      alert('请输入新密码');
      return;
    }

    if (newPassword.length < 6) {
      alert('密码长度不能少于6位');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.resetPassword(phone, verificationCode, newPassword);
      if (result.success) {
        alert(result.message || '密码重置成功');
        setStep('success');
      } else {
        alert(result.message || '密码重置失败');
      }
    } catch (error) {
      console.error('密码重置失败:', error);
      alert('密码重置失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    onClose();
    onBackToLogin();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[var(--bg-card)] rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--accent-primary)]">忘记密码</h2>
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 步骤 1: 输入手机号 */}
          {step === 'phone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  手机号
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入注册时使用的手机号"
                  className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                />
              </div>
              
              <button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] py-3 px-4 rounded-lg font-medium hover:bg-[var(--accent-primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '发送中...' : '发送验证码'}
              </button>
              
              <button
                onClick={handleBackToLogin}
                className="w-full text-[var(--text-secondary)] py-2 hover:text-[var(--accent-primary)] transition-colors"
              >
                返回登录
              </button>
            </div>
          )}

          {/* 步骤 2: 验证码和新密码 */}
          {step === 'verify' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  验证码
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="请输入验证码"
                    className="flex-1 px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  />
                  <button
                    onClick={handleSendCode}
                    disabled={countdown > 0 || loading}
                    className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {countdown > 0 ? `${countdown}s` : '重发'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  新密码
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码（至少6位）"
                  className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  确认新密码
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                />
              </div>
              
              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] py-3 px-4 rounded-lg font-medium hover:bg-[var(--accent-primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '重置中...' : '重置密码'}
              </button>
              
              <button
                onClick={() => setStep('phone')}
                className="w-full text-[var(--text-secondary)] py-2 hover:text-[var(--accent-primary)] transition-colors"
              >
                返回上一步
              </button>
            </div>
          )}

          {/* 步骤 3: 成功 */}
          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">密码重置成功</h3>
              <p className="text-[var(--text-secondary)]">请使用新密码登录</p>
              
              <button
                onClick={handleBackToLogin}
                className="w-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] py-3 px-4 rounded-lg font-medium hover:bg-[var(--accent-primary)]/90 transition-colors"
              >
                去登录
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;