'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Room, Character, Floor, Tile, Direction } from '@betrayal/shared';
import { RoomTile, EmptyRoomTile } from './RoomTile';
import { PlayerToken } from './PlayerToken';
import { AIPawn, AIPawnGroup } from './AIPawn';
import { TokenMarker } from './TokenMarker';
import { CorpseMarker } from './CorpseMarker';
import { STAIR_ROOM_IDS, StairManager, AIPlayerInfo, AIPersonality, MapToken, Corpse } from '@betrayal/game-engine';

/** 樓梯房間 ID 列表 */
const STAIR_ROOM_LIST = [
  'grand_staircase',
  'stairs_from_basement',
  'stairs_from_ground',
  'stairs_from_upper',
  'mystic_elevator',
  'collapsed_room',
];

/** 樓層名稱對照（繁體中文） */
const FLOOR_NAMES: Record<Floor, string> = {
  upper: '二樓',
  ground: '一樓',
  basement: '地下室',
  roof: '屋頂',
};

interface GameBoardProps {
  /** 地圖資料 - 二維陣列 */
  map: Tile[][];
  /** 當前樓層 */
  currentFloor: Floor;
  /** 當前玩家位置 */
  playerPosition: { x: number; y: number };
  /** 玩家角色 */
  playerCharacter: Character;
  /** 點擊房間的回調 - room 可能為 null（未探索位置） */
  onRoomClick?: (room: Room | null, x: number, y: number) => void;
  /** 切換樓層的回調 */
  onFloorChange?: (floor: Floor) => void;
  /** 使用樓梯的回調 */
  onUseStairs?: (targetFloor: Floor) => void;
  /** 可達的房間位置 */
  reachablePositions?: { x: number; y: number; isExplored?: boolean }[];
  /** 是否顯示所有樓層 */
  showAllFloors?: boolean;
  /** 遊戲狀態（用於樓梯檢查） */
  gameState?: {
    players: Array<{
      id: string;
      position: { x: number; y: number; floor: Floor };
    }>;
    map: Record<Floor, Tile[][]>;
    turn: {
      currentPlayerId: string;
    };
  };
  /** Issue #118: AI 玩家列表 */
  aiPlayers?: AIPlayerInfo[];
  /** Issue #118: 當前 AI 回合玩家 ID */
  currentTurnPlayerId?: string;
  /** Issue #118: 點擊 AI 標記的回調 */
  onAIClick?: (aiId: string) => void;
  /** Issue #238: 地圖標記列表 */
  mapTokens?: MapToken[];
  /** Issue #243: 屍體列表 */
  corpses?: Corpse[];
  /** Issue #243: 點擊屍體標記的回調 */
  onCorpseClick?: (corpse: Corpse) => void;
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
  onUseStairs,
  reachablePositions = [],
  showAllFloors = true,
  gameState,
  aiPlayers = [],
  currentTurnPlayerId,
  mapTokens = [],
  onAIClick,
  corpses = [],
  onCorpseClick,
}: GameBoardProps) {
  const [selectedRoom, setSelectedRoom] = useState<{ room: Room; x: number; y: number } | null>(null);
  const [activeFloor, setActiveFloor] = useState<Floor>(currentFloor);
  const [showStairModal, setShowStairModal] = useState(false);
  const [stairOptions, setStairOptions] = useState<Array<{ to: Floor; description: string }>>([]);
  const [currentStairRoom, setCurrentStairRoom] = useState<Room | null>(null);

  // Issue #84: 同步 activeFloor 與 currentFloor prop
  // 當父組件改變 currentFloor 時，更新內部 activeFloor 狀態
  useEffect(() => {
    setActiveFloor(currentFloor);
  }, [currentFloor]);

  // 樓層名稱對照
  const floorNames: Record<Floor, string> = {
    upper: '二樓 Upper',
    ground: '一樓 Ground',
    basement: '地下室 Basement',
    roof: '屋頂 Roof',
  };

  // 樓層顏色
  const floorColors: Record<Floor, string> = {
    upper: '#8B7355',
    ground: '#7B6354',
    basement: '#4A4A4A',
    roof: '#5A5A6A',
  };

  // 過濾出當前樓層的已探索房間
  // Issue #156-fix: 移除 tile.room?.floor === activeFloor 檢查
  // 房間的 floor 屬性是原始樓層分類（用於牌堆），不是實際放置的樓層
  // 實際放置的樓層由 map 參數決定（multiFloorMap.ground/upper/basement）
  // Issue #157-fix: 添加更詳細的日誌追蹤，確保 AI 發現的房間被正確計入
  // Issue #160-debug: 添加調試日誌追蹤 exploredRooms useMemo
  const exploredRooms = useMemo(() => {
    const rooms: { tile: Tile; x: number; y: number }[] = [];
    
    console.log('[Debug #160] exploredRooms useMemo - map prop:', {
      mapLength: map.length,
      activeFloor,
      timestamp: Date.now(),
    });
    
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const tile = map[y][x];
        // 只檢查 tile.discovered 和 tile.room 是否存在
        // 不檢查 room.floor，因為房間可以放置在任何樓層（由 map 參數決定）
        if (tile.discovered && tile.room) {
          rooms.push({ tile, x, y });
        }
      }
    }
    
    // Issue #160-debug: 詳細記錄計算結果
    console.log('[Debug #160] exploredRooms useMemo - result:', {
      count: rooms.length,
      activeFloor,
      rooms: rooms.map(r => ({
        name: r.tile.room?.name,
        id: r.tile.room?.id,
        x: r.x,
        y: r.y,
        discovered: r.tile.discovered,
        floor: r.tile.room?.floor,
      })),
      timestamp: Date.now(),
    });
    
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

  // 檢查位置是否可達（用於探索 - 只檢查未探索的 tile）
  const isReachable = (x: number, y: number) => {
    return reachablePositions.some(pos => pos.x === x && pos.y === y && !pos.isExplored);
  };

  // 檢查位置是否可移動（用於移動 - 包括已探索和未探索）
  const isMovable = (x: number, y: number) => {
    return reachablePositions.some(pos => pos.x === x && pos.y === y);
  };

  // 檢查位置是否有玩家
  const hasPlayerAt = (x: number, y: number) => {
    return playerPosition.x === x && playerPosition.y === y;
  };

  // Issue #118: 檢查位置有哪些 AI 玩家
  // Issue #155: 添加除錯日誌
  const getAIPlayersAt = (x: number, y: number, floor: Floor) => {
    const playersAtPosition = aiPlayers.filter(ai => 
      ai.position?.x === x && 
      ai.position?.y === y && 
      ai.position?.floor === floor &&
      ai.isAlive
    );
    if (playersAtPosition.length > 0) {
      console.log('[getAIPlayersAt] Found AI at', { x, y, floor }, ':', playersAtPosition.map(p => ({ id: p.id, name: p.name, position: p.position })));
    }
    return playersAtPosition;
  };

  // Issue #155: 監聽 aiPlayers 變化，確保正確重新渲染
  useEffect(() => {
    console.log('[GameBoard] aiPlayers updated:', aiPlayers.map(p => ({ id: p.id, name: p.name, position: p.position })));
  }, [aiPlayers]);

  // Issue #156: 添加除錯日誌追蹤 exploredRooms
  useEffect(() => {
    console.log('[GameBoard] exploredRooms updated:', {
      count: exploredRooms.length,
      activeFloor,
      rooms: exploredRooms.map(r => ({
        name: r.tile.room?.name,
        x: r.x,
        y: r.y,
        floor: r.tile.room?.floor,
        discovered: r.tile.discovered
      }))
    });
  }, [exploredRooms, activeFloor]);

  // Issue #118: 檢查位置是否有 AI 玩家
  const hasAIAt = (x: number, y: number, floor: Floor) => {
    return getAIPlayersAt(x, y, floor).length > 0;
  };

  // Issue #243: 獲取指定位置的屍體
  const getCorpsesAt = (x: number, y: number, floor: Floor) => {
    return corpses.filter(
      corpse =>
        corpse.position.x === x &&
        corpse.position.y === y &&
        corpse.position.floor === floor
    );
  };

  // Issue #243: 檢查位置是否有屍體
  const hasCorpseAt = (x: number, y: number, floor: Floor) => {
    return getCorpsesAt(x, y, floor).length > 0;
  };

  // 檢查玩家是否在樓梯房間
  useEffect(() => {
    if (!gameState) return;
    
    const currentPlayer = gameState.players.find(
      p => p.id === gameState.turn.currentPlayerId
    );
    if (!currentPlayer) return;

    const tile = gameState.map[currentFloor][currentPlayer.position.y]?.[currentPlayer.position.x];
    if (!tile?.room) return;

    // 檢查是否為樓梯房間
    if (STAIR_ROOM_LIST.includes(tile.room.id)) {
      setCurrentStairRoom(tile.room);
      // 獲取可用的樓梯選項
      const options = StairManager.getAvailableStairOptions(gameState as any, currentPlayer.id);
      setStairOptions(options);
      // 如果玩家在樓梯房間，顯示彈窗
      if (options.length > 0) {
        setShowStairModal(true);
      }
    } else {
      setCurrentStairRoom(null);
      setStairOptions([]);
      setShowStairModal(false);
    }
  }, [gameState, currentFloor]);

  // 處理樓梯使用
  const handleUseStairs = (targetFloor: Floor) => {
    setShowStairModal(false);
    onUseStairs?.(targetFloor);
  };

  // 處理房間點擊 - 直接移動到相鄰房間
  const handleRoomClick = (room: Room | null, x: number, y: number) => {
    if (room) {
      setSelectedRoom({ room, x, y });
    }
    onRoomClick?.(room, x, y);
  };

  // 處理樓層切換
  const handleFloorChange = (floor: Floor) => {
    setActiveFloor(floor);
    onFloorChange?.(floor);
  };

  // 渲染單個樓層
  // Issue #156-fix: 移除 r.tile.room?.floor === floor 過濾條件
  // exploredRooms 已經只包含當前樓層的房間（由 map 參數決定）
  const renderFloor = (floor: Floor) => {
    // 直接使用 exploredRooms，因為它已經是從當前 map（特定樓層）計算出來的
    const floorRooms = exploredRooms;

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

        {/* 房間網格 - 可拖動，無滾動條 */}
        <div className="overflow-hidden pb-4 max-h-[60vh] relative">
          <motion.div
            className="inline-grid gap-px p-2 sm:p-4 bg-gray-900/50 rounded-xl min-w-max cursor-grab active:cursor-grabbing"
            style={{
              gridTemplateColumns: `repeat(${mapBounds.maxX - mapBounds.minX + 1}, auto)`,
            }}
            drag
            dragConstraints={{ left: -500, right: 0, top: -500, bottom: 0 }}
            dragElastic={0.1}
            whileDrag={{ scale: 1.02 }}
          >
            {Array.from({ length: mapBounds.maxY - mapBounds.minY + 1 }, (_, rowIndex) => {
              const y = mapBounds.minY + rowIndex;
              
              return Array.from({ length: mapBounds.maxX - mapBounds.minX + 1 }, (_, colIndex) => {
                const x = mapBounds.minX + colIndex;
                const tile = map[y]?.[x];
                // Issue #156-fix: 移除 tile?.room?.floor === floor 檢查
                // 房間的 floor 屬性是原始樓層分類，不是實際放置的樓層
                const isExplored = tile?.discovered && tile?.room;
                const reachable = isReachable(x, y) && floor === activeFloor;
                const hasPlayer = hasPlayerAt(x, y) && floor === activeFloor;

                if (!isExplored) {
                  // 只有當前樓層且真正可達（有門相連）的未探索 tile 才顯示高亮
                  const isExplorable = reachable && floor === activeFloor;

                  return (
                    <EmptyRoomTile
                      key={`${x}-${y}`}
                      size="md"
                      isReachable={isExplorable}
                      onClick={isExplorable ? () => onRoomClick?.(null, x, y) : undefined}
                    />
                  );
                }

                // 檢查是否可移動（包括已探索和未探索的可達位置）
                const movable = isMovable(x, y) && floor === activeFloor;

                // Issue #118: 獲取該位置的 AI 玩家
                const aiPlayersAtPosition = getAIPlayersAt(x, y, floor);
                const hasAI = aiPlayersAtPosition.length > 0;

                // Issue #159: 檢查房間是否已探索（用於視覺區分）
                const tileExplored = tile?.discovered ?? false;

                // Issue #238: 獲取該位置的標記
                const tokensAtPosition = mapTokens.filter(
                  token => token.position.x === x && token.position.y === y && token.position.floor === floor
                );

                // Issue #243: 獲取該位置的屍體
                const corpsesAtPosition = getCorpsesAt(x, y, floor);
                const hasCorpse = corpsesAtPosition.length > 0;

                return (
                  <RoomTile
                    key={`${x}-${y}`}
                    room={tile.room}
                    isExplored={tileExplored}
                    isReachable={movable}
                    rotation={tile.rotation}
                    onClick={() => tile.room && handleRoomClick(tile.room, x, y)}
                    players={hasPlayer ? [playerCharacter] : []}
                    currentPlayerIndex={0}
                    size="md"
                    isHighlighted={selectedRoom?.x === x && selectedRoom?.y === y}
                    // Issue #159: 已探索的房間不顯示發現動畫
                    showDiscoveryAnimation={false}
                  >
                    {/* Issue #122: 渲染 AI 標記 */}
                    {hasAI && (
                      <>
                        {aiPlayersAtPosition.length === 1 ? (
                          <AIPawn
                            character={aiPlayersAtPosition[0].character}
                            personality={aiPlayersAtPosition[0].personality}
                            name={aiPlayersAtPosition[0].name}
                            isCurrentTurn={currentTurnPlayerId === aiPlayersAtPosition[0].id}
                            isActing={currentTurnPlayerId === aiPlayersAtPosition[0].id}
                            size="md"
                            onClick={() => onAIClick?.(aiPlayersAtPosition[0].id)}
                            activity={`${aiPlayersAtPosition[0].position.floor} (${aiPlayersAtPosition[0].position.x}, ${aiPlayersAtPosition[0].position.y})`}
                          />
                        ) : (
                          <AIPawnGroup
                            aiPlayers={aiPlayersAtPosition.map(ai => ({
                              id: ai.id,
                              character: ai.character,
                              personality: ai.personality,
                              name: ai.name,
                              isCurrentTurn: currentTurnPlayerId === ai.id,
                              isActing: currentTurnPlayerId === ai.id,
                            }))}
                            size="md"
                            maxDisplay={3}
                            onAIClick={onAIClick}
                          />
                        )}
                      </>
                    )}
                    {/* Issue #238: 渲染地圖標記 */}
                    {tokensAtPosition.length > 0 && (
                      <div className="absolute top-1 right-1 flex flex-col gap-1">
                        {tokensAtPosition.map(token => (
                          <TokenMarker key={token.id} token={token} size="sm" />
                        ))}
                      </div>
                    )}
                    {/* Issue #243: 渲染屍體標記 */}
                    {hasCorpse && (
                      <div className="absolute bottom-1 left-1 flex flex-col gap-1">
                        {corpsesAtPosition.map(corpse => (
                          <CorpseMarker
                            key={corpse.id}
                            corpse={corpse}
                            onClick={() => onCorpseClick?.(corpse)}
                          />
                        ))}
                      </div>
                    )}
                  </RoomTile>
                );
              });
            })}
          </motion.div>
          {/* 拖動提示 */}
          <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-800/80 px-2 py-1 rounded pointer-events-none">
            🖱️ 拖動移動地圖
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

      {/* 樓梯切換彈窗 */}
      <AnimatePresence>
        {showStairModal && stairOptions.length > 0 && currentStairRoom && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStairModal(false)}
          >
            <motion.div
              className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 border border-amber-600/50 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 標題 */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-600/20 flex items-center justify-center text-3xl">
                  🪜
                </div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {currentStairRoom.name}
                </h3>
                <p className="text-gray-400 text-sm">
                  當前樓層: {FLOOR_NAMES[currentFloor]}
                </p>
              </div>

              {/* 可用選項 */}
              <div className="space-y-3 mb-6">
                <p className="text-sm text-gray-400 text-center mb-3">
                  選擇要前往的樓層：
                </p>
                {stairOptions.map((option) => (
                  <button
                    key={option.to}
                    onClick={() => handleUseStairs(option.to)}
                    className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <span>前往 {FLOOR_NAMES[option.to]}</span>
                    <span className="text-amber-200">
                      {option.to === 'upper' ? '↑' : option.to === 'basement' ? '↓' : '→'}
                    </span>
                  </button>
                ))}
              </div>

              {/* 取消按鈕 */}
              <button
                onClick={() => setShowStairModal(false)}
                className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-all"
              >
                取消
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
  onRoomClick?: (room: Room | null, x: number, y: number) => void;
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
  // Issue #156-fix: 移除 tile.room?.floor === currentFloor 檢查
  const visibleRooms = useMemo(() => {
    const rooms: { tile: Tile; x: number; y: number }[] = [];

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const tile = map[y][x];
        if (tile.discovered && tile.room) {
          rooms.push({ tile, x, y });
        }
      }
    }

    return rooms;
  }, [map]);

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
