'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HauntRollResult } from '@betrayal/game-engine';

interface HauntRollModalProps {
  /** 是否顯示模態框 */
  isOpen: boolean;
  /** 預兆數量（決定骰子數量） */
  omenCount: number;
  /** 擲骰結果 */
  rollResult: HauntRollResult | null;
  /** 是否正在擲骰 */
  isRolling: boolean;
  /** 關閉回調（當作祟未觸發時） */
  onClose: () => void;
  /** 繼續到作祟揭示（當作祟觸發時） */
  onProceedToReveal: () => void;
}

/**
 * 作祟檢定模態框組件
 * 
 * 顯示預兆抽取後的作祟檢定動畫
 * - 骰子滾動動畫
 * - 結果顯示
 * - 作祟觸發/未觸發狀態
 * 
 * @example
 * <HauntRollModal
 *   isOpen={showHauntRoll}
 *   omenCount={3}
 *   rollResult={hauntRollResult}
 *   isRolling={isRolling}
 *   onClose={handleClose}
 *   onProceedToReveal={handleReveal}
 * />
 */
export function HauntRollModal({
  isOpen,
  omenCount,
  rollResult,
  isRolling,
  onClose,
  onProceedToReveal,
}: HauntRollModalProps) {
  const [showResult, setShowResult] = useState(false);
  const [diceValues, setDiceValues] = useState<number[]>([]);

  // 初始化骰子值（用於動畫）
  useEffect(() => {
    if (isOpen && isRolling) {
      const diceCount = Math.max(1, omenCount);
      setDiceValues(Array(diceCount).fill(0));
      setShowResult(false);
    }
  }, [isOpen, isRolling, omenCount]);

  // 當結果出來時顯示
  useEffect(() => {
    if (rollResult && !isRolling) {
      setDiceValues(rollResult.dice);
      const timer = setTimeout(() => {
        setShowResult(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [rollResult, isRolling]);

  // 骰子數量
  const diceCount = Math.max(1, omenCount);

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

  // 作祟觸發動畫
  const hauntTriggeredVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 15,
        delay: 0.3,
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
            className="relative w-full max-w-md mx-4"
          >
            {/* 主容器 */}
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 overflow-hidden">
              {/* 頂部裝飾 */}
              <div className="h-2 bg-gradient-to-r from-purple-600 via-purple-400 to-purple-600" />
              
              {/* 內容區域 */}
              <div className="p-6 sm:p-8">
                {/* 標題 */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-6"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
                    <span className="text-3xl">🌙</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    預兆抽取
                  </h2>
                  <p className="text-purple-300">
                    需要進行作祟檢定
                  </p>
                </motion.div>

                {/* 骰子區域 */}
                <div className="mb-6">
                  {isRolling ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-gray-400 mb-4"
                    >
                      擲 {diceCount} 顆骰子...
                    </motion.p>
                  ) : (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-gray-400 mb-4"
                    >
                      擲出 {diceCount} 顆骰子
                    </motion.p>
                  )}
                  
                  {renderDice()}
                </div>

                {/* 結果顯示 */}
                <AnimatePresence>
                  {showResult && rollResult && (
                    <motion.div
                      variants={resultVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-center"
                    >
                      {/* 總和 */}
                      <div className="mb-4">
                        <p className="text-gray-400 text-sm mb-1">結果</p>
                        <p className="text-4xl font-bold text-white">
                          {rollResult.total}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          （閾值 &lt; 5 觸發作祟）
                        </p>
                      </div>

                      {/* 作祟狀態 */}
                      {rollResult.hauntBegins ? (
                        <motion.div
                          variants={hauntTriggeredVariants}
                          initial="hidden"
                          animate="visible"
                          className="bg-red-900/50 border border-red-500/50 rounded-xl p-4 mb-4"
                        >
                          <div className="text-4xl mb-2">🎭</div>
                          <h3 className="text-xl font-bold text-red-400 mb-1">
                            作祟開始！
                          </h3>
                          <p className="text-red-300 text-sm">
                            {rollResult.total} &lt; 5，作祟被觸發
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          variants={hauntTriggeredVariants}
                          initial="hidden"
                          animate="visible"
                          className="bg-green-900/50 border border-green-500/50 rounded-xl p-4 mb-4"
                        >
                          <div className="text-4xl mb-2">✨</div>
                          <h3 className="text-xl font-bold text-green-400 mb-1">
                            安全
                          </h3>
                          <p className="text-green-300 text-sm">
                            {rollResult.total} ≥ 5，作祟未觸發
                          </p>
                        </motion.div>
                      )}

                      {/* 按鈕 */}
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        onClick={rollResult.hauntBegins ? onProceedToReveal : onClose}
                        className={`
                          px-8 py-3 rounded-xl font-bold text-white
                          transition-all duration-200
                          ${rollResult.hauntBegins 
                            ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30' 
                            : 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/30'
                          }
                        `}
                      >
                        {rollResult.hauntBegins ? '揭示作祟' : '繼續遊戲'}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 底部裝飾 */}
              <div className="h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
            </div>

            {/* 背景光效 */}
            <div className="absolute -inset-4 bg-purple-500/10 rounded-3xl blur-2xl -z-10" />
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
  value?: number;
}

function DiceFace({ value }: DiceFaceProps) {
  // 骰子點數配置（Betrayal 使用 0,0,1,1,2,2 的骰子）
  const getDots = (val: number | undefined): number[] => {
    if (val === undefined) return [];
    // 0 = 無點, 1 = 2點, 2 = 4點
    const dotCount = val === 0 ? 0 : val === 1 ? 2 : 4;
    return Array.from({ length: dotCount }, (_, i) => i);
  };

  const dots = getDots(value);

  return (
    <div className="relative w-14 h-14 sm:w-16 sm:h-16">
      {/* 骰子外框 */}
      <div className={`
        absolute inset-0 rounded-xl border-2
        ${value !== undefined 
          ? 'bg-white border-gray-300' 
          : 'bg-gradient-to-br from-purple-400 to-purple-600 border-purple-300'
        }
        shadow-lg
      `}>
        {/* 點數 */}
        {value !== undefined ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {dots.length === 0 ? (
              <span className="text-2xl font-bold text-gray-400">0</span>
            ) : (
              <div className={`grid gap-1 ${
                dots.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'
              }`}>
                {dots.map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gray-800"
                  />
                ))}
              </div>
            )}
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

export default HauntRollModal;
