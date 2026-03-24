'use client';

import { motion } from 'framer-motion';
import { Character } from '@betrayal/shared';
import { AIPersonality, getPersonalityIcon, getPersonalityColor } from '@betrayal/game-engine';

interface AIPawnProps {
  /** AI 角色資料 */
  character: Character;
  /** AI 個性 */
  personality: AIPersonality;
  /** AI 名稱 */
  name: string;
  /** 是否為當前回合 */
  isCurrentTurn?: boolean;
  /** 是否正在行動 */
  isActing?: boolean;
  /** 點擊回調 */
  onClick?: () => void;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否顯示動畫 */
  animate?: boolean;
  /** 活動描述（用於 tooltip） */
  activity?: string;
}

/**
 * AI 玩家標記組件 (AIPawn)
 * 
 * 顯示 AI 玩家在遊戲板上的標記，特色：
 * - 迷你角色頭像
 * - 根據個性顯示不同邊框顏色
 * - 懸停顯示名稱和活動
 * - 當前回合時有脈衝動畫
 * 
 * @example
 * <AIPawn 
 *   character={character}
 *   personality="explorer"
 *   name="Jenny"
 *   isCurrentTurn={true}
 *   size="md"
 * />
 */
export function AIPawn({
  character,
  personality,
  name,
  isCurrentTurn = false,
  isActing = false,
  onClick,
  size = 'md',
  animate = true,
  activity,
}: AIPawnProps) {
  const personalityColor = getPersonalityColor(personality);
  const personalityIcon = getPersonalityIcon(personality);

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const borderSizes = {
    sm: 'border-2',
    md: 'border-2',
    lg: 'border-[3px]',
  };

  const iconSizes = {
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <motion.div
      className="relative group cursor-pointer"
      onClick={onClick}
      initial={animate ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        type: 'spring',
        stiffness: 500,
        damping: 30,
        duration: 0.3
      }}
      whileHover={{ scale: 1.2, zIndex: 50 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* AI 標記本體 */}
      <motion.div
        className={`
          relative rounded-full overflow-hidden
          ${sizeClasses[size]}
          ${borderSizes[size]}
        `}
        style={{ 
          borderColor: personalityColor,
          backgroundColor: character.color,
          boxShadow: isCurrentTurn 
            ? `0 0 12px ${personalityColor}, 0 0 4px ${personalityColor}40` 
            : `0 2px 4px rgba(0,0,0,0.3)`
        }}
        animate={isCurrentTurn ? {
          boxShadow: [
            `0 0 8px ${personalityColor}`,
            `0 0 16px ${personalityColor}`,
            `0 0 8px ${personalityColor}`,
          ]
        } : {}}
        transition={{ 
          duration: 1.5, 
          repeat: isCurrentTurn ? Infinity : 0,
          ease: 'easeInOut'
        }}
      >
        {/* 角色肖像 */}
        {character.portraitSvg ? (
          <img
            src={`/betrayal${character.portraitSvg}`}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center text-white font-bold"
            style={{ fontSize: size === 'sm' ? '8px' : size === 'md' ? '10px' : '12px' }}
          >
            {name[0]}
          </div>
        )}

        {/* 個性圖標（右下角小標記） */}
        <div 
          className={`
            absolute -bottom-0.5 -right-0.5 
            w-3 h-3 rounded-full 
            flex items-center justify-center
            ${iconSizes[size]}
            bg-gray-800 border border-gray-600
          `}
          style={{ color: personalityColor }}
        >
          {personalityIcon}
        </div>

        {/* 行動中指示器 */}
        {isActing && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white"
            animate={{ 
              rotate: 360,
              borderColor: ['#ffffff', personalityColor, '#ffffff']
            }}
            transition={{ 
              duration: 1, 
              repeat: Infinity,
              ease: 'linear'
            }}
          />
        )}
      </motion.div>

      {/* 懸停提示框 */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span style={{ color: personalityColor }}>{personalityIcon}</span>
            <span className="font-medium text-white text-sm">{name}</span>
            <span 
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ 
                backgroundColor: `${personalityColor}20`,
                color: personalityColor 
              }}
            >
              AI
            </span>
          </div>
          {activity && (
            <p className="text-xs text-gray-400 mt-1">{activity}</p>
          )}
          {/* 小三角 */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800/95" />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * AI 標記群組組件
 * 
 * 當多個 AI 玩家在同一個房間時使用
 */
interface AIPawnGroupProps {
  /** AI 玩家列表 */
  aiPlayers: Array<{
    character: Character;
    personality: AIPersonality;
    name: string;
    id: string;
    isCurrentTurn?: boolean;
    isActing?: boolean;
  }>;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 最大顯示數量 */
  maxDisplay?: number;
  /** 點擊 AI 的回調 */
  onAIClick?: (aiId: string) => void;
}

export function AIPawnGroup({
  aiPlayers,
  size = 'md',
  maxDisplay = 3,
  onAIClick,
}: AIPawnGroupProps) {
  const displayPlayers = aiPlayers.slice(0, maxDisplay);
  const remainingCount = aiPlayers.length - maxDisplay;

  // 根據數量計算佈局
  const getPosition = (index: number, total: number) => {
    if (total === 1) return { x: 0, y: 0 };
    if (total === 2) {
      return index === 0 ? { x: -6, y: 0 } : { x: 6, y: 0 };
    }
    // 3個或更多
    if (index === 0) return { x: 0, y: -6 };
    if (index === 1) return { x: -6, y: 6 };
    return { x: 6, y: 6 };
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {displayPlayers.map((ai, index) => {
        const pos = getPosition(index, Math.min(aiPlayers.length, maxDisplay));
        return (
          <motion.div
            key={ai.id}
            className="absolute"
            initial={{ x: 0, y: 0 }}
            animate={{ x: pos.x, y: pos.y }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <AIPawn
              character={ai.character}
              personality={ai.personality}
              name={ai.name}
              isCurrentTurn={ai.isCurrentTurn}
              isActing={ai.isActing}
              size={size}
              onClick={() => onAIClick?.(ai.id)}
            />
          </motion.div>
        );
      })}
      
      {/* 顯示剩餘 AI 數量 */}
      {remainingCount > 0 && (
        <motion.div
          className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2"
          style={{ borderColor: '#6B7280' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          +{remainingCount}
        </motion.div>
      )}
    </div>
  );
}

export default AIPawn;
