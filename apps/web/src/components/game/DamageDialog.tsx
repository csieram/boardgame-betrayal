'use client';

/**
 * DamageDialog Component
 * 
 * 顯示傷害分配對話框，讓玩家選擇要降低哪個屬性
 * 
 * Rulebook Reference: Page 15 - 戰鬥傷害
 * - 物理傷害：可以減少 Might 或 Speed
 * - 心智傷害：可以減少 Knowledge 或 Sanity
 * - 一般傷害：可以減少任何屬性
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@betrayal/ui';
import {
  DamageType,
  DamageAllocation,
  DamageApplicationResult,
  TRAIT_NAMES,
  checkDeath,
  getSafeTraitChoices,
  getFatalTraitChoices,
} from '@betrayal/game-engine';
import { CharacterStats, StatType } from '@betrayal/game-engine';

// 屬性圖標
const TRAIT_ICONS: Record<StatType, string> = {
  might: '💪',
  speed: '⚡',
  knowledge: '📚',
  sanity: '🧠',
};

// 傷害類型圖標
const DAMAGE_TYPE_ICONS: Record<DamageType, string> = {
  physical: '⚔️',
  mental: '🔮',
  general: '💀',
};

// 傷害類型名稱
const DAMAGE_TYPE_NAMES: Record<DamageType, string> = {
  physical: '物理傷害',
  mental: '心智傷害',
  general: '一般傷害',
};

// 傷害類型描述
const DAMAGE_TYPE_DESCRIPTIONS: Record<DamageType, string> = {
  physical: '選擇降低力量或速度',
  mental: '選擇降低知識或理智',
  general: '選擇降低任意屬性',
};

interface DamageDialogProps {
  /** 是否顯示對話框 */
  isOpen: boolean;
  /** 傷害分配請求 */
  damage: DamageAllocation | null;
  /** 當前屬性值 */
  currentStats: CharacterStats;
  /** 是否處於作祟階段 */
  isHauntActive: boolean;
  /** 玩家名稱 */
  playerName: string;
  /** 確認回調 */
  onConfirm: (result: DamageApplicationResult, chosenTrait: StatType) => void;
  /** 取消回調 */
  onCancel?: () => void;
}

