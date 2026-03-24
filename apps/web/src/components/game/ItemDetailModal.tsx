'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@betrayal/shared';

interface ItemDetailModalProps {
  /** 要顯示的卡牌 */
  card: Card | null;
  /** 卡牌類型 */
  type: 'item' | 'omen' | null;
  /** 預兆編號（如果是預兆卡） */
  omenNumber?: number;
  /** 是否顯示 */
  isOpen: boolean;
  /** 關閉回調 */
  onClose: () => void;
}

/**
 * 物品/預兆詳情彈窗
 * 
 * 顯示卡牌的完整資訊，包括名稱、描述、效果等
 * 
 * @example
 * <ItemDetailModal 
 *   card={selectedCard}
 *   type="item"
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 * />
 */
export function ItemDetailModal({
  card,
  type,
  omenNumber,
  isOpen,
  onClose,
}: ItemDetailModalProps) {
  if (!card || !isOpen) return null;

  const isOmen = type === 'omen';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* 彈窗內容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
          >
            <div 
              className={`
                pointer-events-auto w-full max-w-md rounded-2xl border-2 p-6 shadow-2xl
                ${isOmen 
                  ? 'bg-purple-900/95 border-purple-500/50' 
                  : 'bg-blue-900/95 border-blue-500/50'
                }
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 關閉按鈕 */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* 卡牌圖示 */}
              <div className="flex justify-center mb-6">
                <div 
                  className={`
                    w-32 h-32 rounded-xl flex items-center justify-center
                    ${isOmen ? 'bg-purple-800/50' : 'bg-blue-800/50'}
                  `}
                  dangerouslySetInnerHTML={{
                    __html: `<svg viewBox="0 0 100 100" width="96" height="96">${card.icon}</svg>`,
                  }}
                />
              </div>

              {/* 類型標籤 */}
              <div className="flex justify-center mb-4">
                <span className={`
                  px-4 py-1.5 rounded-full text-sm font-medium
                  ${isOmen 
                    ? 'bg-purple-600/50 text-purple-200' 
                    : 'bg-blue-600/50 text-blue-200'
                  }
                `}>
                  {isOmen ? '預兆' : '物品'}
                  {isOmen && omenNumber && (
                    <span className="ml-2 text-purple-300">#{omenNumber}</span>
                  )}
                </span>
              </div>

              {/* 卡牌名稱 */}
              <h2 className="text-2xl font-bold text-center text-white mb-4">
                {card.name}
              </h2>

              {/* 描述 */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">描述</h3>
                <p className="text-gray-200 leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* 效果/屬性 */}
              {card.effect && (
                <div className={`
                  rounded-xl p-4 mb-4
                  ${isOmen ? 'bg-purple-800/50' : 'bg-blue-800/50'}
                `}>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">
                    {isOmen ? '預兆效果' : '物品效果'}
                  </h3>
                  <p className="text-white font-medium">
                    {card.effect}
                  </p>
                </div>
              )}

              {/* 檢定資訊（如果有） */}
              {card.rollRequired && (
                <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">檢定需求</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">屬性：</span>
                      <span className="px-2 py-1 bg-gray-700 rounded text-white text-sm">
                        {card.rollRequired.stat === 'speed' && '速度'}
                        {card.rollRequired.stat === 'might' && '力量'}
                        {card.rollRequired.stat === 'sanity' && '理智'}
                        {card.rollRequired.stat === 'knowledge' && '知識'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">目標：</span>
                      <span className="px-2 py-1 bg-gray-700 rounded text-white text-sm">
                        {card.rollRequired.target}
                      </span>
                    </div>
                  </div>
                  {card.success && (
                    <p className="mt-2 text-green-400 text-sm">
                      ✅ 成功：{card.success}
                    </p>
                  )}
                  {card.failure && (
                    <p className="mt-1 text-red-400 text-sm">
                      ❌ 失敗：{card.failure}
                    </p>
                  )}
                </div>
              )}

              {/* 關閉按鈕 */}
              <button
                onClick={onClose}
                className={`
                  w-full py-3 rounded-xl font-medium transition-colors
                  ${isOmen 
                    ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }
                `}
              >
                關閉
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ItemDetailModal;
