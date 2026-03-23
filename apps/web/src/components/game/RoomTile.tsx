'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Room, SymbolType, Direction } from '@betrayal/shared';
import { PlayerTokenGroup } from './PlayerToken';
import { Character } from '@betrayal/shared';

interface RoomTileProps {
  /** 房間資料 */
  room: Room | null;
  /** 是否已探索 */
  isExplored?: boolean;
  /** 是否可達 */
  isReachable?: boolean;
  /** 旋轉角度 */
  rotation?: 0 | 90 | 180 | 270;
  /** 點擊回調 */
  onClick?: () => void;
  /** 在此房間的玩家 */
  players?: Character[];
  /** 當前玩家索引 */
  currentPlayerIndex?: number;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否顯示門 */
  showDoors?: boolean;
  /** 是否高亮 */
  isHighlighted?: boolean;
  /** 有效的探索方向 */
  validExploreDirections?: Direction[];
  /** 探索方向點擊回調 */
  onExploreDirection?: (direction: Direction) => void;
}

/**
 * 房間磚塊組件
 * 
 * 顯示單個房間，包含 SVG 圖像、名稱、符號標記和門指示器
 * 
 * @example
 * <RoomTile 
 *   room={room}
 *   isExplored={true}
 *   players={[character1, character2]}
 *   onClick={() => handleRoomClick(room)}
 * />
 */
export function RoomTile({
  room,
  isExplored = false,
  isReachable = false,
  rotation = 0,
  onClick,
  players = [],
  currentPlayerIndex = 0,
  size = 'md',
  showDoors = true,
  isHighlighted = false,
  validExploreDirections = [],
  onExploreDirection,
}: RoomTileProps) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  // 載入 SVG 內容
  useEffect(() => {
    if (room?.gallerySvg) {
      const svgPath = room.gallerySvg.startsWith('/betrayal') 
        ? room.gallerySvg 
        : `/betrayal${room.gallerySvg}`;
      
      fetch(svgPath)
        .then(res => res.text())
        .then(svg => {
          // 提取 SVG 內容
          const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
          if (match) {
            setSvgContent(match[1]);
          }
          setIsLoaded(true);
        })
        .catch(() => {
          // 載入失敗時使用預設 icon
          setSvgContent(room.icon || '');
          setIsLoaded(true);
        });
    } else if (room?.icon) {
      setSvgContent(room.icon);
      setIsLoaded(true);
    }
  }, [room?.gallerySvg, room?.icon]);

  // 尺寸設定
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-28 h-28',
    lg: 'w-36 h-36',
  };

  // 符號顏色
  const symbolColors: Record<string, string> = {
    'E': '#4A9A4A', // 綠色 - Event
    'I': '#3D7AB8', // 藍色 - Item
    'O': '#8B4DA8', // 紫色 - Omen
    'null': 'transparent',
  };

  // 符號名稱
  const symbolNames: Record<string, string> = {
    'E': '事件',
    'I': '物品',
    'O': '預兆',
    'null': '',
  };

  // 如果房間未探索，顯示迷霧
  if (!isExplored || !room) {
    return (
      <motion.div
        className={`
          ${sizeClasses[size]}
          rounded-lg bg-gray-900/50 border-2 border-dashed border-gray-700
          flex items-center justify-center
        `}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <span className="text-gray-600 text-xs">?</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`
        relative ${sizeClasses[size]} cursor-pointer
        rounded-lg overflow-hidden
        transition-all duration-200
        ${isReachable ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-gray-900' : ''}
        ${isHighlighted ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900' : ''}
      `}
      style={{ 
        backgroundColor: room.color + '20',
        border: `2px solid ${room.color}`,
      }}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        type: 'spring',
        stiffness: 400,
        damping: 25,
        duration: 0.3
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* SVG 圖像 */}
      <div className="absolute inset-0 flex items-center justify-center p-1">
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }}
        >
          <g dangerouslySetInnerHTML={{ __html: svgContent }}/>
        </svg>
      </div>

      {/* 門指示器 - 改進樣式 */}
      {showDoors && room.doors && (
        <>
          {room.doors.includes('north') && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-2 bg-gradient-to-b from-amber-600 to-amber-800 rounded-b-md shadow-md border-b border-amber-900/50" />
          )}
          {room.doors.includes('south') && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-2 bg-gradient-to-t from-amber-600 to-amber-800 rounded-t-md shadow-md border-t border-amber-900/50" />
          )}
          {room.doors.includes('east') && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-6 bg-gradient-to-l from-amber-600 to-amber-800 rounded-l-md shadow-md border-l border-amber-900/50" />
          )}
          {room.doors.includes('west') && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-6 bg-gradient-to-r from-amber-600 to-amber-800 rounded-r-md shadow-md border-r border-amber-900/50" />
          )}
        </>
      )}

      {/* 探索方向指示器 */}
      {validExploreDirections.length > 0 && onExploreDirection && (
        <>
          {/* 北 */}
          <ExploreDirectionIndicator
            direction="north"
            isValid={validExploreDirections.includes('north')}
            onClick={() => onExploreDirection('north')}
            size={size}
          />
          {/* 南 */}
          <ExploreDirectionIndicator
            direction="south"
            isValid={validExploreDirections.includes('south')}
            onClick={() => onExploreDirection('south')}
            size={size}
          />
          {/* 東 */}
          <ExploreDirectionIndicator
            direction="east"
            isValid={validExploreDirections.includes('east')}
            onClick={() => onExploreDirection('east')}
            size={size}
          />
          {/* 西 */}
          <ExploreDirectionIndicator
            direction="west"
            isValid={validExploreDirections.includes('west')}
            onClick={() => onExploreDirection('west')}
            size={size}
          />
        </>
      )}

      {/* 符號標記 */}
      {room.symbol && (
        <div 
          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md"
          style={{ backgroundColor: symbolColors[room.symbol] }}
          title={symbolNames[room.symbol] || ''}
        >
          {room.symbol}
        </div>
      )}

      {/* 房間名稱 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
        <p className="text-[10px] text-white text-center truncate font-medium">
          {room.name}
        </p>
      </div>

      {/* 玩家標記 */}
      {players.length > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <PlayerTokenGroup
            characters={players}
            currentPlayerIndex={currentPlayerIndex}
            size="sm"
          />
        </div>
      )}

      {/* 可達指示器 */}
      {isReachable && (
        <motion.div
          className="absolute inset-0 bg-green-500/10 rounded-lg"
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* 載入動畫 */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </motion.div>
  );
}

