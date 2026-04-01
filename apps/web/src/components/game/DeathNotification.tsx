'use client';

/**
 * DeathNotification Component
 * 
 * 顯示玩家死亡通知
 * 
 * Rulebook Reference: Page 19 - 作祟階段死亡
 * - 角色死亡後留下屍體在房間
 * - 其他玩家可以搜刮屍體
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@betrayal/ui';
import { DeathResult, TRAIT_NAMES } from '@betrayal/game-engine';

interface DeathNotificationProps {
  /** 是否顯示通知 */
  isOpen: boolean;
  /** 死亡結果 */
  deathResult: DeathResult | null;
  /** 確認回調 */
  onConfirm: () => void;
}

export function DeathNotification({
  isOpen,
  deathResult,
  onConfirm,
}: DeathNotificationProps) {
  if (!isOpen || !deathResult) return null;

  const { playerName, causeOfDeath, finalStats, items, omens } = deathResult;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg mx-4"
          >
            {/* 背景卡片 */}
            <div className="bg-gray-900 border-2 border-red-800 rounded-lg shadow-2xl overflow-hidden">
              {/* 標題區域 */}
              <div className="bg-gradient-to-b from-red-950 to-red-900 px-8 py-6 border-b border-red-800 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="text-6xl mb-4"
                >
                  💀
                </motion.div>
                <h2 className="text-3xl font-bold text-red-100 mb-2">
                  角色死亡
                </h2>
                <p className="text-red-300">
                  {playerName} 已經死亡
                </p>
              </div>

              {/* 內容區域 */}
              <div className="p-8 space-y-6">
                {/* 死因 */}
                <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-center">
                  <p className="text-red-200 text-lg">
                    死因：<span className="font-bold text-red-100">{causeOfDeath}</span>
                  </p>
                </div>

                {/* 最終屬性 */}
                <div>
                  <h3 className="text-gray-400 text-sm mb-3 text-center">最終屬性</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {(['might', 'speed', 'knowledge', 'sanity'] as const).map((stat) => {
                      const value = finalStats[stat];
                      const isZero = value <= 0;

                      return (
                        <div
                          key={stat}
                          className={`
                            p-3 rounded-lg text-center border
                            ${isZero
                              ? 'bg-red-900/50 border-red-700'
                              : 'bg-gray-800 border-gray-700'
                            }
                          `}
                        >
                          <div className="text-xs text-gray-400 mb-1">
                            {TRAIT_NAMES[stat]}
                          </div>
                          <div className={`text-xl font-bold ${isZero ? 'text-red-400' : 'text-gray-200'}`}>
                            {value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 持有物品 */}
                {(items.length > 0 || omens.length > 0) && (
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-gray-400 text-sm mb-3 text-center">遺留物品</h3>
                    <div className="flex justify-center gap-4">
                      {items.length > 0 && (
                        <div className="text-center">
                          <span className="text-2xl">📦</span>
                          <p className="text-gray-300 text-sm mt-1">
                            物品：{items.length} 個
                          </p>
                        </div>
                      )}
                      {omens.length > 0 && (
                        <div className="text-center">
                          <span className="text-2xl">🔮</span>
                          <p className="text-gray-300 text-sm mt-1">
                            預兆：{omens.length} 個
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs text-center mt-3">
                      其他玩家可以搜刮屍體取得這些物品
                    </p>
                  </div>
                )}

                {/* 提示訊息 */}
                <div className="text-center text-gray-500 text-sm">
                  <p>屍體留在原地，成為這座房子的又一名犧牲者...</p>
                </div>
              </div>

              {/* 按鈕區域 */}
              <div className="px-8 py-6 bg-gray-800 border-t border-gray-700">
                <Button
                  variant="danger"
                  onClick={onConfirm}
                  className="w-full py-3 text-lg"
                >
                  確認
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DeathNotification;
