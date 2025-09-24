import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n/context';
import { useModal } from '../contexts/ModalContext';
import type { LoginForm } from '../types/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSwitchToRegister }) => {
  const { login } = useAuth();
  const { t } = useTranslation();
  const { setModalOpen } = useModal();
  const [loginType, setLoginType] = useState<'phone' | 'username'>('username');
  const [formData, setFormData] = useState<LoginForm>({
    loginType: 'username',
    identifier: '',
    password: '',
    verificationCode: '',
    captcha: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaImage, setCaptchaImage] = useState<string>('');
  const [countdown, setCountdown] = useState(0);

  // Generate mock captcha
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const captchaText = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 120;
    canvas.height = 40;
    
    // Background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, 120, 40);
    
    // Text
    ctx.fillStyle = '#374151';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(captchaText, 60, 25);
    
    // Noise
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.3)`;
      ctx.fillRect(Math.random() * 120, Math.random() * 40, 2, 2);
    }
    
    setCaptchaImage(canvas.toDataURL());
    return captchaText;
  };

  const captchaRef = useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      captchaRef.current = generateCaptcha();
      setFormData(prev => ({ ...prev, loginType }));
    }
  }, [isOpen, loginType]);

  React.useEffect(() => {
    if (isOpen) {
      setModalOpen(true);
      return () => setModalOpen(false);
    }
  }, [isOpen, setModalOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const sendVerificationCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(formData.identifier)) {
      setError(t('auth.invalidPhone'));
      return;
    }

    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Mock sending verification code
    console.log(t('auth.codeSent'), formData.identifier);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Validate captcha
    if (formData.captcha.toUpperCase() !== captchaRef.current.toUpperCase()) {
      setError(t('auth.incorrectCaptcha'));
      captchaRef.current = generateCaptcha();
      setFormData(prev => ({ ...prev, captcha: '' }));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await login(formData);
      if (result.success) {
        onClose();
        setFormData({
          loginType: 'username',
          identifier: '',
          password: '',
          verificationCode: '',
          captcha: '',
        });
      } else {
        setError(result.message || t('auth.loginFailed'));
        captchaRef.current = generateCaptcha();
        setFormData(prev => ({ ...prev, captcha: '' }));
      }
    } catch (error) {
      setError(t('auth.loginRetry'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[var(--bg-card)] rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--accent-primary)]">{t('auth.login')}</h2>
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Login Type Tabs */}
          <div className="flex mb-6 bg-[var(--bg-secondary)] rounded-lg p-1">
            <button
              type="button"
              onClick={() => setLoginType('username')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                loginType === 'username'
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('auth.usernameLogin')}
            </button>
            <button
              type="button"
              onClick={() => setLoginType('phone')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                loginType === 'phone'
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('auth.phoneLogin')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier Input */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                {loginType === 'phone' ? t('auth.phone') : t('auth.username')}
              </label>
              <input
                type={loginType === 'phone' ? 'tel' : 'text'}
                name="identifier"
                value={formData.identifier}
                onChange={handleInputChange}
                placeholder={loginType === 'phone' ? t('auth.enterPhone') : t('auth.enterUsername')}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-colors"
                required
              />
            </div>

            {/* Password or Verification Code */}
            {loginType === 'username' ? (
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{t('auth.password')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password || ''}
                    onChange={handleInputChange}
                    placeholder={t('auth.enterPassword')}
                    className="w-full px-4 py-3 pr-12 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{t('auth.verificationCode')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="verificationCode"
                    value={formData.verificationCode || ''}
                    onChange={handleInputChange}
                    placeholder={t('auth.enterVerificationCode')}
                    className="flex-1 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={sendVerificationCode}
                    disabled={countdown > 0 || !formData.identifier}
                    className="px-4 py-3 bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-lg hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {countdown > 0 ? `${countdown}s` : t('auth.sendCode')}
                  </button>
                </div>
              </div>
            )}

            {/* Captcha */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{t('auth.captcha')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="captcha"
                  value={formData.captcha}
                  onChange={handleInputChange}
                  placeholder={t('auth.enterCaptcha')}
                  className="flex-1 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => { captchaRef.current = generateCaptcha(); }}
                  className="flex-shrink-0"
                >
                  <img
                    src={captchaImage}
                    alt={t('auth.captcha')}
                    className="h-12 w-30 border border-[var(--border-primary)] rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[var(--text-error)] text-sm bg-[var(--bg-error)] border border-[var(--border-error)] rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-[var(--text-on-accent)] font-semibold rounded-lg shadow-lg hover:from-[var(--accent-primary-hover)] hover:to-[var(--accent-secondary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('auth.loggingIn')}
                </>
              ) : (
                t('auth.login')
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-[var(--text-secondary)]">{t('auth.noAccount')}</span>
            <button
              onClick={onSwitchToRegister}
              className="ml-1 text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] font-medium"
            >
              {t('auth.registerNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;