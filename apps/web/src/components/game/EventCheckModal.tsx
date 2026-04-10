'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, TieredOutcome } from '@betrayal/shared';

// 屬性類型
export type StatType = 'speed' | 'might' | 'sanity' | 'knowledge';

// 檢定結果
export interface EventCheckResult {
  success: boolean;
  roll: number;
  dice: number[];
  stat: StatType;
  target: number;
  message: string;
  effectDescription: string;
  statChanges?: Partial<Record<StatType, number>>;
  // Issue #234: 支援分層結果
  tieredOutcome?: TieredOutcome;
}

interface EventCheckModalProps {
  /** 是否顯示模態框 */
  isOpen: boolean;
  /** 事件卡 */
  card: Card | null;
  /** 玩家當前屬性值 */
  playerStatValue: number;
  /** 檢定結果 */
  checkResult: EventCheckResult | null;
  /** 是否正在擲骰 */
  isRolling: boolean;
  /** 關閉回調 */
  onClose: () => void;
  /** 擲骰回調 */
  onRoll: () => void;
}

/**
 * 事件卡屬性檢定模態框組件
 * 
 * 顯示事件卡的屬性檢定動畫和結果
 * - 顯示卡牌資訊和檢定要求
 * - 骰子滾動動畫
 * - 成功/失敗結果顯示
 * - 自動應用效果
 * - Issue #234: 支援分層結果顯示
 * 
 * @example
 * <EventCheckModal
 *   isOpen={showEventCheck}
 *   card={currentEventCard}
 *   playerStatValue={4}
 *   checkResult={checkResult}
 *   isRolling={isRolling}
 *   onClose={handleClose}
 *   onRoll={handleRoll}
 * />
 */
