'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardType } from '@betrayal/shared';
import { X } from 'lucide-react';

interface CardDisplayProps {
  /** 要顯示的卡牌，null 則不顯示 */
  card: Card | null;
  /** 關閉卡牌的回調 */
  onClose: () => void;
  /** 是否顯示動畫（抽卡效果） */
  animate?: boolean;
  /** Issue #190: 事件檢定結果（用於在卡牌彈窗中顯示檢定結果） */
  eventCheckResult?: {
    success: boolean;
    roll: number;
    dice: number[];
    stat: 'speed' | 'might' | 'sanity' | 'knowledge';
    target: number;
    message: string;
    effectDescription: string;
  } | null;
}

/**
 * 卡牌顯示組件
 * 
 * 用於顯示抽到的卡牌（事件卡、物品卡、預兆卡）
 * 包含動畫效果和卡牌詳細資訊
 * 
 * @example
 * <CardDisplay 
 *   card={drawnCard}
 *   onClose={() => setDrawnCard(null)}
 *   animate
 * />
 */
export function CardDisplay({
  card,
  onClose,
  animate = true,
  eventCheckResult,
}: CardDisplayProps) {
  // ESC 鍵關閉
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // 點擊背景關閉
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const getCardTypeConfig = (type: CardType) => {
    switch (type) {
      case 'event':
        return {
          label: '事件卡',
          labelEn: 'EVENT',
          color: '#10B981', // 綠色
          bgGradient: 'from-emerald-600 to-emerald-800',
          borderColor: 'border-emerald-500',
          glowColor: 'shadow-emerald-500/50',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          ),
        };
      case 'item':
        return {
          label: '物品卡',
          labelEn: 'ITEM',
          color: '#3B82F6', // 藍色
          bgGradient: 'from-blue-600 to-blue-800',
          borderColor: 'border-blue-500',
          glowColor: 'shadow-blue-500/50',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
          ),
        };
      case 'omen':
        return {
          label: '預兆卡',
          labelEn: 'OMEN',
          color: '#8B5CF6', // 紫色
          bgGradient: 'from-purple-600 to-purple-800',
          borderColor: 'border-purple-500',
          glowColor: 'shadow-purple-500/50',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.477.859h4z" />
            </svg>
          ),
        };
    }
  };

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <CardContent
            card={card}
            onClose={onClose}
            animate={animate}
            typeConfig={getCardTypeConfig(card.type)}
            eventCheckResult={eventCheckResult}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 卡牌類型配置
 */
interface CardTypeConfig {
  label: string;
  labelEn: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  icon: React.ReactNode;
}

/**
 * 卡牌內容組件
 */
interface CardContentProps {
  card: Card;
  onClose: () => void;
  animate: boolean;
  typeConfig: CardTypeConfig;
  eventCheckResult?: CardDisplayProps['eventCheckResult'];
}

