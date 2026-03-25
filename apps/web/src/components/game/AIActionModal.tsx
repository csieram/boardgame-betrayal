'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIActionLog, getPersonalityIcon, getPersonalityColor, AIPersonality } from '@betrayal/game-engine';
import { Button } from '@betrayal/ui';

interface AIActionModalProps {
  /** 是否顯示模態框 */
  isOpen: boolean;
  /** AI 行動日誌列表 */
  actionLogs: AIActionLog[];
  /** 當前正在行動的 AI 玩家名稱 */
  currentAIPlayerName?: string;
  /** 關閉回調 */
  onClose: () => void;
  /** 繼續回調（點擊 Continue 按鈕） */
  onContinue: () => void;
  /** 是否自動顯示（當有新房間發現時） */
  autoShowOnDiscovery?: boolean;
}

/**
 * AI 行動日誌模態框
 * 
 * 顯示 AI 玩家的行動日誌，包括：
 * - AI 移動到新位置
 * - AI 探索並發現新房間
 * - AI 抽卡（事件、物品、預兆）
 * - 其他 AI 行動
 * 
 * 提供 [Continue] 按鈕讓玩家繼續遊戲
 * 
 * @example
 * <AIActionModal
 *   isOpen={showAIModal}
 *   actionLogs={aiActionLogs}
 *   currentAIPlayerName="Jenny"
 *   onClose={() => setShowAIModal(false)}
 *   onContinue={handleContinue}
 * />
 */
