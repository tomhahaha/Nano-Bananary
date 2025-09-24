import React, { useState } from 'react';
import { useTranslation } from '../i18n/context';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';

interface CreditRechargeProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChargePackage {
  id: string;
  price: number;
  credits: number;
  popular?: boolean;
}

const CreditRecharge: React.FC<CreditRechargeProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const { setModalOpen } = useModal();
  const [selectedPackage, setSelectedPackage] = useState<string>('20');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'alipay' | 'wechat'>('alipay');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  const CHARGE_PACKAGES: ChargePackage[] = [
    { id: '10', price: 10, credits: 800 },
    { id: '20', price: 20, credits: 1600, popular: true },
    { id: '50', price: 50, credits: 4000 },
    { id: '100', price: 100, credits: 8000 },
  ];

  const handleRecharge = async () => {
    setLoading(true);
    try {
      let amount: number;
      let credits: number;

      if (isCustom) {
        amount = parseFloat(customAmount);
        if (amount < 1) {
          alert(t('creditSystem.validationErrors.amountTooLow'));
          return;
        }
        credits = Math.floor(amount * 80);
      } else {
        const pkg = CHARGE_PACKAGES.find(p => p.id === selectedPackage);
        if (!pkg) return;
        amount = pkg.price;
        credits = pkg.credits;
      }

      // 调用简化的充值API（假充值）
      const result = await authService.createChargeOrder(amount, credits, paymentMethod);
      
      if (result.success) {
        alert(t('creditSystem.rechargeSuccess').replace('{credits}', String(credits)));
        await refreshUser();
        onClose();
      } else {
        alert(result.message || t('creditSystem.rechargeFailed'));
      }
    } catch (error) {
      console.error('充值失败:', error);
      alert(t('creditSystem.rechargeFailed'));
    } finally {
      setLoading(false);
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
            <h2 className="text-2xl font-bold text-[var(--accent-primary)]">{t('creditSystem.rechargeTitle')}</h2>
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
          {/* 充值方式选择 */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setIsCustom(false)}
                className={`px-4 py-2 rounded-lg flex-1 transition-colors ${
                  !isCustom 
                    ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]' 
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                {t('creditSystem.rechargePackages')}
              </button>
              <button
                onClick={() => setIsCustom(true)}
                className={`px-4 py-2 rounded-lg flex-1 transition-colors ${
                  isCustom 
                    ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]' 
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                {t('creditSystem.customAmount')}
              </button>
            </div>

            {/* 套餐选择 */}
            {!isCustom && (
              <div className="grid grid-cols-2 gap-3">
                {CHARGE_PACKAGES.map((pkg) => (
                  <label
                    key={pkg.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors relative ${
                      selectedPackage === pkg.id
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                        : 'border-[var(--border-primary)] hover:border-[var(--accent-primary)]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="package"
                      value={pkg.id}
                      checked={selectedPackage === pkg.id}
                      onChange={(e) => setSelectedPackage(e.target.value)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="font-medium text-[var(--text-primary)] mb-2">
                        {t(`creditSystem.rechargePackage${pkg.price}`)}
                      </div>
                      {pkg.popular && (
                        <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs bg-[var(--accent-primary)] text-[var(--text-on-accent)] px-2 py-1 rounded">
                          {t('creditSystem.recommended')}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* 自定义金额 */}
            {isCustom && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    {t('creditSystem.customAmountLabel')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={t('creditSystem.customAmountPlaceholder')}
                    className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  />
                </div>
                {customAmount && (
                  <div className="text-sm text-[var(--text-secondary)]">
                    {t('creditSystem.willReceive').replace('{credits}', String(Math.floor(parseFloat(customAmount) * 80)))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 支付方式 */}
          <div className="space-y-3">
            <h3 className="font-medium text-[var(--text-primary)]">{t('creditSystem.paymentMethod')} <span className="text-sm text-[var(--text-secondary)]">(演示模式)</span></h3>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`border-2 rounded-lg p-3 cursor-pointer transition-colors flex items-center gap-3 ${
                  paymentMethod === 'alipay'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                    : 'border-[var(--border-primary)]'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="alipay"
                  checked={paymentMethod === 'alipay'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'alipay')}
                  className="sr-only"
                />
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-sm font-bold">
                  支
                </div>
                <span className="font-medium text-[var(--text-primary)]">{t('creditSystem.alipay')} (模拟)</span>
              </label>
              
              <label
                className={`border-2 rounded-lg p-3 cursor-pointer transition-colors flex items-center gap-3 ${
                  paymentMethod === 'wechat'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                    : 'border-[var(--border-primary)]'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="wechat"
                  checked={paymentMethod === 'wechat'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'wechat')}
                  className="sr-only"
                />
                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-sm font-bold">
                  微
                </div>
                <span className="font-medium text-[var(--text-primary)]">{t('creditSystem.wechat')} (模拟)</span>
              </label>
            </div>
            <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-2 rounded">
              💡 这是演示功能，不涉及真实支付，积分将直接充值到您的账户。
            </div>
          </div>

          {/* 充值按钮 */}
          <button
            onClick={handleRecharge}
            disabled={loading || (isCustom && !customAmount)}
            className="w-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] py-3 px-4 rounded-lg font-medium hover:bg-[var(--accent-primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('creditSystem.processing') : '模拟充值 (免费)'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default CreditRecharge;