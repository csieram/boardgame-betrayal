'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIActionLog, getPersonalityIcon, getPersonalityColor, AIPersonality } from '@betrayal/game-engine';

interface AIActivityLogProps {
  /** AI 行動日誌列表 */
  actionLogs: AIActionLog[];
  /** 當前正在行動的 AI 玩家 ID */
  currentAIPlayerId?: string | null;
  /** 最大顯示數量 */
  maxDisplay?: number;
  /** 是否自動滾動到底部 */
  autoScroll?: boolean;
  /** 自定義類名 */
  className?: string;
}

/**
 * AI 活動日誌面板 (AIActivityLog)
 * 
 * 顯示 AI 玩家的活動日誌，以樹狀結構呈現：
 * ```
 * 🤖 Jenny's Turn
 * ├── Moving to Upper Floor...
 * ├── Exploring new room: Library
 * ├── Drew Event card
 * └── Turn complete
 * ```
 * 
 * @example
 * <AIActivityLog
 *   actionLogs={aiActionLogs}
 *   currentAIPlayerId="ai-player-1"
 *   maxDisplay={50}
 * />
 */
export function AIActivityLog({
  actionLogs,
  currentAIPlayerId,
  maxDisplay = 50,
  autoScroll = true,
  className = '',
}: AIActivityLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedTurns, setExpandedTurns] = useState<Set<number>>(new Set());

  // 自動滾動到底部
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [actionLogs, autoScroll]);

  // 按回合分組日誌
  const groupedLogs = groupLogsByTurn(actionLogs);

  // 切換回合展開狀態
  const toggleTurn = (turn: number) => {
    setExpandedTurns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(turn)) {
        newSet.delete(turn);
      } else {
        newSet.add(turn);
      }
      return newSet;
    });
  };

  // 展開所有回合
  const expandAll = () => {
    setExpandedTurns(new Set(groupedLogs.map(g => g.turn)));
  };

  // 收起所有回合
  const collapseAll = () => {
    setExpandedTurns(new Set());
  };

  if (actionLogs.length === 0) {
    return (
      <div className={`bg-gray-800/50 rounded-xl p-4 border border-gray-700 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>🤖</span>
            <span>AI 活動記錄</span>
          </h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">尚無 AI 活動記錄</p>
          <p className="text-xs mt-1">AI 玩家行動將顯示在這裡</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* 標題列 */}
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/80">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>🤖</span>
            <span>AI 活動記錄</span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {actionLogs.length} 條記錄
            </span>
            <button
              onClick={expandAll}
              className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-900/30 transition-colors"
            >
              展開全部
            </button>
            <button
              onClick={collapseAll}
              className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-700/50 transition-colors"
            >
              收起全部
            </button>
          </div>
        </div>
      </div>

      {/* 日誌列表 */}
      <div 
        ref={scrollRef}
        className="max-h-[400px] overflow-y-auto p-4 space-y-4"
      >
        <AnimatePresence>
          {groupedLogs.slice(-maxDisplay).map((group) => (
            <TurnLogGroup
              key={group.turn}
              group={group}
              isExpanded={expandedTurns.has(group.turn)}
              onToggle={() => toggleTurn(group.turn)}
              currentAIPlayerId={currentAIPlayerId}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * 回合日誌群組
 */
interface TurnLogGroupProps {
  group: {
    turn: number;
    playerName: string;
    playerId: string;
    personality?: AIPersonality;
    logs: AIActionLog[];
  };
  isExpanded: boolean;
  onToggle: () => void;
  currentAIPlayerId?: string | null;
}

function TurnLogGroup({ group, isExpanded, onToggle, currentAIPlayerId }: TurnLogGroupProps) {
  const isCurrentTurn = group.logs.some(log => log.playerId === currentAIPlayerId);
  const personalityColor = group.personality ? getPersonalityColor(group.personality) : '#6B7280';
  const personalityIcon = group.personality ? getPersonalityIcon(group.personality) : '🤖';

  // 格式化行動描述
  const formatAction = (action: string): { icon: string; text: string; color: string } => {
    const actionLower = action.toLowerCase();
    
    // 回合開始/結束
    if (actionLower.includes('開始回合') || actionLower.includes('turn start')) {
      return { icon: '▶️', text: action, color: '#3B82F6' };
    }
    if (actionLower.includes('結束回合') || actionLower.includes('turn end') || actionLower.includes('turn complete')) {
      return { icon: '✅', text: action, color: '#6B7280' };
    }
    
    // 移動
    if (actionLower.includes('移動') || actionLower.includes('move')) {
      return { icon: '🚶', text: action, color: '#3B82F6' };
    }
    
    // 探索/發現
    if (actionLower.includes('探索') || actionLower.includes('發現') || actionLower.includes('explore') || actionLower.includes('discover')) {
      return { icon: '🔍', text: action, color: '#F59E0B' };
    }
    
    // 抽卡
    if (actionLower.includes('事件') || actionLower.includes('event')) {
      return { icon: '📜', text: action, color: '#10B981' };
    }
    if (actionLower.includes('物品') || actionLower.includes('item')) {
      return { icon: '🎁', text: action, color: '#3B82F6' };
    }
    if (actionLower.includes('預兆') || actionLower.includes('omen')) {
      return { icon: '🌙', text: action, color: '#8B5CF6' };
    }
    if (actionLower.includes('抽卡') || actionLower.includes('draw')) {
      return { icon: '🃏', text: action, color: '#F59E0B' };
    }
    
    // 戰鬥
    if (actionLower.includes('攻擊') || actionLower.includes('戰鬥') || actionLower.includes('attack') || actionLower.includes('combat')) {
      return { icon: '⚔️', text: action, color: '#EF4444' };
    }
    
    // 使用物品
    if (actionLower.includes('使用') || actionLower.includes('use')) {
      return { icon: '✨', text: action, color: '#F59E0B' };
    }
    
    // 預設
    return { icon: '🤖', text: action, color: '#6B7280' };
  };

  return (
    <motion.div
      className={`
        rounded-lg border overflow-hidden
        ${isCurrentTurn ? 'border-blue-500/30 bg-blue-900/10' : 'border-gray-700/50 bg-gray-800/30'}
      `}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* 回合標題 */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <motion.span 
            className="text-sm"
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▶
          </motion.span>
          <span style={{ color: personalityColor }}>{personalityIcon}</span>
          <span className="font-medium text-white text-sm">{group.playerName}</span>
          <span className="text-xs text-gray-500">回合 {group.turn}</span>
          {isCurrentTurn && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
              進行中
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{group.logs.length} 個行動</span>
      </button>

      {/* 行動列表 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pl-8 space-y-1">
              {group.logs.map((log, index) => {
                const formatted = formatAction(log.action);
                const isLast = index === group.logs.length - 1;
                
                return (
                  <motion.div
                    key={`${log.timestamp}-${index}`}
                    className="flex items-start gap-2 text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {/* 樹狀線條 */}
                    <span className="text-gray-600 font-mono select-none">
                      {isLast ? '└──' : '├──'}
                    </span>
                    
                    {/* 圖標 */}
                    <span style={{ color: formatted.color }}>{formatted.icon}</span>
                    
                    {/* 內容 */}
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-300">{formatted.text}</span>
                      {log.details && (
                        <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * 按回合分組日誌
 */
function groupLogsByTurn(logs: AIActionLog[]): Array<{
  turn: number;
  playerName: string;
  playerId: string;
  personality?: AIPersonality;
  logs: AIActionLog[];
}> {
  const groups = new Map<number, AIActionLog[]>();
  
  // 按回合分組
  logs.forEach(log => {
    if (!groups.has(log.turn)) {
      groups.set(log.turn, []);
    }
    groups.get(log.turn)!.push(log);
  });

  // 轉換為數組並排序
  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([turn, turnLogs]) => {
      const firstLog = turnLogs[0];
      return {
        turn,
        playerName: firstLog.playerName,
        playerId: firstLog.playerId,
        logs: turnLogs,
      };
    });
}

/**
 * AI 活動通知氣泡
 * 
 * 用於在遊戲主畫面顯示最新的 AI 活動
 */
interface AIActivityNotificationProps {
  /** 最新的 AI 行動日誌 */
  latestLog: AIActionLog | null;
  /** 自動隱藏時間（毫秒） */
  autoHideDelay?: number;
}

export function AIActivityNotification({
  latestLog,
  autoHideDelay = 4000,
}: AIActivityNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayLog, setDisplayLog] = useState<AIActionLog | null>(null);

  useEffect(() => {
    if (latestLog) {
      setDisplayLog(latestLog);
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    }
  }, [latestLog, autoHideDelay]);

  if (!displayLog || !isVisible) {
    return null;
  }

  const formatAction = (action: string): { icon: string; text: string; color: string } => {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('移動') || actionLower.includes('move')) {
      return { icon: '🚶', text: '移動中...', color: '#3B82F6' };
    }
    if (actionLower.includes('探索') || actionLower.includes('發現') || actionLower.includes('explore') || actionLower.includes('discover')) {
      return { icon: '🔍', text: '探索新房間...', color: '#F59E0B' };
    }
    if (actionLower.includes('事件') || actionLower.includes('event')) {
      return { icon: '📜', text: '抽到事件卡', color: '#10B981' };
    }
    if (actionLower.includes('物品') || actionLower.includes('item')) {
      return { icon: '🎁', text: '抽到物品卡', color: '#3B82F6' };
    }
    if (actionLower.includes('預兆') || actionLower.includes('omen')) {
      return { icon: '🌙', text: '抽到預兆卡', color: '#8B5CF6' };
    }
    if (actionLower.includes('攻擊') || actionLower.includes('戰鬥') || actionLower.includes('attack')) {
      return { icon: '⚔️', text: '發起攻擊！', color: '#EF4444' };
    }
    if (actionLower.includes('結束') || actionLower.includes('end')) {
      return { icon: '✅', text: '回合結束', color: '#6B7280' };
    }
    
    return { icon: '🤖', text: action, color: '#6B7280' };
  };

  const formatted = formatAction(displayLog.action);

  return (
    <motion.div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
    >
      <div 
        className="rounded-full px-4 py-2 shadow-lg flex items-center gap-2 border"
        style={{ 
          backgroundColor: 'rgba(31, 41, 55, 0.95)',
          borderColor: `${formatted.color}40`,
          backdropFilter: 'blur(8px)'
        }}
      >
        <span style={{ color: formatted.color }}>{formatted.icon}</span>
        <span className="text-sm">
          <span className="text-blue-400 font-medium">{displayLog.playerName}</span>
          <span className="text-gray-300 ml-1">{formatted.text}</span>
        </span>
        {displayLog.details && (
          <span className="text-xs text-gray-500 ml-1">{displayLog.details}</span>
        )}
      </div>
    </motion.div>
  );
}

/**
 * 簡化版 AI 活動指示器
 * 
 * 用於顯示當前 AI 活動的簡短狀態
 */
interface AIActivityIndicatorProps {
  /** 當前活動描述 */
  activity: string;
  /** AI 名稱 */
  aiName: string;
  /** 是否顯示 */
  isVisible: boolean;
}

export function AIActivityIndicator({
  activity,
  aiName,
  isVisible,
}: AIActivityIndicatorProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed top-24 left-1/2 -translate-x-1/2 z-40"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-gray-800/95 backdrop-blur-sm border border-blue-500/30 rounded-lg px-4 py-2 shadow-xl flex items-center gap-3">
        <motion.div
          className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <div>
          <span className="text-blue-400 font-medium">{aiName}</span>
          <span className="text-gray-300 ml-2">{activity}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default AIActivityLog;
