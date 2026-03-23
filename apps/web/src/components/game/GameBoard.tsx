'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Room, Character, Floor, Tile, Direction } from '@betrayal/shared';
import { RoomTile, EmptyRoomTile } from './RoomTile';
import { PlayerToken } from './PlayerToken';

interface GameBoardProps {
  /** 地圖資料 - 二維陣列 */
  map: Tile[][];
  /** 當前樓層 */
  currentFloor: Floor;
  /** 當前玩家位置 */
  playerPosition: { x: number; y: number };
  /** 玩家角色 */
  playerCharacter: Character;
  /** 點擊房間的回調 */
  onRoomClick?: (room: Room, x: number, y: number) => void;
  /** 切換樓層的回調 */
  onFloorChange?: (floor: Floor) => void;
  /** 可達的房間位置 */
  reachablePositions?: { x: number; y: number }[];
  /** 是否顯示所有樓層 */
  showAllFloors?: boolean;
  /** 有效的探索方向 */
  validExploreDirections?: Direction[];
  /** 探索方向點擊回調 */
  onExploreDirection?: (direction: Direction) => void;
}

/**
 * 遊戲板組件
 * 
 * 顯示三個樓層（Upper/Ground/Basement）的探索房間網格
 * 類似實體桌遊的佈局
 * 
 * @example
 * <GameBoard 
 *   map={gameState.map}
 *   currentFloor="ground"
 *   playerPosition={{ x: 7, y: 7 }}
 *   playerCharacter={character}
 *   onRoomClick={handleRoomClick}
 * />
 */
