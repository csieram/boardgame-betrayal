'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@betrayal/shared';
import { ItemDetailModal } from './ItemDetailModal';

interface InventoryPanelProps {
  /** 玩家持有的物品 */
  items: Card[];
  /** 玩家持有的預兆 */
  omens: Card[];
  /** 最大物品欄位數 */
  maxSlots?: number;
  /** 預兆數量（用於作祟檢定） */
  omenCount: number;
  /** 作祟是否已觸發 */
  hauntTriggered: boolean;
  /** 是否預設展開面板（預設為 false） */
  defaultExpanded?: boolean;
}

/**
 * 玩家背包面板
 * 
 * 顯示玩家收集的物品和預兆，以及預兆計數器
 * 
 * @example
 * <InventoryPanel 
 *   items={player.items}
 *   omens={player.omens}
 *   omenCount={3}
 *   hauntTriggered={false}
 * />
 */
export function InventoryPanel({
  items,
  omens,
  maxSlots = 10,
  omenCount,
  hauntTriggered,
  defaultExpanded = false,
}: InventoryPanelProps) {
  const [selectedCard, setSelectedCard] = useState<{
    card: Card;
    type: 'item' | 'omen';
    omenNumber?: number;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const totalItems = items.length + omens.length;
  const slots = Array.from({ length: maxSlots }, (_, i) => {
    if (i < items.length) {
      return { type: 'item' as const, card: items[i] };
    } else if (i < items.length + omens.length) {
      const omenIndex = i - items.length;
      return { type: 'omen' as const, card: omens[omenIndex], omenNumber: omenIndex + 1 };
    }
    return null;
  });

  const handleCardClick = (slot: { type: 'item' | 'omen'; card: Card; omenNumber?: number }) => {
    setSelectedCard(slot);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      {/* 切換按鈕 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors"
      >
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span>🎒</span>
          <span>背包</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {totalItems}/{maxSlots} 欄位
          </span>
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400"
          >
            ▼
          </motion.span>
        </div>
      </button>

      {/* 可展開內容 */}
      <motion.div
        initial={false}
        animate={{ 
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4">
          {/* 物品欄位網格 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {slots.map((slot, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => slot && handleCardClick(slot)}
                className={`
                  rounded-xl border-2 flex flex-col items-center justify-center p-2
                  ${slot 
                    ? slot.type === 'item'
                      ? 'bg-blue-900/30 border-blue-500/50 hover:border-blue-400 hover:bg-blue-900/50'
                      : 'bg-purple-900/30 border-purple-500/50 hover:border-purple-400 hover:bg-purple-900/50'
                    : 'bg-gray-700/30 border-gray-600/30 border-dashed'
                  }
                  transition-all cursor-pointer min-h-[120px]
                `}
                title={slot?.card.name}
              >
                {slot ? (
                  <div className="w-full flex flex-col items-center justify-center">
                    {/* 卡牌圖示 */}
                    <div 
                      className="w-16 h-16 mb-2"
                      dangerouslySetInnerHTML={{
                        __html: `<svg viewBox="0 0 100 100" width="64" height="64">${slot.card.icon}</svg>`,
                      }}
                    />
                    {/* 卡牌名稱 */}
                    <span className="text-sm text-center leading-tight text-gray-200 font-medium truncate w-full px-1">
                      {slot.card.name.length > 10 
                        ? slot.card.name.slice(0, 10) + '...'
                        : slot.card.name
                      }
                    </span>
                    {/* 類型標記 */}
                    <span className={`text-[10px] mt-1.5 px-2 py-0.5 rounded-full ${
                      slot.type === 'item' 
                        ? 'bg-blue-600/50 text-blue-200'
                        : 'bg-purple-600/50 text-purple-200'
                    }`}>
                      {slot.type === 'item' ? '物品' : '預兆'}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-600 text-lg">+</span>
                )}
              </motion.div>
            ))}
          </div>

          {/* 預兆計數器 */}
          <div className={`
            rounded-lg p-3 border
            ${hauntTriggered 
              ? 'bg-red-900/30 border-red-500/50' 
              : 'bg-purple-900/20 border-purple-500/30'
            }
          `}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌙</span>
                <span className="text-sm font-medium">預兆計數</span>
              </div>
              <span className={`text-lg font-bold ${
                hauntTriggered ? 'text-red-400' : 'text-purple-400'
              }`}>
                {omenCount}
              </span>
            </div>
            
            {/* 作祟檢定說明 */}
            <div className="mt-2 pt-2 border-t border-gray-700/50">
              <p className="text-xs text-gray-400">
                作祟檢定：擲 {omenCount} 顆骰
                {omenCount > 0 && !hauntTriggered && (
                  <span className="text-purple-400 ml-1">
                    （擲出 &lt; {omenCount} 觸發作祟）
                  </span>
                )}
              </p>
              {hauntTriggered && (
                <p className="text-xs text-red-400 mt-1 font-bold">
                  ⚠️ 作祟已觸發！
                </p>
              )}
            </div>
          </div>

          {/* 圖例 */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-900/50 border border-blue-500/50" />
              <span>物品</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-900/50 border border-purple-500/50" />
              <span>預兆</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 詳情彈窗 */}
      <ItemDetailModal
        card={selectedCard?.card ?? null}
        type={selectedCard?.type ?? null}
        omenNumber={selectedCard?.omenNumber}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export default InventoryPanel;
