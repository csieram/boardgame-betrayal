'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Character, CHARACTERS, Room, Floor, Tile, Direction } from '@betrayal/shared';
import { Button } from '@betrayal/ui';
import { GameBoard } from '@/components/game/GameBoard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RoomDiscoveryManager,
  getValidExploreDirections,
  rotateRoomForConnection,
  OPPOSITE_DOOR,
} from '@betrayal/game-engine';

// 地圖大小
const MAP_SIZE = 15;
const MAP_CENTER = 7;

/** 單人模式遊戲狀態 */
interface SoloGameState {
  placedRoomIds: Set<string>;
  roomDecks: {
    ground: Room[];
    upper: Room[];
    basement: Room[];
    drawn: Set<string>;
  };
}

/**
 * 建立空的遊戲狀態
 */
function createInitialGameState(): SoloGameState {
  return {
    placedRoomIds: new Set(['entrance_hall']),
    roomDecks: {
      ground: [],
      upper: [],
      basement: [],
      drawn: new Set(),
    },
  };
}

/**
 * 建立空的地圖
 */
function createEmptyMap(): Tile[][] {
  const map: Tile[][] = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      row.push({
        x,
        y,
        room: null,
        discovered: false,
        rotation: 0,
      });
    }
    map.push(row);
  }
  return map;
}

/**
 * 單人模式遊戲頁面
 * 
 * 這是單人遊戲的主要遊戲頁面，整合 GameBoard 組件顯示探索的房間
 * 
 * @route /solo
 */