/**
 * 空房間磚塊（用於佔位）
 */
interface EmptyRoomTileProps {
  size?: 'sm' | 'md' | 'lg';
  isReachable?: boolean;
  onClick?: () => void;
}

export function EmptyRoomTile({ 
  size = 'md', 
  isReachable = false,
  onClick 
}: EmptyRoomTileProps) {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-28 h-28',
    lg: 'w-36 h-36',
  };

  return (
    <motion.div
      className={`
        ${sizeClasses[size]}
        rounded-lg border-2 border-dashed border-gray-700
        flex items-center justify-center
        ${isReachable ? 'border-green-500/50 bg-green-500/5' : 'bg-gray-800/30'}
        ${onClick ? 'cursor-pointer hover:border-gray-600' : ''}
      `}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {isReachable && (
        <motion.div
          className="w-3 h-3 rounded-full bg-green-500/50"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

/**
 * 探索方向指示器組件
 */
interface ExploreDirectionIndicatorProps {
  direction: Direction;
  isValid: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}

function ExploreDirectionIndicator({
  direction,
  isValid,
  onClick,
  size = 'md',
}: ExploreDirectionIndicatorProps) {
  // 位置樣式
  const positionClasses: Record<Direction, string> = {
    north: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full mt-1',
    south: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full mb-1',
    east: 'right-0 top-1/2 translate-x-full -translate-y-1/2 mr-1',
    west: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 ml-1',
  };

  // 箭頭圖標
  const arrowIcons: Record<Direction, string> = {
    north: '↑',
    south: '↓',
    east: '→',
    west: '←',
  };

  // 尺寸樣式
  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-7 h-7 text-sm',
    lg: 'w-8 h-8 text-base',
  };

  return (
    <motion.button
      className={`
        absolute ${positionClasses[direction]}
        ${sizeClasses[size]}
        rounded-full flex items-center justify-center font-bold
        transition-all duration-200
        ${isValid 
          ? 'bg-green-500 text-white shadow-lg shadow-green-500/50 cursor-pointer hover:bg-green-400 hover:scale-110 border-2 border-green-400' 
          : 'bg-gray-700 text-gray-500 cursor-not-allowed border-2 border-gray-600'
        }
      `}
      onClick={isValid ? onClick : undefined}
      whileHover={isValid ? { scale: 1.15 } : undefined}
      whileTap={isValid ? { scale: 0.95 } : undefined}
      animate={isValid ? {
        boxShadow: [
          '0 0 5px rgba(34, 197, 94, 0.5)',
          '0 0 15px rgba(34, 197, 94, 0.8)',
          '0 0 5px rgba(34, 197, 94, 0.5)',
        ],
      } : undefined}
      transition={isValid ? {
        boxShadow: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      } : undefined}
      disabled={!isValid}
      title={isValid ? `探索${direction === 'north' ? '北' : direction === 'south' ? '南' : direction === 'east' ? '東' : '西'}方` : '無法探索'}
    >
      {arrowIcons[direction]}
    </motion.button>
  );
}

export default RoomTile;