export function EventCheckModal({
  isOpen,
  card,
  playerStatValue,
  checkResult,
  isRolling,
  onClose,
  onRoll,
}: EventCheckModalProps) {
  const [showResult, setShowResult] = useState(false);
  const [diceValues, setDiceValues] = useState<number[]>([]);

  // 初始化骰子值（用於動畫）
  useEffect(() => {
    if (isOpen && isRolling) {
      const diceCount = Math.max(1, playerStatValue);
      setDiceValues(Array(diceCount).fill(null as unknown as number));
      setShowResult(false);
    }
  }, [isOpen, isRolling, playerStatValue]);

  // 當結果出來時顯示
  useEffect(() => {
    if (checkResult && !isRolling) {
      setDiceValues(checkResult.dice);
      const timer = setTimeout(() => {
        setShowResult(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [checkResult, isRolling]);

  // 如果沒有卡牌，不顯示
  if (!card) return null;

  // 骰子數量
  const diceCount = checkResult?.dice?.length ?? Math.max(1, playerStatValue);

  // 獲取屬性資訊
  const statInfo = getStatInfo(card.rollRequired?.stat);

  // Issue #234: 檢查是否使用分層結果系統
  const hasTieredOutcomes = !!card.tieredOutcomes && card.tieredOutcomes.length > 0;

  // Issue #234: 取得當前擲骰對應的結果索引
  const getActiveOutcomeIndex = (): number => {
    if (!hasTieredOutcomes || !checkResult) return -1;
    return card.tieredOutcomes!.findIndex(
      (outcome) => checkResult.roll >= outcome.minRoll && checkResult.roll <= outcome.maxRoll
    );
  };

  // Issue #234: 格式化擲骰範圍顯示
  const formatRollRange = (minRoll: number, maxRoll: number): string => {
    if (maxRoll >= 8) return `${minRoll}+`;
    if (minRoll === maxRoll) return `${minRoll}`;
    return `${minRoll}-${maxRoll}`;
  };

  // 骰子動畫變體
  const diceContainerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const diceVariants = {
    hidden: { 
      opacity: 0, 
      y: -50, 
      rotate: 0,
      scale: 0.5,
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      rotate: 360,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 15,
      },
    },
    rolling: {
      rotate: [0, 360, 720, 1080, 1440],
      scale: [1, 1.1, 0.9, 1.05, 1],
      transition: {
        duration: 1.5,
        ease: 'easeInOut' as const,
        repeat: Infinity,
      },
    },
  };

  // 結果動畫變體
  const resultVariants = {
    hidden: { opacity: 0, scale: 0.5, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 20,
      },
    },
  };

  // 渲染骰子
  const renderDice = () => {
    return (
      <motion.div
        className="flex justify-center gap-3 flex-wrap"
        variants={diceContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {Array.from({ length: diceCount }).map((_, index) => (
          <motion.div
            key={index}
            variants={diceVariants}
            animate={isRolling ? 'rolling' : 'visible'}
            className="relative"
          >
            <DiceFace value={isRolling ? undefined : diceValues[index]} />
          </motion.div>
        ))}
      </motion.div>
    );
  };

  // Issue #234: 渲染分層結果預覽（擲骰前顯示）
  const renderTieredOutcomesPreview = () => {
    if (!hasTieredOutcomes || checkResult) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-600/30"
      >
        <p className="text-gray-400 text-sm mb-3 text-center">可能結果</p>
        <div className="space-y-2">
          {card.tieredOutcomes!.map((outcome, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg bg-gray-700/30"
            >
              <span className="text-sm font-mono text-emerald-400 w-12 text-center">
                {formatRollRange(outcome.minRoll, outcome.maxRoll)}
              </span>
              <span className="text-gray-300 text-sm">{outcome.effect}</span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  // Issue #234: 渲染分層結果（擲骰後顯示，高亮當前結果）
  const renderTieredOutcomesResult = () => {
    if (!hasTieredOutcomes || !checkResult) return null;

    const activeIndex = getActiveOutcomeIndex();

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-600/30"
      >
        <p className="text-gray-400 text-sm mb-3 text-center">結果</p>
        <div className="space-y-2">
          {card.tieredOutcomes!.map((outcome, index) => {
            const isActive = index === activeIndex;
            return (
              <motion.div
                key={index}
                initial={isActive ? { scale: 0.95 } : {}}
                animate={isActive ? { scale: 1 } : {}}
                className={`
                  flex items-center gap-3 p-3 rounded-lg transition-all duration-300
                  ${isActive 
                    ? 'bg-emerald-500/20 border border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                    : 'bg-gray-700/30 opacity-50'
                  }
                `}
              >
                <span className={`
                  text-sm font-mono w-12 text-center
                  ${isActive ? 'text-emerald-400 font-bold' : 'text-gray-500'}
                `}>
                  {formatRollRange(outcome.minRoll, outcome.maxRoll)}
                </span>
                <span className={`
                  text-sm
                  ${isActive ? 'text-white font-medium' : 'text-gray-400'}
                `}>
                  {outcome.effect}
                </span>
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="ml-auto text-emerald-400"
                  >
                    ✓
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  };

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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-lg mx-4 max-h-[85vh]"
          >
            {/* 主容器 */}
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/20 overflow-hidden max-h-[85vh] flex flex-col">
              {/* 頂部裝飾 */}
              <div className="h-2 bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 flex-shrink-0" />
              
              {/* 內容區域 - scrollable */}
              <div className="p-6 sm:p-8 overflow-y-auto">
                {/* 標題和卡牌資訊 */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-6"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                    <span className="text-3xl">🎲</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    事件檢定
                  </h2>
                  <p className="text-emerald-300 text-lg">
                    {card.name}
                  </p>
                </motion.div>

                {/* 卡牌描述 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-black/20 rounded-xl p-4 mb-6 border border-white/10"
                >
                  <p className="text-white/90 text-center">{card.description}</p>
                </motion.div>

                {/* 檢定要求 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-emerald-900/30 rounded-xl p-4 mb-6 border border-emerald-500/30"
                >
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{statInfo.icon}</span>
                      <span className="text-white font-bold">{statInfo.name}</span>
                    </div>
                    <div className="text-emerald-400 text-xl">→</div>
                    <div className="px-4 py-2 bg-emerald-500/20 rounded-full">
                      <span className="text-emerald-300 font-bold">目標 ≥ {card.rollRequired?.target}</span>
                    </div>
                  </div>
                  <p className="text-center text-white/60 text-sm mt-2">
                    擲 {diceCount} 顆骰子（基於你的 {statInfo.name} 值）
                  </p>
                </motion.div>

                {/* Issue #234: 分層結果預覽（擲骰前） */}
                {renderTieredOutcomesPreview()}

                {/* 骰子區域 */}
                <div className="mb-6">
                  {isRolling ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-gray-400 mb-4"
                    >
                      擲骰中...
                    </motion.p>
                  ) : (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-gray-400 mb-4"
                    >
                      {checkResult ? '檢定結果' : '準備擲骰'}
                    </motion.p>
                  )}
                  
                  {renderDice()}
                </div>

                {/* Issue #234: 分層結果顯示（擲骰後） */}
                {hasTieredOutcomes && showResult && checkResult && renderTieredOutcomesResult()}

                {/* 結果顯示 */}
                <AnimatePresence>
                  {showResult && checkResult && (
                    <motion.div
                      variants={resultVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-center"
                    >
                      {/* 總和 */}
                      <div className="mb-4">
                        <p className="text-gray-400 text-sm mb-1">擲骰總和</p>
                        <p className="text-4xl font-bold text-white">
                          {checkResult.roll}
                        </p>
                        {!hasTieredOutcomes && (
                          <p className="text-gray-500 text-xs mt-1">
                            （目標 ≥ {checkResult.target}）
                          </p>
                        )}
                      </div>

                      {/* 成功/失敗狀態 - 只在非分層結果時顯示 */}
                      {!hasTieredOutcomes && (
                        checkResult.success ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-green-900/50 border border-green-500/50 rounded-xl p-4 mb-4"
                          >
                            <div className="text-4xl mb-2">✅</div>
                            <h3 className="text-xl font-bold text-green-400 mb-1">
                              檢定成功！
                            </h3>
                            <p className="text-green-300 text-sm">
                              {checkResult.effectDescription}
                            </p>
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-red-900/50 border border-red-500/50 rounded-xl p-4 mb-4"
                          >
                            <div className="text-4xl mb-2">❌</div>
                            <h3 className="text-xl font-bold text-red-400 mb-1">
                              檢定失敗！
                            </h3>
                            <p className="text-red-300 text-sm">
                              {checkResult.effectDescription}
                            </p>
                          </motion.div>
                        )
                      )}

                      {/* Issue #234: 分層結果的效果描述 */}
                      {hasTieredOutcomes && checkResult.tieredOutcome && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 }}
                          className="bg-emerald-900/50 border border-emerald-500/50 rounded-xl p-4 mb-4"
                        >
                          <div className="text-4xl mb-2">🎯</div>
                          <h3 className="text-xl font-bold text-emerald-400 mb-1">
                            結果生效
                          </h3>
                          <p className="text-emerald-300 text-sm">
                            {checkResult.tieredOutcome.effect}
                          </p>
                        </motion.div>
                      )}

                      {/* 按鈕 */}
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        onClick={onClose}
                        className={`
                          px-8 py-3 rounded-xl font-bold text-white
                          transition-all duration-200
                          ${checkResult.success || hasTieredOutcomes
                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30' 
                            : 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30'
                          }
                        `}
                      >
                        繼續
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 擲骰按鈕（尚未擲骰時顯示） */}
                {!checkResult && !isRolling && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center"
                  >
                    <button
                      onClick={onRoll}
                      className="
                        px-8 py-4 rounded-xl font-bold text-white text-lg
                        bg-emerald-600 hover:bg-emerald-500 
                        shadow-lg shadow-emerald-600/30
                        transition-all duration-200
                        transform hover:scale-105 active:scale-95
                      "
                    >
                      🎲 開始擲骰
                    </button>
                  </motion.div>
                )}
              </div>

              {/* 底部裝飾 */}
              <div className="h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            </div>

            {/* 背景光效 */}
            <div className="absolute -inset-4 bg-emerald-500/10 rounded-3xl blur-2xl -z-10" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 骰子面組件
 */
interface DiceFaceProps {
  value?: number | null;
}

function DiceFace({ value }: DiceFaceProps) {
  const isNull = value === null || value === undefined;

  return (
    <div className="relative w-14 h-14 sm:w-16 sm:h-16">
      {/* 骰子外框 */}
      <div className={`
        absolute inset-0 rounded-xl border-2
        ${!isNull
          ? 'bg-white border-gray-300'
          : 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300'
        }
        shadow-lg
      `}>
        {/* 骰子數值 */}
        {!isNull ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-gray-800">{value}</span>
          </div>
        ) : (
          /* 擲骰動畫中的問號 */
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">?</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 取得屬性資訊
 */
function getStatInfo(stat: StatType | undefined): { name: string; icon: string } {
  const statMap: Record<StatType, { name: string; icon: string }> = {
    speed: { name: '速度 Speed', icon: '⚡' },
    might: { name: '力量 Might', icon: '💪' },
    sanity: { name: '理智 Sanity', icon: '🧠' },
    knowledge: { name: '知識 Knowledge', icon: '📚' },
  };
  
  return stat ? statMap[stat] : { name: '未知', icon: '❓' };
}

export default EventCheckModal;