export function DamageDialog({
  isOpen,
  damage,
  currentStats,
  isHauntActive,
  playerName,
  onConfirm,
  onCancel,
}: DamageDialogProps) {
  // Issue #274: Debug logging
  console.log('[DEBUG #274] DamageDialog rendered, isOpen:', isOpen);
  console.log('[DEBUG #274] DamageDialog props:', { isOpen, damage, currentStats });
  
  const [selectedTrait, setSelectedTrait] = useState<StatType | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // 計算安全的選項（不會導致死亡）
  const safeTraits = useMemo(() => {
    if (!damage) return [];
    return getSafeTraitChoices(currentStats, damage, isHauntActive);
  }, [damage, currentStats, isHauntActive]);

  // 計算致命的選項（會導致死亡）
  const fatalTraits = useMemo(() => {
    if (!damage) return [];
    return getFatalTraitChoices(currentStats, damage, isHauntActive);
  }, [damage, currentStats, isHauntActive]);

  // 檢查選擇是否會導致死亡
  const isFatalSelection = useMemo(() => {
    if (!selectedTrait || !damage) return false;
    return fatalTraits.includes(selectedTrait);
  }, [selectedTrait, fatalTraits, damage]);

  // 處理確認
  const handleConfirm = () => {
    if (!selectedTrait || !damage) return;

    setIsAnimating(true);

    // 模擬動畫延遲
    setTimeout(() => {
      // 這裡會在實際應用中調用遊戲引擎的 applyDamage
      // 為了演示，我們創建一個模擬結果
      const currentValue = currentStats[selectedTrait];
      const actualReduction = Math.min(damage.amount, currentValue - (isHauntActive ? 0 : 1));
      const newValue = currentValue - actualReduction;

      const result: DamageApplicationResult = {
        success: true,
        playerDied: isHauntActive && newValue <= 0,
        newStats: {
          ...currentStats,
          [selectedTrait]: newValue,
        },
        reducedStat: selectedTrait,
        actualReduction,
      };

      onConfirm(result, selectedTrait);
      setIsAnimating(false);
      setSelectedTrait(null);
    }, 500);
  };

  // 處理取消
  const handleCancel = () => {
    setSelectedTrait(null);
    onCancel?.();
  };

  // 獲取屬性按鈕樣式
  const getTraitButtonStyle = (trait: StatType) => {
    const isSelected = selectedTrait === trait;
    const isFatal = fatalTraits.includes(trait);
    const isSafe = safeTraits.includes(trait);

    if (isSelected) {
      if (isFatal) {
        return 'bg-red-600 border-red-400 text-white';
      }
      return 'bg-blue-600 border-blue-400 text-white';
    }

    if (isFatal) {
      return 'bg-red-900/50 border-red-700 text-red-200 hover:bg-red-800/50';
    }

    if (isSafe) {
      return 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700';
    }

    return 'bg-gray-900 border-gray-700 text-gray-500 cursor-not-allowed';
  };

  if (!isOpen || !damage) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md mx-4"
          >
            {/* 背景卡片 */}
            <div className="bg-gray-900 border-2 border-gray-700 rounded-lg shadow-2xl overflow-hidden">
              {/* 標題區域 */}
              <div className="bg-gradient-to-r from-red-900 to-red-800 px-6 py-4 border-b border-red-700">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{DAMAGE_TYPE_ICONS[damage.type]}</span>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {DAMAGE_TYPE_NAMES[damage.type]}
                    </h2>
                    <p className="text-red-200 text-sm">
                      {playerName} 受到 {damage.amount} 點傷害
                    </p>
                  </div>
                </div>
              </div>

              {/* 內容區域 */}
              <div className="p-6 space-y-6">
                {/* 描述 */}
                <p className="text-gray-300 text-center">
                  {DAMAGE_TYPE_DESCRIPTIONS[damage.type]}
                </p>

                {/* 屬性選擇區域 */}
                <div className="grid grid-cols-2 gap-3">
                  {damage.availableTraits.map((trait) => {
                    const currentValue = currentStats[trait];
                    const newValue = Math.max(
                      isHauntActive ? 0 : 1,
                      currentValue - damage.amount
                    );
                    const isFatal = fatalTraits.includes(trait);

                    return (
                      <button
                        key={trait}
                        onClick={() => setSelectedTrait(trait)}
                        disabled={isAnimating}
                        className={`
                          relative p-4 rounded-lg border-2 transition-all duration-200
                          ${getTraitButtonStyle(trait)}
                        `}
                      >
                        {/* 屬性圖標和名稱 */}
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-2xl">{TRAIT_ICONS[trait]}</span>
                          <span className="font-medium">{TRAIT_NAMES[trait]}</span>
                        </div>

                        {/* 數值顯示 */}
                        <div className="mt-2 text-sm">
                          <span className={isFatal ? 'text-red-300' : 'text-gray-400'}>
                            {currentValue} → {newValue}
                          </span>
                        </div>

                        {/* 致命警告 */}
                        {isFatal && (
                          <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                            💀 致命
                          </div>
                        )}

                        {/* 選中標記 */}
                        {selectedTrait === trait && (
                          <div className="absolute top-2 right-2">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 警告訊息 */}
                {isFatalSelection && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-center"
                  >
                    <p className="text-red-200 text-sm">
                      ⚠️ 警告：此選擇將導致角色死亡！
                    </p>
                  </motion.div>
                )}

                {/* 安全提示 */}
                {safeTraits.length > 0 && selectedTrait && safeTraits.includes(selectedTrait) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-900/50 border border-green-700 rounded-lg p-3 text-center"
                  >
                    <p className="text-green-200 text-sm">
                      ✓ 安全選擇：不會導致死亡
                    </p>
                  </motion.div>
                )}
              </div>

              {/* 按鈕區域 */}
              <div className="px-6 py-4 bg-gray-800 border-t border-gray-700 flex gap-3">
                {onCancel && (
                  <Button
                    variant="secondary"
                    onClick={handleCancel}
                    disabled={isAnimating}
                    className="flex-1"
                  >
                    取消
                  </Button>
                )}
                <Button
                  variant={isFatalSelection ? 'danger' : 'primary'}
                  onClick={handleConfirm}
                  disabled={!selectedTrait || isAnimating}
                  className="flex-1"
                >
                  {isAnimating ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      處理中...
                    </span>
                  ) : (
                    '確認'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DamageDialog;