function CardContent({ card, onClose, animate, typeConfig, eventCheckResult }: CardContentProps) {
  const cardVariants = {
    hidden: {
      opacity: 0,
      scale: 0.3,
      y: 100,
      rotateY: 180,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotateY: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 20,
        duration: 0.6,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: -50,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial={animate ? 'hidden' : 'visible'}
      animate="visible"
      exit="exit"
      className={`
        relative w-[320px] sm:w-[380px] 
        bg-gradient-to-br ${typeConfig.bgGradient}
        rounded-2xl border-2 ${typeConfig.borderColor}
        shadow-2xl ${typeConfig.glowColor}
        overflow-hidden
      `}
    >
      {/* 關閉按鈕 */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
        aria-label="關閉"
      >
        <X className="w-5 h-5" />
      </button>

      {/* 卡牌類型標籤 */}
      <div className="absolute top-3 left-3 z-10">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-sm font-bold shadow-lg"
          style={{ backgroundColor: typeConfig.color }}
        >
          {typeConfig.icon}
          <span>{typeConfig.label}</span>
        </div>
      </div>

      {/* 卡牌內容 */}
      <div className="p-6 pt-16">
        {/* 卡牌圖示區域 */}
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="w-32 h-32 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-inner"
            dangerouslySetInnerHTML={{
              __html: `<svg viewBox="0 0 100 100" width="80" height="80">${card.icon}</svg>`,
            }}
          />
        </div>

        {/* 卡牌名稱 */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-white text-center mb-2"
        >
          {card.name}
        </motion.h2>

        {/* 卡牌類型英文 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-white/60 text-sm text-center uppercase tracking-widest mb-4"
        >
          {typeConfig.labelEn}
        </motion.p>

        {/* 分隔線 */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5 }}
          className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mb-4"
        />

        {/* 卡牌描述 */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="text-white/90 text-center text-base leading-relaxed mb-4"
        >
          {card.description}
        </motion.p>

        {/* 效果區域 */}
        {(card.effect || card.rollRequired) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-black/20 rounded-xl p-4 border border-white/10"
          >
            {card.effect && (
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">✦</span>
                <p className="text-white/80 text-sm">{card.effect}</p>
              </div>
            )}
            
            {card.rollRequired && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-white/60 text-xs mb-2">需要檢定：</p>
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm capitalize">
                    {getStatName(card.rollRequired.stat)}
                  </span>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm font-bold">
                    目標 ≥ {card.rollRequired.target}
                  </span>
                </div>
                
                {(card.success || card.failure) && (
                  <div className="mt-3 space-y-2 text-xs">
                    {card.success && (
                      <p className="text-green-400">
                        <span className="font-bold">成功：</span>
                        {card.success}
                      </p>
                    )}
                    {card.failure && (
                      <p className="text-red-400">
                        <span className="font-bold">失敗：</span>
                        {card.failure}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Issue #190 & #195: 事件檢定結果顯示 */}
        {eventCheckResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
            className={`mt-4 rounded-xl p-4 border-2 ${
              eventCheckResult.success
                ? 'bg-green-900/40 border-green-500/50'
                : 'bg-red-900/40 border-red-500/50'
            }`}
          >
            {/* 檢定標題 */}
            <div className="text-center mb-3">
              <p className="text-white/80 text-sm mb-1">檢定結果</p>
              <div className={`text-2xl font-bold ${eventCheckResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {eventCheckResult.success ? '✅ 成功！' : '❌ 失敗！'}
              </div>
            </div>

            {/* Issue #195: 檢定屬性與目標 */}
            <div className="bg-black/20 rounded-lg p-3 mb-3">
              <p className="text-white/60 text-xs mb-2">檢定屬性</p>
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">
                  {getStatIcon(eventCheckResult.stat)} {getStatName(eventCheckResult.stat)}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm font-bold">
                  目標 ≥ {eventCheckResult.target}
                </span>
              </div>
            </div>

            {/* Issue #195: 擲骰結果顯示 [骰子] = 總和 */}
            <div className="bg-black/20 rounded-lg p-3 mb-3">
              <p className="text-white/60 text-xs mb-2">擲骰結果</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {/* 骰子 */}
                {eventCheckResult.dice.map((die, index) => (
                  <div
                    key={index}
                    className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center shadow-lg"
                  >
                    <span className="text-lg font-bold text-gray-800">{die}</span>
                  </div>
                ))}
                {/* 總和 */}
                <span className="text-white/60 mx-1">=</span>
                <span className={`text-xl font-bold ${eventCheckResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {eventCheckResult.roll}
                </span>
              </div>
            </div>

            {/* Issue #195: 效果描述 */}
            <div className={`text-center text-sm font-medium py-2 px-3 rounded-lg bg-black/20 ${eventCheckResult.success ? 'text-green-300' : 'text-red-300'}`}>
              <span className="text-white/60 block text-xs mb-1">效果</span>
              {eventCheckResult.effectDescription}
            </div>
          </motion.div>
        )}
      </div>

      {/* 底部裝飾 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </motion.div>
  );
}

/**
 * 取得屬性中文名稱
 */
function getStatName(stat: string): string {
  const names: Record<string, string> = {
    speed: '速度 Speed',
    might: '力量 Might',
    sanity: '理智 Sanity',
    knowledge: '知識 Knowledge',
  };
  return names[stat] || stat;
}

/**
 * Issue #190: 取得屬性圖示
 */
function getStatIcon(stat: string): string {
  const icons: Record<string, string> = {
    speed: '⚡',
    might: '💪',
    sanity: '🧠',
    knowledge: '📚',
  };
  return icons[stat] || '❓';
}

export default CardDisplay;
