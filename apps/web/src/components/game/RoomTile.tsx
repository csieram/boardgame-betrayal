'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Room, SymbolType } from '@betrayal/shared';
import { PlayerTokenGroup } from './PlayerToken';
import { Character } from '@betrayal/shared';

/** 樓梯房間 ID */
const STAIR_ROOM_IDS = [
  'grand_staircase',
  'stairs_from_basement',
  'stairs_from_ground',
  'stairs_from_upper',
  'mystic_elevator',
  'collapsed_room',
];

/** 樓梯圖示映射 */
const STAIR_ICONS: Record<string, string> = {
  'grand_staircase': '↕️',
  'stairs_from_basement': '↑',
  'stairs_from_ground': '↓',
  'stairs_from_upper': '↓',
  'mystic_elevator': '🛗',
  'collapsed_room': '⚠️',
};

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
  /** 是否高亮 */
  isHighlighted?: boolean;
  /** 是否顯示樓梯圖示 */
  showStairIcon?: boolean;
  /** Issue #118: 子元素（用於渲染 AI 標記） */
  children?: React.ReactNode;
  /** Issue #159: 是否由 AI 發現（用於視覺區分） */
  discoveredByAI?: boolean;
  /** Issue #159: 是否顯示探索動畫（首次發現時） */
  showDiscoveryAnimation?: boolean;
}

/**
 * 房間磚塊組件
 * 
 * 顯示單個房間，包含 SVG 圖像、名稱、符號標記
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
  isHighlighted = false,
  showStairIcon = true,
  children,
  discoveredByAI = false,
  showDiscoveryAnimation = true,
}: RoomTileProps) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  // 載入 SVG 內容
  useEffect(() => {
    if (room?.gallerySvg) {
      const svgPath = room.gallerySvg.startsWith('/betrayal') 
        ? room.gallerySvg 
        : `/betrayal${room.gallerySvg}`;
      
      console.log('[Debug #160] RoomTile fetching SVG:', {
        roomName: room?.name,
        svgPath,
        timestamp: Date.now(),
      });
      
      fetch(svgPath)
        .then(res => {
          console.log('[Debug #160] RoomTile SVG fetch response:', {
            roomName: room?.name,
            status: res.status,
            ok: res.ok,
            timestamp: Date.now(),
          });
          return res.text();
        })
        .then(svg => {
          // 提取 SVG 內容
          const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
          if (match) {
            setSvgContent(match[1]);
          }
          setIsLoaded(true);
        })
        .catch((err) => {
          console.error('[Debug #160] RoomTile SVG fetch error:', {
            roomName: room?.name,
            error: err.message,
            timestamp: Date.now(),
          });
          // 載入失敗時使用預設 icon
          setSvgContent(room.icon || '');
          setIsLoaded(true);
        });
    } else if (room?.icon) {
      setSvgContent(room.icon);
      setIsLoaded(true);
    }
  }, [room?.gallerySvg, room?.icon]);

  // 尺寸設定 - 響應式設計，使用固定最小尺寸防止重疊
  const sizeClasses = {
    sm: 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 flex-shrink-0',
    md: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 flex-shrink-0',
    lg: 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-36 lg:h-36 flex-shrink-0',
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
        ${isExplored ? 'opacity-100' : 'opacity-90'}
      `}
      style={{ 
        backgroundColor: room.color + '20',
        border: `2px solid ${room.color}`,
        // Issue #159: 已探索房間有較亮的邊框，未探索（剛發現）的有較暗邊框
        boxShadow: isExplored ? `0 0 8px ${room.color}40` : 'none',
      }}
      onClick={onClick}
      // Issue #159: 只有首次發現時顯示縮放動畫，已探索房間直接顯示
      initial={showDiscoveryAnimation ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={showDiscoveryAnimation ? { 
        type: 'spring',
        stiffness: 400,
        damping: 25,
        duration: 0.3
      } : { duration: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* SVG 圖像 - 房間 SVG 已包含門的繪製 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg 
          viewBox="0 0 100 100" 
          className="w-[105%] h-[105%]"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }}
        >
          <g dangerouslySetInnerHTML={{ __html: svgContent }}/>
        </svg>
      </div>

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

      {/* Issue #159: 已探索標記 - 顯示小眼睛圖標表示此房間已被探索過 */}
      {isExplored && (
        <div 
          className="absolute bottom-5 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] bg-blue-500/80 text-white shadow-md z-10"
          title="已探索"
        >
          ✓
        </div>
      )}

      {/* 樓梯圖示 */}
      {showStairIcon && room.id && STAIR_ROOM_IDS.includes(room.id) && (
        <div 
          className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-sm bg-amber-600/90 shadow-md z-20"
          title="樓梯房間 - 可切換樓層"
        >
          {STAIR_ICONS[room.id] || '📶'}
        </div>
      )}

      {/* 房間名稱 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
        <p className="text-[10px] text-white text-center truncate font-medium">
          {room.name}
        </p>
      </div>

      {/* Issue #122: 玩家和 AI 標記容器 */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="flex items-center gap-1">
          {/* 玩家標記 */}
          {players.length > 0 && (
            <div className="pointer-events-auto">
              <PlayerTokenGroup
                characters={players}
                currentPlayerIndex={currentPlayerIndex}
                size="sm"
              />
            </div>
          )}

          {/* Issue #122: 渲染 AI 標記 */}
          {children && (
            <div className="pointer-events-auto">
              {children}
            </div>
          )}
        </div>
      </div>

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
  // 響應式尺寸，使用固定最小尺寸防止重疊
  const sizeClasses = {
    sm: 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 flex-shrink-0',
    md: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 flex-shrink-0',
    lg: 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-36 lg:h-36 flex-shrink-0',
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



export default RoomTile;
