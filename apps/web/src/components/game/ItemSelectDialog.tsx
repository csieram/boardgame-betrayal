'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardType } from '@betrayal/shared';
import { X, Skull, AlertTriangle } from 'lucide-react';
import { Button } from '@betrayal/ui';

// ==================== 類型定義 ====================

interface ItemSelectDialogProps {
  /** 是否顯示對話框 */
  isOpen: boolean;
  /** 玩家物品列表 */
  items: Card[];
  /** 玩家預兆列表 */
  omens: Card[];
  /** 玩家背包物品列表 (Issue #236) */
  backpack?: Card[];
  /** 對話框標題 */
  title: string;
  /** 對話框描述 */
  description: string;
  /** 收益描述 */
  benefitDescription: string;
  /** 確認按鈕文字 */
  confirmLabel?: string;
  /** 取消按鈕文字 */
  cancelLabel?: string;
  /** 選擇物品後的回調 */
  onSelect: (item: Card | null) => void;
  /** 取消的回調 */
  onCancel: () => void;
  /** 是否顯示替代選項 */
  showAlternative?: boolean;
  /** 替代選項標籤 */
  alternativeLabel?: string;
  /** 替代選項描述 */
  alternativeDescription?: string;
  /** 選擇替代選項的回調 */
  onAlternative?: () => void;
}

// ==================== 組件 ====================

/**
 * 物品選擇對話框
 *
 * 用於事件卡效果中讓玩家選擇要捨棄的物品
 * Issue #232: Item Discarding System
 *
 * @example
 * <ItemSelectDialog
 *   isOpen={showDiscardDialog}
 *   items={playerItems}
 *   omens={playerOmens}
 *   title="捨棄物品"
 *   description="選擇一個物品捨棄來獲得收益"
 *   benefitDescription="理智 +1"
 *   onSelect={(item) => handleDiscardItem(item)}
 *   onCancel={() => setShowDiscardDialog(false)}
 *   showAlternative
 *   alternativeLabel="冒險一搏"
 *   alternativeDescription="進行力量檢定"
 *   onAlternative={() => handleRollInstead()}
 * />
 */
