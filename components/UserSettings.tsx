import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n/context';
import { useModal } from '../contexts/ModalContext';
import { authService } from '../services/authService';

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UpdateProfileForm {
  username: string;
  phone: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const UserSettings: React.FC<UserSettingsProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const { setModalOpen } = useModal();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [form, setForm] = useState<UpdateProfileForm>({
    username: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<UpdateProfileForm>>({});

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        username: user.username,
        phone: user.phone,
      }));
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Partial<UpdateProfileForm> = {};

    if (activeTab === 'profile') {
      if (!form.username.trim()) {
        newErrors.username = t('creditSystem.validationErrors.usernameRequired');
      } else if (form.username.length < 2) {
        newErrors.username = t('creditSystem.validationErrors.usernameMinLength');
      }

      if (!form.phone.trim()) {
        newErrors.phone = t('creditSystem.validationErrors.phoneRequired');
      } else if (!/^1[3-9]\d{9}$/.test(form.phone)) {
        newErrors.phone = t('creditSystem.validationErrors.phoneInvalid');
      }
    }

    if (activeTab === 'password') {
      if (!form.currentPassword) {
        newErrors.currentPassword = t('creditSystem.validationErrors.currentPasswordRequired');
      }

      if (!form.newPassword) {
        newErrors.newPassword = t('creditSystem.validationErrors.newPasswordRequired');
      } else if (form.newPassword.length < 6) {
        newErrors.newPassword = t('creditSystem.validationErrors.newPasswordMinLength');
      }

      if (form.newPassword !== form.confirmPassword) {
        newErrors.confirmPassword = t('creditSystem.validationErrors.passwordMismatch');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      let endpoint = '';
      let body = {};

      if (activeTab === 'profile') {
        endpoint = '/api/user/profile';
        body = {
          username: form.username,
          phone: form.phone,
        };
      } else {
        endpoint = '/api/user/password';
        body = {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        };
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        alert(activeTab === 'profile' ? t('creditSystem.profileUpdateSuccess') : t('creditSystem.passwordUpdateSuccess'));
        
        if (activeTab === 'profile') {
          // 刷新用户信息
          await refreshUser();
        } else {
          // 清空密码字段
          setForm(prev => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          }));
        }
      } else {
        alert(result.message || t('creditSystem.updateFailed'));
      }
    } catch (error) {
      console.error('更新失败:', error);
      alert(t('creditSystem.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof UpdateProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      setModalOpen(true);
      return () => setModalOpen(false);
    }
  }, [isOpen, setModalOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[var(--bg-card)] rounded-xl shadow-2xl w-full max-w-md max-h-[75vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--accent-primary)]">{t('creditSystem.settingsTitle')}</h2>
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        {/* 标签页 */}
        <div className="flex border-b border-[var(--border-primary)] mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'profile'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t('creditSystem.profileTab')}
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'password'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t('creditSystem.passwordTab')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'profile' ? (
            <>
              {/* 用户名 */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t('creditSystem.username')}
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent ${
                    errors.username ? 'border-red-500' : 'border-[var(--border-primary)]'
                  }`}
                  placeholder={t('creditSystem.usernamePlaceholder')}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-500">{errors.username}</p>
                )}
              </div>

              {/* 手机号 */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t('creditSystem.phone')}
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-[var(--border-primary)]'
                  }`}
                  placeholder={t('creditSystem.phonePlaceholder')}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* 当前密码 */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t('creditSystem.currentPassword')}
                </label>
                <input
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent ${
                    errors.currentPassword ? 'border-red-500' : 'border-[var(--border-primary)]'
                  }`}
                  placeholder={t('creditSystem.currentPasswordPlaceholder')}
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-500">{errors.currentPassword}</p>
                )}
              </div>

              {/* 新密码 */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t('creditSystem.newPassword')}
                </label>
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent ${
                    errors.newPassword ? 'border-red-500' : 'border-[var(--border-primary)]'
                  }`}
                  placeholder={t('creditSystem.newPasswordPlaceholder')}
                />
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-500">{errors.newPassword}</p>
                )}
              </div>

              {/* 确认新密码 */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t('creditSystem.confirmPassword')}
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent ${
                    errors.confirmPassword ? 'border-red-500' : 'border-[var(--border-primary)]'
                  }`}
                  placeholder={t('creditSystem.confirmPasswordPlaceholder')}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            </>
          )}

          {/* 提交按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              {t('creditSystem.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[var(--accent-primary)] text-[var(--text-on-accent)] py-2 px-4 rounded-lg font-medium hover:bg-[var(--accent-primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('creditSystem.saving') : t('creditSystem.save')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;