export function GameBoard({
  map,
  currentFloor,
  playerPosition,
  playerCharacter,
  onRoomClick,
  onFloorChange,
  reachablePositions = [],
  showAllFloors = true,
  validExploreDirections = [],
  onExploreDirection,
}: GameBoardProps) {
  const [selectedRoom, setSelectedRoom] = useState<{ room: Room; x: number; y: number } | null>(null);
  const [activeFloor, setActiveFloor] = useState<Floor>(currentFloor);

  // 樓層名稱對照
  const floorNames: Record<Floor, string> = {
    upper: '二樓 Upper',
    ground: '一樓 Ground',
    basement: '地下室 Basement',
  };

  // 樓層顏色
  const floorColors: Record<Floor, string> = {
    upper: '#8B7355',
    ground: '#7B6354',
    basement: '#4A4A4A',
  };

  // 過濾出當前樓層的已探索房間
  const exploredRooms = useMemo(() => {
    const rooms: { tile: Tile; x: number; y: number }[] = [];
    
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const tile = map[y][x];
        if (tile.discovered && tile.room?.floor === activeFloor) {
          rooms.push({ tile, x, y });
        }
      }
    }
    
    return rooms;
  }, [map, activeFloor]);

  // 計算地圖邊界
  const mapBounds = useMemo(() => {
    if (exploredRooms.length === 0) {
      return { minX: 0, maxX: 14, minY: 0, maxY: 14 };
    }

    const xs = exploredRooms.map(r => r.x);
    const ys = exploredRooms.map(r => r.y);
    
    return {
      minX: Math.min(...xs) - 1,
      maxX: Math.max(...xs) + 1,
      minY: Math.min(...ys) - 1,
      maxY: Math.max(...ys) + 1,
    };
  }, [exploredRooms]);

  // 檢查位置是否可達
  const isReachable = (x: number, y: number) => {
    return reachablePositions.some(pos => pos.x === x && pos.y === y);
  };

  // 檢查位置是否有玩家
  const hasPlayerAt = (x: number, y: number) => {
    return playerPosition.x === x && playerPosition.y === y;
  };

  // 處理房間點擊
  const handleRoomClick = (room: Room, x: number, y: number) => {
    setSelectedRoom({ room, x, y });
    onRoomClick?.(room, x, y);
  };

  // 處理樓層切換
  const handleFloorChange = (floor: Floor) => {
    setActiveFloor(floor);
    onFloorChange?.(floor);
  };

  // 渲染單個樓層
  const renderFloor = (floor: Floor) => {
    const floorRooms = exploredRooms.filter(r => r.tile.room?.floor === floor);
    
    if (floorRooms.length === 0 && floor !== activeFloor) {
      return null;
    }

    return (
      <motion.div
        key={floor}
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* 樓層標題 */}
        <div 
          className="flex items-center gap-3 mb-4 px-4 py-2 rounded-lg"
          style={{ backgroundColor: floorColors[floor] + '30' }}
        >
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: floorColors[floor] }}
          />
          <h3 className="text-lg font-bold text-white">{floorNames[floor]}</h3>
          <span className="text-sm text-gray-400">
            {floorRooms.length} 個房間
          </span>
          {floor === activeFloor && (
            <span className="ml-auto text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
              當前
            </span>
          )}
        </div>

        {/* 房間網格 */}
        <div className="overflow-x-auto pb-4">
          <div 
            className="inline-grid gap-2 p-4 bg-gray-900/50 rounded-xl"
            style={{
              gridTemplateColumns: `repeat(${mapBounds.maxX - mapBounds.minX + 1}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: mapBounds.maxY - mapBounds.minY + 1 }, (_, rowIndex) => {
              const y = mapBounds.minY + rowIndex;
              
              return Array.from({ length: mapBounds.maxX - mapBounds.minX + 1 }, (_, colIndex) => {
                const x = mapBounds.minX + colIndex;
                const tile = map[y]?.[x];
                const isExplored = tile?.discovered && tile?.room?.floor === floor;
                const reachable = isReachable(x, y) && floor === activeFloor;
                const hasPlayer = hasPlayerAt(x, y) && floor === activeFloor;

                if (!isExplored) {
                  // 檢查是否相鄰已探索房間（顯示可達提示）
                  const adjacentExplored = [
                    map[y-1]?.[x],
                    map[y+1]?.[x],
                    map[y]?.[x-1],
                    map[y]?.[x+1],
                  ].some(t => t?.discovered && t?.room?.floor === floor);

                  return (
                    <EmptyRoomTile
                      key={`${x}-${y}`}
                      size="md"
                      isReachable={reachable || (adjacentExplored && floor === activeFloor)}
                      onClick={reachable && tile?.room ? () => onRoomClick?.(tile.room!, x, y) : undefined}
                    />
                  );
                }

                // 檢查當前位置是否是玩家位置（用於顯示探索方向）
                const isPlayerPosition = hasPlayerAt(x, y) && floor === activeFloor;
                
                return (
                  <RoomTile
                    key={`${x}-${y}`}
                    room={tile.room}
                    isExplored={true}
                    isReachable={reachable}
                    rotation={tile.rotation}
                    onClick={() => tile.room && handleRoomClick(tile.room, x, y)}
                    players={hasPlayer ? [playerCharacter] : []}
                    currentPlayerIndex={0}
                    size="md"
                    showDoors={true}
                    isHighlighted={selectedRoom?.x === x && selectedRoom?.y === y}
                    validExploreDirections={isPlayerPosition ? validExploreDirections : []}
                    onExploreDirection={isPlayerPosition ? onExploreDirection : undefined}
                  />
                );
              });
            })}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* 樓層切換標籤 */}
      <div className="flex gap-2 mb-4 p-2 bg-gray-800/50 rounded-xl">
        {(Object.keys(floorNames) as Floor[]).map((floor) => (
          <button
            key={floor}
            onClick={() => handleFloorChange(floor)}
            className={`
              flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeFloor === floor 
                ? 'bg-gray-700 text-white shadow-md' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }
            `}
          >
            <span className="block text-xs opacity-70">
              {floor === 'upper' ? 'Upper' : floor === 'ground' ? 'Ground' : 'Basement'}
            </span>
            <span className="block">{floorNames[floor].split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* 樓層內容 */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {showAllFloors ? (
            // 顯示所有樓層
            <motion.div
              key="all-floors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {renderFloor('upper')}
              {renderFloor('ground')}
              {renderFloor('basement')}
            </motion.div>
          ) : (
            // 只顯示當前樓層
            <motion.div
              key={activeFloor}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderFloor(activeFloor)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 選中房間詳情面板 */}
      <AnimatePresence>
        {selectedRoom && (
          <motion.div
            className="mt-4 p-4 bg-gray-800 rounded-xl border border-gray-700"
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
          >
            <div className="flex items-start gap-4">
              {/* 房間圖像 */}
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                {selectedRoom.room.gallerySvg ? (
                  <img
                    src={`/betrayal${selectedRoom.room.gallerySvg}`}
                    alt={selectedRoom.room.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: selectedRoom.room.color }}
                  >
                    <span className="text-white font-bold text-lg">
                      {selectedRoom.room.name[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* 房間資訊 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-white text-lg">
                    {selectedRoom.room.name}
                  </h4>
                  {selectedRoom.room.symbol && (
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{ 
                        backgroundColor: selectedRoom.room.symbol === 'E' ? '#4A9A4A' : 
                                        selectedRoom.room.symbol === 'I' ? '#3D7AB8' : '#8B4DA8'
                      }}
                    >
                      {selectedRoom.room.symbol === 'E' ? '事件' : 
                       selectedRoom.room.symbol === 'I' ? '物品' : '預兆'}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mb-2">
                  {selectedRoom.room.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>位置: ({selectedRoom.x}, {selectedRoom.y})</span>
                  <span>門: {selectedRoom.room.doors.map(d => 
                    d === 'north' ? '北' : 
                    d === 'south' ? '南' : 
                    d === 'east' ? '東' : '西'
                  ).join(', ')}</span>
                </div>
              </div>

              {/* 關閉按鈕 */}
              <button
                onClick={() => setSelectedRoom(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 簡化版遊戲板（用於小空間）
 */
interface MiniGameBoardProps {
  map: Tile[][];
  currentFloor: Floor;
  playerPosition: { x: number; y: number };
  playerCharacter: Character;
  onRoomClick?: (room: Room, x: number, y: number) => void;
  className?: string;
}

export function MiniGameBoard({
  map,
  currentFloor,
  playerPosition,
  playerCharacter,
  onRoomClick,
  className = '',
}: MiniGameBoardProps) {
  // 只顯示當前樓層的探索房間
  const visibleRooms = useMemo(() => {
    const rooms: { tile: Tile; x: number; y: number }[] = [];
    
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const tile = map[y][x];
        if (tile.discovered && tile.room?.floor === currentFloor) {
          rooms.push({ tile, x, y });
        }
      }
    }
    
    return rooms;
  }, [map, currentFloor]);

  if (visibleRooms.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 bg-gray-800/50 rounded-xl ${className}`}>
        <p className="text-gray-500">尚未探索任何房間</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-4 gap-2 p-4 bg-gray-800/50 rounded-xl ${className}`}>
      {visibleRooms.slice(0, 8).map(({ tile, x, y }) => (
        <RoomTile
          key={`${x}-${y}`}
          room={tile.room}
          isExplored={true}
          rotation={tile.rotation}
          onClick={() => tile.room && onRoomClick?.(tile.room, x, y)}
          players={playerPosition.x === x && playerPosition.y === y ? [playerCharacter] : []}
          size="sm"
        />
      ))}
      {visibleRooms.length > 8 && (
        <div className="flex items-center justify-center text-gray-500 text-sm">
          +{visibleRooms.length - 8}
        </div>
      )}
    </div>
  );
}

export default GameBoard;