export function AIActionModal({
  isOpen,
  actionLogs,
  currentAIPlayerName,
  onClose,
  onContinue,
  autoShowOnDiscovery = true,
}: AIActionModalProps) {
  const [displayedLogs, setDisplayedLogs] = useState<AIActionLog[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // 當有新的日誌時，逐步顯示
  useEffect(() => {
    if (!isOpen || actionLogs.length === 0) {
      setDisplayedLogs([]);
      return;
    }

    // 找出新的日誌
    const newLogs = actionLogs.filter(
      log => !displayedLogs.some(d => d.timestamp === log.timestamp)
    );

    if (newLogs.length > 0) {
      setIsAnimating(true);
      
      // 逐步顯示新日誌
      let index = 0;
      const interval = setInterval(() => {
        if (index < newLogs.length) {
          setDisplayedLogs(prev => [...prev, newLogs[index]]);
          index++;
        } else {
          clearInterval(interval);
          setIsAnimating(false);
        }
      }, 600); // 每 600ms 顯示一條

      return () => clearInterval(interval);
    }
  }, [isOpen, actionLogs]);

  // 格式化時間戳
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 格式化行動描述
  const formatAction = (log: AIActionLog): { icon: string; text: string; color: string } => {
    // 防禦性檢查：確保 log 和 action 存在
    if (!log || !log.action) {
      return {
        icon: '❓',
        text: log?.playerName ? `${log.playerName} 執行行動` : 'AI 執行行動',
        color: '#9CA3AF',
      };
    }
    const action = log.action.toLowerCase();
    
    // 移動相關
    if (action.includes('move') || action.includes('移動')) {
      return {
        icon: '🚶',
        text: `${log.playerName} 移動到新位置`,
        color: '#3B82F6',
      };
    }
    
    // 探索/發現房間
    if (action.includes('explore') || action.includes('discover') || action.includes('探索') || action.includes('發現')) {
      return {
        icon: '🔍',
        text: `${log.playerName} ${log.action}`,
        color: '#F59E0B',
      };
    }
    
    // 抽卡 - 事件
    if (action.includes('event') || action.includes('事件')) {
      return {
        icon: '📜',
        text: `${log.playerName} 抽到事件卡`,
        color: '#10B981',
      };
    }
    
    // 抽卡 - 物品
    if (action.includes('item') || action.includes('物品')) {
      return {
        icon: '🎁',
        text: `${log.playerName} 抽到物品卡`,
        color: '#3B82F6',
      };
    }
    
    // 抽卡 - 預兆
    if (action.includes('omen') || action.includes('預兆')) {
      return {
        icon: '🌙',
        text: `${log.playerName} 抽到預兆卡`,
        color: '#8B5CF6',
      };
    }
    
    // 攻擊/戰鬥
    if (action.includes('attack') || action.includes('戰鬥') || action.includes('攻擊')) {
      return {
        icon: '⚔️',
        text: `${log.playerName} ${log.action}`,
        color: '#EF4444',
      };
    }
    
    // 使用物品
    if (action.includes('use') || action.includes('使用')) {
      return {
        icon: '✨',
        text: `${log.playerName} ${log.action}`,
        color: '#F59E0B',
      };
    }
    
    // 結束回合
    if (action.includes('end') || action.includes('結束')) {
      return {
        icon: '✅',
        text: `${log.playerName} 結束回合`,
        color: '#6B7280',
      };
    }
    
    // 預設
    return {
      icon: '🤖',
      text: `${log.playerName}: ${log.action}`,
      color: '#6B7280',
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-600 overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={e => e.stopPropagation()}
          >
            {/* 標題 */}
            <div className="bg-gray-700/50 px-6 py-4 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>🤖</span>
                  <span>AI 行動記錄</span>
                </h2>
                {currentAIPlayerName && (
                  <span className="text-sm text-blue-400">
                    {currentAIPlayerName}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                AI 玩家已完成以下行動
              </p>
            </div>

            {/* 行動列表 */}
            <div className="p-6 max-h-[400px] overflow-y-auto">
              {displayedLogs.length === 0 ? (
                <div className="text-center py-8">
                  <motion.div
                    className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <p className="text-gray-400">AI 正在思考...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedLogs.map((log, index) => {
                    const formatted = formatAction(log);
                    const isLatest = index === displayedLogs.length - 1;

                    return (
                      <motion.div
                        key={`${log?.timestamp ?? 'no-ts'}-${index}`}
                        className={`
                          flex items-start gap-3 p-3 rounded-lg
                          ${isLatest ? 'bg-gray-700/50' : 'bg-gray-800/30'}
                        `}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {/* 時間 */}
                        <span className="text-xs text-gray-500 whitespace-nowrap mt-0.5">
                          {log?.timestamp ? formatTime(log.timestamp) : '--:--'}
                        </span>

                        {/* 圖標 */}
                        <span
                          className="text-lg"
                          style={{ color: formatted.color }}
                        >
                          {formatted.icon}
                        </span>

                        {/* 內容 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200">
                            {formatted.text}
                          </p>
                          {log?.details && (
                            <p className="text-xs text-gray-500 mt-1">
                              {log.details}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* 正在動畫指示器 */}
                  {isAnimating && (
                    <motion.div
                      className="flex items-center gap-2 p-3 text-gray-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      <span className="text-sm">AI 正在行動...</span>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* 底部按鈕 */}
            <div className="px-6 py-4 border-t border-gray-600 bg-gray-700/30">
              <Button
                onClick={onContinue}
                variant="primary"
                className="w-full"
                disabled={isAnimating}
              >
                {isAnimating ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      ⏳
                    </motion.span>
                    等待 AI...
                  </span>
                ) : (
                  '繼續遊戲'
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * AI 行動通知氣泡
 * 
 * 用於在遊戲主畫面顯示簡短的 AI 行動通知
 */
interface AIActionNotificationProps {
  /** 最新的 AI 行動日誌 */
  latestLog: AIActionLog | null;
  /** 自動隱藏時間（毫秒） */
  autoHideDelay?: number;
}

export function AIActionNotification({
  latestLog,
  autoHideDelay = 3000,
}: AIActionNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (latestLog) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [latestLog, autoHideDelay]);

  if (!latestLog || !isVisible) {
    return null;
  }

  const formatAction = (log: AIActionLog): { icon: string; text: string } => {
    // 防禦性檢查：確保 log 和 action 存在
    if (!log || !log.action) {
      return { icon: '❓', text: log?.playerName ? `${log.playerName} 執行行動` : 'AI 執行行動' };
    }
    const action = log.action.toLowerCase();
    
    if (action.includes('move') || action.includes('移動')) {
      return { icon: '🚶', text: '移動了' };
    }
    if (action.includes('explore') || action.includes('discover') || action.includes('探索') || action.includes('發現')) {
      return { icon: '🔍', text: log.action };
    }
    if (action.includes('event') || action.includes('事件')) {
      return { icon: '📜', text: '抽到事件卡' };
    }
    if (action.includes('item') || action.includes('物品')) {
      return { icon: '🎁', text: '抽到物品卡' };
    }
    if (action.includes('omen') || action.includes('預兆')) {
      return { icon: '🌙', text: '抽到預兆卡' };
    }
    if (action.includes('attack') || action.includes('戰鬥') || action.includes('攻擊')) {
      return { icon: '⚔️', text: log.action };
    }
    
    return { icon: '🤖', text: log.action };
  };

  const formatted = formatAction(latestLog);

  return (
    <motion.div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
    >
      <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-600 rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
        <span>{formatted.icon}</span>
        <span className="text-sm">
          <span className="text-blue-400">{latestLog.playerName}</span>
          <span className="text-gray-300 ml-1">{formatted.text}</span>
        </span>
      </div>
    </motion.div>
  );
}

export default AIActionModal;
