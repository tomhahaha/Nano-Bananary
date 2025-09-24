import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n/context';

interface UserMenuProps {
  onShowCreditRecharge: () => void;
  onShowCreditHistory: () => void;
  onShowUserSettings: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ 
  onShowCreditRecharge, 
  onShowCreditHistory, 
  onShowUserSettings 
}) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full flex items-center justify-center text-[var(--text-on-accent)] font-semibold text-sm">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:inline font-medium">{user.username}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-lg py-2 z-[100]">
          <div className="px-4 py-2 border-b border-[var(--border-primary)]">
            <div className="font-semibold text-[var(--text-primary)]">{user.username}</div>
            <div className="text-sm text-[var(--text-secondary)]">{user.phone}</div>
          </div>
          
          <div className="py-1">
            {/* 不可点击的积分显示 */}
            <div className="px-4 py-2 text-[var(--text-secondary)] flex items-center gap-2 cursor-default">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              {t('creditSystem.remainingCredits').replace('{credits}', String(user?.credits || 0))}
            </div>
            
            {/* 积分充值选项 */}
            <button
              className="w-full px-4 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2"
              onClick={() => {
                onShowCreditRecharge();
                setIsOpen(false);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {t('creditSystem.creditRecharge')}
            </button>
            
            <button
              className="w-full px-4 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2"
              onClick={() => {
                onShowCreditHistory();
                setIsOpen(false);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              {t('userMenu.creditHistory')}
            </button>
            
            <button
              className="w-full px-4 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2"
              onClick={() => {
                onShowUserSettings();
                setIsOpen(false);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('userMenu.settings')}
            </button>
          </div>
          
          <div className="border-t border-[var(--border-primary)] pt-1">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t('userMenu.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;