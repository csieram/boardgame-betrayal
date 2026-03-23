'use client';

import { motion } from 'framer-motion';
import { Character } from '@betrayal/shared';

interface PlayerTokenProps {
  /** 角色資料 */
  character: Character;
  /** 是否為當前玩家 */
  isCurrentPlayer?: boolean;
  /** 點擊回調 */
  onClick?: () => void;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否顯示動畫 */
  animate?: boolean;
}

/**
 * 玩家標記組件
 * 
 * 顯示角色在房間上的標記，帶有動畫效果
 * 
 * @example
 * <PlayerToken 
 *   character={character}
 *   isCurrentPlayer={true}
 *   size="md"
 * />
 */
export function PlayerToken({
  character,
  isCurrentPlayer = false,
  onClick,
  size = 'md',
  animate = true,
}: PlayerTokenProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const ringSizes = {
    sm: 'ring-1',
    md: 'ring-2',
    lg: 'ring-2',
  };

  return (
    <motion.div
      className={`
        relative rounded-full overflow-hidden cursor-pointer
        ${sizeClasses[size]}
        ${isCurrentPlayer ? `${ringSizes[size]} ring-white ring-offset-1 ring-offset-gray-900` : ''}
      `}
      style={{ 
        backgroundColor: character.color,
        boxShadow: isCurrentPlayer ? `0 0 10px ${character.color}` : 'none'
      }}
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
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* 角色肖像 */}
      {character.portraitSvg ? (
        <img
          src={`/betrayal${character.portraitSvg}`}
          alt={character.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div 
          className="w-full h-full flex items-center justify-center text-white font-bold text-xs"
          style={{ backgroundColor: character.color }}
        >
          {character.name[0]}
        </div>
      )}

      {/* 當前玩家指示器 */}
      {isCurrentPlayer && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white"
          animate={{ 
            boxShadow: [
              `0 0 0px ${character.color}`,
              `0 0 8px ${character.color}`,
              `0 0 0px ${character.color}`,
            ]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      )}
    </motion.div>
  );
}

/**
 * 多個玩家標記組件
 * 
 * 當多個玩家在同一個房間時使用
 */
interface PlayerTokenGroupProps {
  /** 角色列表 */
  characters: Character[];
  /** 當前玩家索引 */
  currentPlayerIndex?: number;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 最大顯示數量 */
  maxDisplay?: number;
}

export function PlayerTokenGroup({
  characters,
  currentPlayerIndex = 0,
  size = 'md',
  maxDisplay = 4,
}: PlayerTokenGroupProps) {
  const displayCharacters = characters.slice(0, maxDisplay);
  const remainingCount = characters.length - maxDisplay;

  // 根據數量計算佈局
  const getPosition = (index: number, total: number) => {
    if (total === 1) return { x: 0, y: 0 };
    if (total === 2) {
      return index === 0 ? { x: -8, y: 0 } : { x: 8, y: 0 };
    }
    if (total === 3) {
      if (index === 0) return { x: 0, y: -8 };
      if (index === 1) return { x: -8, y: 8 };
      return { x: 8, y: 8 };
    }
    // 4個或更多
    if (index === 0) return { x: -8, y: -8 };
    if (index === 1) return { x: 8, y: -8 };
    if (index === 2) return { x: -8, y: 8 };
    return { x: 8, y: 8 };
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {displayCharacters.map((character, index) => {
        const pos = getPosition(index, Math.min(characters.length, maxDisplay));
        return (
          <motion.div
            key={character.id}
            className="absolute"
            initial={{ x: 0, y: 0 }}
            animate={{ x: pos.x, y: pos.y }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <PlayerToken
              character={character}
              isCurrentPlayer={index === currentPlayerIndex}
              size={size}
            />
          </motion.div>
        );
      })}
      
      {/* 顯示剩餘玩家數量 */}
      {remainingCount > 0 && (
        <motion.div
          className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center text-[10px] text-white font-bold border border-gray-600"
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

export default PlayerToken;
