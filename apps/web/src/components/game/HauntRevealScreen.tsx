'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { HauntRevelationResult, HauntScenario } from '@betrayal/game-engine';

interface HauntRevealScreenProps {
  /** 是否顯示 */
  isOpen: boolean;
  /** 作祟揭示結果 */
  revelation: HauntRevelationResult | null;
  /** 玩家名稱映射（playerId -> name） */
  playerNames: Record<string, string>;
  /** 當前玩家 ID */
  currentPlayerId: string;
  /** 開始作祟階段 */
  onStartHaunt: () => void;
}

/**
 * 作祟揭示畫面組件
 * 
 * 顯示作祟開始後的劇本、角色分配和目標
 * 
 * @example
 * <HauntRevealScreen
 *   isOpen={showReveal}
 *   revelation={revelationResult}
 *   playerNames={{ 'p1': 'Player 1' }}
 *   currentPlayerId="p1"
 *   onStartHaunt={handleStart}
 * />
 */
export function HauntRevealScreen({
  isOpen,
  revelation,
  playerNames,
  currentPlayerId,
  onStartHaunt,
}: HauntRevealScreenProps) {
  if (!revelation || !revelation.success || !revelation.scenario) {
    return null;
  }

  const { scenario, traitorId, heroIds, playerSides } = revelation;
  
  // 判斷當前玩家角色
  const currentPlayerSide = playerSides.get(currentPlayerId);
  const isCurrentPlayerTraitor = currentPlayerSide === 'traitor';
  const isCurrentPlayerHero = currentPlayerSide === 'hero';

  // 取得叛徒名稱
  const traitorName = traitorId ? (playerNames[traitorId] || '未知玩家') : '無';

  // 動畫變體
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 20,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9, rotateY: -15 },
    visible: {
      opacity: 1,
      scale: 1,
      rotateY: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 20,
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg overflow-y-auto py-8"
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative w-full max-w-2xl mx-4"
          >
            {/* 主容器 */}
            <div className="bg-gradient-to-b from-gray-800 via-gray-900 to-gray-900 rounded-3xl border-2 border-red-500/50 shadow-2xl shadow-red-500/20 overflow-hidden">
              {/* 頂部裝飾條 */}
              <div className="h-3 bg-gradient-to-r from-red-600 via-orange-500 via-yellow-500 via-orange-500 to-red-600" />
              
              {/* 標題區域 */}
              <motion.div
                variants={itemVariants}
                className="text-center pt-8 pb-6 px-6"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-4 border-2 border-red-500/50">
                  <span className="text-4xl">🎭</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  作祟揭示
                </h1>
                <p className="text-red-400 text-lg">
                  背叛的時刻到了
                </p>
              </motion.div>

              {/* 劇本資訊 */}
              <motion.div
                variants={itemVariants}
                className="px-6 sm:px-8 mb-6"
              >
                <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 rounded-2xl border border-red-500/30 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">📜</span>
                    <span className="text-red-300 text-sm uppercase tracking-wider">劇本</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {scenario.name}
                  </h2>
                  <p className="text-red-400/80 text-sm mb-3">
                    {scenario.nameEn}
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    {scenario.description}
                  </p>
                </div>
              </motion.div>

              {/* 叛徒資訊 */}
              <motion.div
                variants={itemVariants}
                className="px-6 sm:px-8 mb-6"
              >
                <div className={`
                  rounded-2xl border-2 p-6
                  ${isCurrentPlayerTraitor 
                    ? 'bg-red-900/40 border-red-500' 
                    : 'bg-gray-800/50 border-gray-600'
                  }
                `}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🦹</span>
                    <span className="text-red-400 text-sm uppercase tracking-wider">叛徒</span>
                    {isCurrentPlayerTraitor && (
                      <span className="ml-auto px-3 py-1 bg-red-600 rounded-full text-xs font-bold text-white">
                        就是你！
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold text-white">
                    {traitorName}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    叛徒將獲得特殊能力和目標
                  </p>
                </div>
              </motion.div>

              {/* 目標卡片區域 */}
              <motion.div
                variants={itemVariants}
                className="px-6 sm:px-8 mb-8"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 英雄目標 */}
                  <motion.div
                    variants={cardVariants}
                    className={`
                      rounded-2xl border-2 p-5
                      ${isCurrentPlayerHero 
                        ? 'bg-blue-900/40 border-blue-500' 
                        : 'bg-gray-800/50 border-gray-600'
                      }
                    `}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">🦸</span>
                      <span className="text-blue-400 font-bold">英雄目標</span>
                      {isCurrentPlayerHero && (
                        <span className="ml-auto px-2 py-0.5 bg-blue-600 rounded-full text-xs font-bold text-white">
                          你的任務
                        </span>
                      )}
                    </div>
                    <p className="text-white leading-relaxed">
                      {scenario.heroObjective}
                    </p>
                    <div className="mt-3 pt-3 border-t border-blue-500/20">
                      <p className="text-blue-300/70 text-xs">
                        勝利條件: {scenario.heroWinCondition}
                      </p>
                    </div>
                  </motion.div>

                  {/* 叛徒目標 */}
                  <motion.div
                    variants={cardVariants}
                    className={`
                      rounded-2xl border-2 p-5
                      ${isCurrentPlayerTraitor 
                        ? 'bg-red-900/40 border-red-500' 
                        : 'bg-gray-800/50 border-gray-600'
                      }
                    `}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">👹</span>
                      <span className="text-red-400 font-bold">叛徒目標</span>
                      {isCurrentPlayerTraitor && (
                        <span className="ml-auto px-2 py-0.5 bg-red-600 rounded-full text-xs font-bold text-white">
                          你的任務
                        </span>
                      )}
                    </div>
                    <p className="text-white leading-relaxed">
                      {scenario.traitorObjective || '消滅所有英雄'}
                    </p>
                    <div className="mt-3 pt-3 border-t border-red-500/20">
                      <p className="text-red-300/70 text-xs">
                        勝利條件: {scenario.traitorWinCondition}
                      </p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* 特殊規則 */}
              {scenario.specialRules && scenario.specialRules.length > 0 && (
                <motion.div
                  variants={itemVariants}
                  className="px-6 sm:px-8 mb-8"
                >
                  <div className="bg-yellow-900/20 rounded-2xl border border-yellow-500/30 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">⚠️</span>
                      <span className="text-yellow-400 font-bold">特殊規則</span>
                    </div>
                    <ul className="space-y-2">
                      {scenario.specialRules.map((rule, index) => (
                        <li key={index} className="flex items-start gap-2 text-yellow-200/80">
                          <span className="text-yellow-500 mt-1">•</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}

              {/* 玩家身份提示 */}
              <motion.div
                variants={itemVariants}
                className="px-6 sm:px-8 mb-8"
              >
                <div className={`
                  rounded-xl p-4 text-center
                  ${isCurrentPlayerTraitor 
                    ? 'bg-red-600/20 border border-red-500/50' 
                    : isCurrentPlayerHero 
                      ? 'bg-blue-600/20 border border-blue-500/50'
                      : 'bg-gray-700/50 border border-gray-600'
                  }
                `}>
                  <p className="text-lg font-bold text-white mb-1">
                    {isCurrentPlayerTraitor 
                      ? '你是叛徒！' 
                      : isCurrentPlayerHero 
                        ? '你是英雄！' 
                        : '你是旁觀者'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {isCurrentPlayerTraitor 
                      ? '隱藏你的意圖，完成你的邪惡目標' 
                      : isCurrentPlayerHero 
                        ? '與其他英雄合作，阻止叛徒的陰謀' 
                        : '觀看這場對決的結果'}
                  </p>
                </div>
              </motion.div>

              {/* 開始按鈕 */}
              <motion.div
                variants={itemVariants}
                className="px-6 sm:px-8 pb-8"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onStartHaunt}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl font-bold text-white text-lg shadow-lg shadow-red-600/30 transition-all duration-200"
                >
                  開始作祟階段
                </motion.button>
              </motion.div>

              {/* 底部裝飾 */}
              <div className="h-2 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
            </div>

            {/* 背景光效 */}
            <div className="absolute -inset-4 bg-red-500/5 rounded-3xl blur-3xl -z-10" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default HauntRevealScreen;