export function ItemSelectDialog({
  isOpen,
  items,
  omens,
  backpack = [],
  title,
  description,
  benefitDescription,
  confirmLabel = '確認捨棄',
  cancelLabel = '取消',
  onSelect,
  onCancel,
  showAlternative = false,
  alternativeLabel,
  alternativeDescription,
  onAlternative,
}: ItemSelectDialogProps) {
  const [selectedItem, setSelectedItem] = useState<Card | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'omens' | 'backpack'>('items');

  // 重置選擇狀態
  useEffect(() => {
    if (isOpen) {
      setSelectedItem(null);
      // 預設選擇有物品的標籤
      if (items.length > 0) {
        setActiveTab('items');
      } else if (omens.length > 0) {
        setActiveTab('omens');
      } else if (backpack.length > 0) {
        setActiveTab('backpack');
      }
    }
  }, [isOpen, items.length, omens.length, backpack.length]);

  // ESC 鍵關閉
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onCancel]);

  const handleConfirm = () => {
    onSelect(selectedItem);
  };

  const handleAlternative = () => {
    if (onAlternative) {
      onAlternative();
    }
  };

  // Issue #236: Combine items, omens, and backpack items
  const allItems = [...items, ...omens, ...backpack];
  const hasItems = items.length > 0;
  const hasOmens = omens.length > 0;
  const hasBackpack = backpack.length > 0;
  const hasAnyItems = hasItems || hasOmens || hasBackpack;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCancel();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-lg bg-gray-800 rounded-2xl border border-gray-600 shadow-2xl overflow-hidden"
          >
            {/* 頂部標題區域 */}
            <div className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 p-6 border-b border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center">
                    <Skull className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <p className="text-gray-400 text-sm mt-1">{description}</p>
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  aria-label="關閉"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 收益提示 */}
              <div className="mt-4 flex items-center gap-2 text-amber-400 bg-amber-900/30 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">收益: {benefitDescription}</span>
              </div>
            </div>

            {/* 內容區域 */}
            <div className="p-6">
              {!hasAnyItems ? (
                // 沒有物品時的顯示
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🎒</span>
                  </div>
                  <p className="text-gray-400 mb-2">你的背包是空的</p>
                  <p className="text-gray-500 text-sm">沒有物品可以捨棄</p>
                </div>
              ) : (
                // 有物品時的顯示
                <>
                  {/* 標籤切換 */}
                  {(hasItems || hasOmens || hasBackpack) && (
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {hasItems && (
                        <button
                          onClick={() => setActiveTab('items')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'items'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          物品 ({items.length})
                        </button>
                      )}
                      {hasOmens && (
                        <button
                          onClick={() => setActiveTab('omens')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'omens'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          預兆 ({omens.length})
                        </button>
                      )}
                      {hasBackpack && (
                        <button
                          onClick={() => setActiveTab('backpack')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'backpack'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          背包 ({backpack.length})
                        </button>
                      )}
                    </div>
                  )}

                  {/* 物品列表 */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activeTab === 'items' && items.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        type="item"
                        isSelected={selectedItem?.id === item.id}
                        onClick={() => setSelectedItem(item)}
                      />
                    ))}
                    {activeTab === 'omens' && omens.map((omen) => (
                      <ItemCard
                        key={omen.id}
                        item={omen}
                        type="omen"
                        isSelected={selectedItem?.id === omen.id}
                        onClick={() => setSelectedItem(omen)}
                      />
                    ))}
                    {activeTab === 'backpack' && backpack.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        type="item"
                        isSelected={selectedItem?.id === item.id}
                        onClick={() => setSelectedItem(item)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* 替代選項 */}
              {showAlternative && onAlternative && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <p className="text-gray-400 text-sm mb-3">或者選擇：</p>
                  <button
                    onClick={handleAlternative}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-gray-600 hover:border-blue-500 hover:bg-blue-900/20 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white group-hover:text-blue-400 transition-colors">
                          {alternativeLabel}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">{alternativeDescription}</p>
                      </div>
                      <span className="text-2xl group-hover:scale-110 transition-transform">🎲</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 底部按鈕 */}
            <div className="p-6 pt-0 flex gap-3">
              <Button
                variant="secondary"
                onClick={onCancel}
                className="flex-1"
              >
                {cancelLabel}
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={!selectedItem || !hasAnyItems}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==================== 子組件 ====================

interface ItemCardProps {
  item: Card;
  type: 'item' | 'omen';
  isSelected: boolean;
  onClick: () => void;
}

/**
 * 物品卡片組件
 */
function ItemCard({ item, type, isSelected, onClick }: ItemCardProps) {
  const typeConfig = {
    item: {
      bgColor: 'bg-blue-900/30',
      borderColor: 'border-blue-500/30',
      selectedBg: 'bg-blue-900/60',
      selectedBorder: 'border-blue-500',
      icon: '🔷',
      label: '物品',
    },
    omen: {
      bgColor: 'bg-purple-900/30',
      borderColor: 'border-purple-500/30',
      selectedBg: 'bg-purple-900/60',
      selectedBorder: 'border-purple-500',
      icon: '🔮',
      label: '預兆',
    },
  };

  const config = typeConfig[type];

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        w-full p-4 rounded-xl border-2 transition-all text-left
        ${isSelected 
          ? `${config.selectedBg} ${config.selectedBorder} shadow-lg shadow-${type === 'item' ? 'blue' : 'purple'}-500/20` 
          : `${config.bgColor} ${config.borderColor} hover:border-gray-500`
        }
      `}
    >
      <div className="flex items-center gap-3">
        {/* 物品圖示 */}
        <div 
          className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden"
          dangerouslySetInnerHTML={{
            __html: `<svg viewBox="0 0 100 100" width="32" height="32">${item.icon}</svg>`,
          }}
        />
        
        {/* 物品資訊 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <span className="text-xs text-gray-400 uppercase tracking-wider">{config.label}</span>
          </div>
          <p className="font-medium text-white truncate">{item.name}</p>
          <p className="text-sm text-gray-400 truncate">{item.description}</p>
        </div>

        {/* 選中標記 */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`w-6 h-6 rounded-full ${type === 'item' ? 'bg-blue-500' : 'bg-purple-500'} flex items-center justify-center`}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}

// ==================== 簡化版本 ====================

interface SimpleItemSelectDialogProps {
  /** 是否顯示對話框 */
  isOpen: boolean;
  /** 可選物品列表 */
  items: Card[];
  /** 對話框標題 */
  title: string;
  /** 對話框描述 */
  description: string;
  /** 選擇物品後的回調 */
  onSelect: (item: Card | null) => void;
  /** 取消的回調 */
  onCancel: () => void;
}

/**
 * 簡化版物品選擇對話框
 * 
 * 用於只需要選擇物品，不需要顯示收益和替代選項的場景
 */
export function SimpleItemSelectDialog({
  isOpen,
  items,
  title,
  description,
  onSelect,
  onCancel,
}: SimpleItemSelectDialogProps) {
  const [selectedItem, setSelectedItem] = useState<Card | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedItem(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onCancel]);

  const handleConfirm = () => {
    onSelect(selectedItem);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCancel();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md bg-gray-800 rounded-2xl border border-gray-600 shadow-2xl overflow-hidden"
          >
            {/* 標題 */}
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="text-gray-400 text-sm mt-1">{description}</p>
            </div>

            {/* 物品列表 */}
            <div className="p-6 max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-center text-gray-400 py-8">沒有可選擇的物品</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`
                        w-full p-3 rounded-lg border-2 text-left transition-all
                        ${selectedItem?.id === item.id
                          ? 'bg-blue-900/50 border-blue-500'
                          : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                        }
                      `}
                    >
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-sm text-gray-400">{item.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 按鈕 */}
            <div className="p-6 pt-0 flex gap-3">
              <Button variant="secondary" onClick={onCancel} className="flex-1">
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={!selectedItem}
                className="flex-1"
              >
                確認
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ItemSelectDialog;
