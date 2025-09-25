import React, { useRef, useState } from 'react';
import type { Transformation } from '../types';
import { useTranslation } from '../i18n/context';
import { getEffectPreview } from '../constants';

// 生成默认 SVG 预览图的函数
const generateDefaultPreview = (transformation: Transformation): string => {
  const colors = [
    ['%23667eea', '%23764ba2'],
    ['%23f093fb', '%23f5576c'],
    ['%23ffecd2', '%23fcb69f'],
    ['%234facfe', '%2300f2fe'],
    ['%2343e97b', '%2338f9d7']
  ];
  const colorPair = colors[Math.abs(transformation.key.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];
  
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cdefs%3E%3ClinearGradient id='grad${transformation.key}' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:${colorPair[0]};stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:${colorPair[1]};stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23grad${transformation.key})'/%3E%3Ctext x='100' y='100' text-anchor='middle' dominant-baseline='central' fill='white' font-size='14' font-family='Arial'%3E${transformation.emoji}%3C/text%3E%3Ctext x='100' y='180' text-anchor='middle' fill='white' font-size='10'%3E效果预览%3C/text%3E%3C/svg%3E`;
};

interface TransformationSelectorProps {
  transformations: Transformation[];
  onSelect: (transformation: Transformation) => void;
  hasPreviousResult: boolean;
  onOrderChange: (newOrder: Transformation[]) => void;
  activeCategory: Transformation | null;
  setActiveCategory: (category: Transformation | null) => void;
}

const TransformationSelector: React.FC<TransformationSelectorProps> = ({ 
  transformations, 
  onSelect, 
  hasPreviousResult, 
  onOrderChange, 
  activeCategory, 
  setActiveCategory
}) => {
  const { t } = useTranslation();
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
    dragItemIndex.current = index;
    setDragging(true);
    const target = e.currentTarget;
    setTimeout(() => {
      target.classList.add('opacity-40', 'scale-95');
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
    dragOverItemIndex.current = index;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLButtonElement>) => {
    setDragging(false);
    e.currentTarget.classList.remove('opacity-40', 'scale-95');

    if (dragItemIndex.current !== null && dragOverItemIndex.current !== null && dragItemIndex.current !== dragOverItemIndex.current) {
      const newTransformations = [...transformations];
      const draggedItemContent = newTransformations.splice(dragItemIndex.current, 1)[0];
      newTransformations.splice(dragOverItemIndex.current, 0, draggedItemContent);
      onOrderChange(newTransformations);
    }
    
    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
  };
  
  const handleItemClick = (item: Transformation) => {
    if (item.items && item.items.length > 0) {
      setActiveCategory(item);
    } else {
      onSelect(item);
    }
  };

  // 获取预览图片：对于效果预览始终使用默认预览图，避免显示错误的用户图片
  const getPreviewImage = (transformation: Transformation) => {
    // 总是使用效果预览图，避免缓存的用户图片干扰预览
    return getEffectPreview(transformation);
  };

  const renderGrid = (items: Transformation[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
      {items.map((trans, index) => (
        <div 
          key={trans.key} 
          className="group"
          style={{ perspective: '1000px' }}
        >
          <button
            draggable={!activeCategory} // Only allow dragging categories
            onDragStart={(e) => !activeCategory && handleDragStart(e, index)}
            onDragEnter={(e) => !activeCategory && handleDragEnter(e, index)}
            onDragEnd={!activeCategory && handleDragEnd}
            onDragOver={!activeCategory && handleDragOver}
            onClick={() => handleItemClick(trans)}
            className={`w-full aspect-square bg-[var(--bg-card)] rounded-lg sm:rounded-xl border border-[var(--border-primary)] hover:border-[var(--accent-primary)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)] focus:ring-[var(--accent-primary)] active:scale-95 touch-manipulation relative overflow-hidden ${
              !activeCategory ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
            } ${dragging && !activeCategory ? 'border-dashed' : ''}`}
          >
            {/* Card Inner Container for 3D flip */}
            <div 
              className="absolute inset-0 w-full h-full transition-transform duration-500 ease-in-out group-hover:rotate-y-180"
              style={{
                transformStyle: 'preserve-3d',
                transform: 'rotateY(0deg)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotateY(180deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotateY(0deg)';
              }}
            >
              {/* Front Face - Emoji and Text */}
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 sm:p-3 md:p-4"
                style={{
                  backfaceVisibility: 'hidden',
                  zIndex: 2
                }}
              >
                <span className="text-2xl sm:text-3xl md:text-4xl mb-1 sm:mb-2 transition-transform duration-200">{trans.emoji}</span>
                <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] leading-tight">{t(trans.titleKey)}</span>
              </div>
              
              {/* Back Face - Effect Preview */}
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center p-2"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  zIndex: 1
                }}
              >
                <div className="w-full h-full rounded-lg overflow-hidden">
                  <img 
                    src={getPreviewImage(trans)} 
                    alt={`${t(trans.titleKey)} preview`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // 当图片加载失败时，回退到默认 SVG 预览图
                      const target = e.target as HTMLImageElement;
                      target.src = generateDefaultPreview(trans);
                    }}
                  />
                </div>
              </div>
            </div>
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-8 animate-fade-in">
      {!activeCategory ? (
        <>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 sm:mb-4 text-[var(--accent-primary)]">{t('transformationSelector.title')}</h2>
          <p className="text-base sm:text-lg text-center text-[var(--text-secondary)] mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            {hasPreviousResult 
              ? t('transformationSelector.descriptionWithResult')
              : t('transformationSelector.description')
            }
          </p>
          {renderGrid(transformations)}
        </>
      ) : (
        <div>
          <div className="mb-6 sm:mb-8 flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setActiveCategory(null)}
              className="flex items-center gap-2 text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors duration-200 py-2 px-3 sm:px-4 rounded-lg hover:bg-[rgba(107,114,128,0.1)] active:scale-95 touch-manipulation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm sm:text-base">{t('app.back')}</span>
            </button>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl md:text-4xl">{activeCategory.emoji}</span>
              <span className="text-base sm:text-lg md:text-xl">{t(activeCategory.titleKey)}</span>
            </h2>
          </div>
          {renderGrid(activeCategory.items || [])}
        </div>
      )}
    </div>
  );
};

export default TransformationSelector;