export default function SoloGamePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'select' | 'play'>('select');
  const [player, setPlayer] = useState<Character | null>(null);
  const [turn, setTurn] = useState(1);
  const [moves, setMoves] = useState(0);
  const [position, setPosition] = useState({ x: MAP_CENTER, y: MAP_CENTER });
  const [currentFloor, setCurrentFloor] = useState<Floor>('ground');
  const [map, setMap] = useState<Tile[][]>(createEmptyMap());
  const [log, setLog] = useState<string[]>(['遊戲開始']);
  const [discovered, setDiscovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<{ room: Room; x: number; y: number } | null>(null);
  const [reachablePositions, setReachablePositions] = useState<{ x: number; y: number }[]>([]);
  const [validExploreDirections, setValidExploreDirections] = useState<Direction[]>([]);
  const [gameState, setGameState] = useState<SoloGameState>(createInitialGameState());

  // 從 sessionStorage 讀取選擇的角色
  useEffect(() => {
    const storedCharacter = sessionStorage.getItem('solo-selected-character');
    
    if (storedCharacter) {
      try {
        const character: Character = JSON.parse(storedCharacter);
        startGame(character);
      } catch (error) {
        console.error('Failed to parse stored character:', error);
        setIsLoading(false);
      }
    } else {
      router.push('/solo/select');
    }
  }, [router]);

  // 初始化遊戲
  const startGame = (character: Character) => {
    setPlayer(character);
    setMoves(character.stats.speed[0]);
    setPhase('play');
    
    // 初始化地圖，放置入口大廳
    const initialMap = createEmptyMap();
    initialMap[MAP_CENTER][MAP_CENTER] = {
      ...initialMap[MAP_CENTER][MAP_CENTER],
      discovered: true,
      room: {
        id: 'entrance_hall',
        name: '入口大廳',
        nameEn: 'Entrance Hall',
        floor: 'ground',
        symbol: null,
        doors: ['north', 'south'],
        description: '房屋的入口',
        color: '#7B6354',
        icon: '',
        isOfficial: true,
        gallerySvg: '/gallery-assets/rooms/entrance_hall.svg',
      },
      rotation: 0,
    };
    
    setMap(initialMap);
    setLog([`選擇了 ${character.name}`, '從入口大廳開始', '回合 1']);
    setIsLoading(false);
    
    // 初始化牌堆
    import('@betrayal/shared').then(({ ROOMS }) => {
      const newGameState = createInitialGameState();
      newGameState.roomDecks.ground = ROOMS.filter(r => r.floor === 'ground' && r.id !== 'entrance_hall');
      newGameState.roomDecks.upper = ROOMS.filter(r => r.floor === 'upper');
      newGameState.roomDecks.basement = ROOMS.filter(r => r.floor === 'basement');
      setGameState(newGameState);
    });
    
    // 計算可達位置
    updateReachablePositions(initialMap, { x: MAP_CENTER, y: MAP_CENTER }, character.stats.speed[0]);
  };

  // 計算可達位置和有效探索方向
  const updateReachablePositions = (currentMap: Tile[][], pos: { x: number; y: number }, remainingMoves: number) => {
    if (remainingMoves <= 0 || discovered) {
      setReachablePositions([]);
      setValidExploreDirections([]);
      return;
    }

    const reachable: { x: number; y: number }[] = [];
    const currentTile = currentMap[pos.y][pos.x];
    const currentRoom = currentTile.room;

    if (!currentRoom) {
      setReachablePositions([]);
      setValidExploreDirections([]);
      return;
    }

    // 使用規則引擎的 getValidExploreDirections 獲取有效探索方向
    const validDirections = getValidExploreDirections(currentRoom);
    const validExploreDirs: Direction[] = [];

    const directionMap: Record<Direction, { x: number; y: number }> = {
      north: { x: 0, y: -1 },
      south: { x: 0, y: 1 },
      east: { x: 1, y: 0 },
      west: { x: -1, y: 0 },
    };

    // 檢查每個有效方向
    for (const direction of validDirections) {
      const delta = directionMap[direction];
      const newX = pos.x + delta.x;
      const newY = pos.y + delta.y;
      
      if (newX >= 0 && newX < MAP_SIZE && newY >= 0 && newY < MAP_SIZE) {
        const tile = currentMap[newY][newX];
        
        // 如果位置未探索，顯示為可探索
        if (!tile.discovered) {
          reachable.push({ x: newX, y: newY });
          validExploreDirs.push(direction);
        }
        // 如果位置已探索，也可以移動過去
        else {
          reachable.push({ x: newX, y: newY });
        }
      }
    }

    setReachablePositions(reachable);
    setValidExploreDirections(validExploreDirs);
  };

  // 從牌堆抽取房間（使用 RoomDiscoveryManager 的邏輯）
  const drawRoomFromDeck = (floor: Floor): Room | null => {
    const deck = gameState.roomDecks[floor];
    
    // 找到第一個未被抽取且未被放置的房間
    const availableRoom = deck.find((r: Room) => {
      const isDrawn = gameState.roomDecks.drawn.has(r.id);
      const isPlaced = gameState.placedRoomIds.has(r.id);
      return !isDrawn && !isPlaced;
    });
    
    if (!availableRoom) {
      return null;
    }

    return availableRoom;
  };

  // 移動到指定位置
  const moveToPosition = useCallback((x: number, y: number) => {
    if (discovered || moves <= 0 || !player) return;

    const tile = map[y][x];
    
    // 如果目標位置未探索，發現新房間
    if (!tile.discovered) {
      // 計算進入方向
      const deltaX = x - position.x;
      const deltaY = y - position.y;
      let entryDirection: Direction = 'north';
      
      if (deltaX === 1) entryDirection = 'east';
      else if (deltaX === -1) entryDirection = 'west';
      else if (deltaY === 1) entryDirection = 'south';
      else if (deltaY === -1) entryDirection = 'north';

      // 從牌堆抽取房間（確保唯一性）
      const room = drawRoomFromDeck(currentFloor);
      
      if (!room) {
        setLog(prev => [...prev, '沒有更多房間可以發現！']);
        return;
      }

      // 使用規則引擎的 rotateRoomForConnection 旋轉房間以匹配門連接
      const rotated = rotateRoomForConnection(room, entryDirection);
      const placedRoom = rotated.room;

      // 更新遊戲狀態
      const newMap = [...map];
      newMap[y][x] = {
        ...newMap[y][x],
        discovered: true,
        room: placedRoom,
        rotation: placedRoom.rotation,
      };
      
      // 更新已放置房間 ID 和已抽取集合
      setGameState(prev => {
        const newDrawn = new Set(prev.roomDecks.drawn);
        newDrawn.add(room.id);
        
        const newPlacedIds = new Set(prev.placedRoomIds);
        newPlacedIds.add(room.id);
        
        return {
          ...prev,
          placedRoomIds: newPlacedIds,
          roomDecks: {
            ...prev.roomDecks,
            drawn: newDrawn,
          },
        };
      });
      
      setMap(newMap);
      setPosition({ x, y });
      setDiscovered(true);
      setLog(prev => [...prev, `發現新房間: ${placedRoom.name}（旋轉 ${placedRoom.rotation}°）`, '回合結束']);
      setReachablePositions([]);
      
      // 延遲後開始新回合
      setTimeout(() => {
        setTurn(t => t + 1);
        setMoves(player.stats.speed[0]);
        setDiscovered(false);
        setLog(prev => [...prev, `回合 ${turn + 1}`]);
        updateReachablePositions(newMap, { x, y }, player.stats.speed[0]);
      }, 1500);
    } else {
      // 移動到已探索的房間
      setPosition({ x, y });
      setMoves(m => {
        const newMoves = m - 1;
        setLog(prev => [...prev, `移動到 (${x}, ${y})，剩餘移動: ${newMoves}`]);
        updateReachablePositions(map, { x, y }, newMoves);
        return newMoves;
      });
    }
  }, [map, player, moves, discovered, turn, currentFloor, position, gameState]);

  // 處理房間點擊
  const handleRoomClick = (room: Room, x: number, y: number) => {
    setSelectedRoom({ room, x, y });
    
    // 如果點擊的是可達位置，移動過去
    const isReachable = reachablePositions.some(pos => pos.x === x && pos.y === y);
    if (isReachable && !discovered) {
      moveToPosition(x, y);
    }
  };

  // 結束回合
  const endTurn = () => {
    if (!player) return;
    setTurn(t => t + 1);
    setMoves(player.stats.speed[0]);
    setDiscovered(false);
    setLog(prev => [...prev, '回合結束', `回合 ${turn + 1}`]);
    updateReachablePositions(map, position, player.stats.speed[0]);
  };

  // 方向移動
  const moveDirection = (dir: Direction) => {
    const deltas: Record<Direction, { x: number; y: number }> = {
      north: { x: 0, y: -1 },
      south: { x: 0, y: 1 },
      east: { x: 1, y: 0 },
      west: { x: -1, y: 0 },
    };
    
    const delta = deltas[dir];
    const newX = position.x + delta.x;
    const newY = position.y + delta.y;
    
    if (newX >= 0 && newX < MAP_SIZE && newY >= 0 && newY < MAP_SIZE) {
      moveToPosition(newX, newY);
    }
  };

  // 載入中顯示
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            className="w-12 h-12 border-b-2 border-white rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-gray-300">載入遊戲中...</p>
        </div>
      </main>
    );
  }

  // 角色選擇階段
  if (phase === 'select') {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <div className="text-center">
          <p className="text-gray-400 mb-4">正在導航到角色選擇...</p>
          <a href="/betrayal/solo/select">
            <Button>前往角色選擇</Button>
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {/* 頂部導航欄 */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">單人遊戲</h1>
            <span className="text-gray-400">|</span>
            <span className="text-blue-400 font-medium">回合 {turn}</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 玩家資訊 */}
            {player && (
              <div className="flex items-center gap-3">
                <PlayerToken character={player} size="sm" />
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{player.name}</p>
                  <p className="text-xs text-gray-400">剩餘移動: {moves}</p>
                </div>
              </div>
            )}
            
            <a href="/betrayal/solo/select">
              <Button variant="secondary" size="sm">重新選擇</Button>
            </a>
          </div>
        </div>
      </header>

      {/* 主要內容區 */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：遊戲板 */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">遊戲地圖</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">當前樓層:</span>
                  <span className="text-white font-medium">
                    {currentFloor === 'ground' ? '一樓' : currentFloor === 'upper' ? '二樓' : '地下室'}
                  </span>
                </div>
              </div>
              
              {/* GameBoard 組件 */}
              <div className="h-[500px] overflow-hidden">
                <GameBoard
                  map={map}
                  currentFloor={currentFloor}
                  playerPosition={position}
                  playerCharacter={player!}
                  onRoomClick={handleRoomClick}
                  onFloorChange={setCurrentFloor}
                  reachablePositions={reachablePositions}
                  showAllFloors={false}
                  validExploreDirections={validExploreDirections}
                  onExploreDirection={moveDirection}
                />
              </div>
            </div>

            {/* 移動控制 */}
            <div className="mt-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h3 className="text-sm font-bold text-gray-400 mb-3 text-center">移動控制</h3>
              <div className="flex justify-center">
                <div className="grid grid-cols-3 gap-2">
                  <div />
                  <DirectionButton 
                    direction="north" 
                    onClick={() => moveDirection('north')}
                    disabled={discovered || moves <= 0 || !validExploreDirections.includes('north')}
                  />
                  <div />
                  <DirectionButton 
                    direction="west" 
                    onClick={() => moveDirection('west')}
                    disabled={discovered || moves <= 0 || !validExploreDirections.includes('west')}
                  />
                  <Button 
                    onClick={endTurn} 
                    variant="secondary"
                    size="sm"
                    className="h-12"
                  >
                    結束回合
                  </Button>
                  <DirectionButton 
                    direction="east" 
                    onClick={() => moveDirection('east')}
                    disabled={discovered || moves <= 0 || !validExploreDirections.includes('east')}
                  />
                  <div />
                  <DirectionButton 
                    direction="south" 
                    onClick={() => moveDirection('south')}
                    disabled={discovered || moves <= 0 || !validExploreDirections.includes('south')}
                  />
                  <div />
                </div>
              </div>
              
              {discovered && (
                <motion.p 
                  className="text-yellow-500 text-center mt-3 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  已發現新房間，回合結束
                </motion.p>
              )}
            </div>
          </div>

          {/* 右側：玩家面板與日誌 */}
          <div className="space-y-4">
            {/* 玩家屬性面板 */}
            {player && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-bold mb-4">角色屬性</h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard 
                    label="速度" 
                    value={player.stats.speed[0]} 
                    color="#3B82F6"
                    icon="⚡"
                  />
                  <StatCard 
                    label="力量" 
                    value={player.stats.might[0]} 
                    color="#EF4444"
                    icon="💪"
                  />
                  <StatCard 
                    label="理智" 
                    value={player.stats.sanity[0]} 
                    color="#8B5CF6"
                    icon="🧠"
                  />
                  <StatCard 
                    label="知識" 
                    value={player.stats.knowledge[0]} 
                    color="#10B981"
                    icon="📚"
                  />
                </div>
              </div>
            )}

            {/* 遊戲日誌 */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-bold mb-3">遊戲日誌</h3>
              <div className="h-64 overflow-y-auto space-y-2 pr-2">
                <AnimatePresence initial={false}>
                  {log.slice(-20).map((entry, i) => (
                    <motion.p 
                      key={i}
                      className={`text-sm py-2 px-3 rounded-lg ${
                        entry.includes('發現') ? 'bg-yellow-500/20 text-yellow-400' : 
                        entry.includes('回合') ? 'bg-blue-500/20 text-blue-400' : 
                        'bg-gray-700/50 text-gray-300'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {entry}
                    </motion.p>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* 當前房間資訊 */}
            {selectedRoom && (
              <motion.div 
                className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-lg font-bold mb-2">房間資訊</h3>
                <div className="flex items-center gap-3">
                  {selectedRoom.room?.gallerySvg && (
                    <img 
                      src={`/betrayal${selectedRoom.room.gallerySvg}`}
                      alt={selectedRoom.room.name}
                      className="w-16 h-16 rounded-lg object-cover bg-gray-700"
                    />
                  )}
                  <div>
                    <p className="font-medium">{selectedRoom.room.name}</p>
                    <p className="text-sm text-gray-400">{selectedRoom.room.description}</p>
                    {(selectedRoom.room as Room & { rotation?: number }).rotation !== undefined && (
                      <p className="text-xs text-gray-500">旋轉: {(selectedRoom.room as Room & { rotation?: number }).rotation}°</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* 底部返回按鈕 */}
        <div className="text-center mt-8">
          <a href="/betrayal/">
            <Button variant="secondary">← 返回大廳</Button>
          </a>
        </div>
      </div>
    </main>
  );
}

/**
 * 方向按鈕組件
 */
interface DirectionButtonProps {
  direction: Direction;
  onClick: () => void;
  disabled?: boolean;
}

function DirectionButton({ direction, onClick, disabled }: DirectionButtonProps) {
  const labels: Record<Direction, string> = {
    north: '北',
    south: '南',
    east: '東',
    west: '西',
  };

  return (
    <Button 
      onClick={onClick}
      disabled={disabled}
      size="sm"
      className="h-12 w-12 flex items-center justify-center"
    >
      {labels[direction]}
    </Button>
  );
}

/**
 * 玩家標記組件（簡化版）
 */
interface PlayerTokenProps {
  character: Character;
  size?: 'sm' | 'md';
}

function PlayerToken({ character, size = 'md' }: PlayerTokenProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white shadow-lg`}
      style={{ backgroundColor: character.color }}
    >
      {character.portraitSvg ? (
        <img
          src={`/betrayal${character.portraitSvg}`}
          alt={character.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
          {character.name[0]}
        </div>
      )}
    </div>
  );
}

/**
 * 屬性卡片組件
 */
interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <div className="bg-gray-700/50 rounded-lg p-3 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="font-bold text-lg" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}
