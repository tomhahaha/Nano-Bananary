import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';
import { useModal } from '../contexts/ModalContext';
import { authService } from '../services/authService';

interface CreditHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreditTransaction {
  id: string;
  userId: string;
  type: 'charge' | 'consume' | 'refund';
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

const CreditHistory: React.FC<CreditHistoryProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { setModalOpen } = useModal();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'charge' | 'consume'>('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const result = await authService.getCreditTransactions();
      console.log('API返回结果:', result); // 添加调试日志
      if (result.success) {
        // 兼容不同的后端数据格式
        const transactions = result.data || result.transactions || [];
        setTransactions(transactions);
        console.log('设置的交易记录:', transactions);
      } else {
        console.error('获取积分明细失败:', result.message);
      }
    } catch (error) {
      console.error('获取积分明细失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    return t(`creditSystem.transactionType.${type}`);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'charge':
        return 'text-green-600';
      case 'consume':
        return 'text-red-600';
      case 'refund':
        return 'text-blue-600';
      default:
        return 'text-[var(--text-secondary)]';
    }
  };

  const getAmountDisplay = (transaction: CreditTransaction) => {
    const prefix = transaction.type === 'charge' ? '+' : '-';
    return `${prefix}${transaction.amount}`;
  };

  const filteredTransactions = transactions.filter(t => 
    filter === 'all' || t.type === filter
  );

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
      
      <div className="relative bg-[var(--bg-card)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[75vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--accent-primary)]">{t('creditSystem.historyTitle')}</h2>
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 筛选器 */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {t('creditSystem.allTransactions')}
            </button>
            <button
              onClick={() => setFilter('charge')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'charge'
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {t('creditSystem.chargeTransactions')}
            </button>
            <button
              onClick={() => setFilter('consume')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'consume'
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {t('creditSystem.consumeTransactions')}
            </button>
          </div>

          {/* 交易列表 */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                {filter === 'all' 
                  ? t('creditSystem.noRecords')
                  : filter === 'charge'
                  ? t('creditSystem.noChargeRecords')
                  : t('creditSystem.noConsumeRecords')
                }
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="border border-[var(--border-primary)] rounded-lg p-4 hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'charge'
                              ? 'bg-green-100 text-green-800'
                              : transaction.type === 'consume'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {getTypeLabel(transaction.type)}
                        </span>
                        <span className="text-[var(--text-primary)] font-medium">
                          {transaction.description}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${getTypeColor(transaction.type)}`}>
                          {getAmountDisplay(transaction)}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {t('creditSystem.balance')}: {transaction.balance}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {new Date(transaction.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 统计信息 */}
          {!loading && filteredTransactions.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[var(--border-primary)]">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-[var(--text-secondary)]">{t('creditSystem.totalCharge')}</div>
                  <div className="font-semibold text-green-600">
                    +{transactions
                      .filter(t => t.type === 'charge')
                      .reduce((sum, t) => sum + t.amount, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[var(--text-secondary)]">{t('creditSystem.totalConsume')}</div>
                  <div className="font-semibold text-red-600">
                    -{transactions
                      .filter(t => t.type === 'consume')
                      .reduce((sum, t) => sum + t.amount, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[var(--text-secondary)]">{t('creditSystem.currentBalance')}</div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {transactions.length > 0 ? transactions[0].balance : 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditHistory;